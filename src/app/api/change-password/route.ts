
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db, STORAGE_TYPE } from '@/lib/db';
import { getUserDevices, revokeRefreshToken } from '@/lib/refresh-token';
import { parseJsonBody } from '@/lib/api-validation';
import { changePasswordBodySchema } from '@/lib/api-schemas';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;

  if (storageType === 'localstorage') {
    return apiError('不支持本地存储模式修改密码', 400);
  }

  try {
    const bodyResult = await parseJsonBody(request, changePasswordBodySchema);
    if ('error' in bodyResult) return bodyResult.error;
    const { oldPassword, newPassword } = bodyResult.data;

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    const username = authInfo.username;

    if (username === process.env.USERNAME) {
      return apiError('站长不能通过此接口修改密码', 403);
    }

    const userInfo = await db.getUserInfoV2(username);
    if (!userInfo) {
      return apiError('用户不存在', 401);
    }
    if (userInfo.banned) {
      return apiError('用户已被封禁', 401);
    }

    const isOldPasswordValid = await db.verifyUserV2(username, oldPassword);
    if (!isOldPasswordValid) {
      return apiError('旧密码不正确', 400);
    }

    await db.changePasswordV2(username, newPassword);

    try {
      const currentTokenId = authInfo.tokenId;
      const devices = await getUserDevices(username);

      for (const device of devices) {
        if (device.tokenId !== currentTokenId) {
          await revokeRefreshToken(username, device.tokenId);
          logger.info(
            `Revoked token ${device.tokenId} for ${username} after password change`,
          );
        }
      }

      logger.info(
        `Password changed for ${username}, revoked ${devices.length - 1} other devices`,
      );
    } catch (error) {
      logger.error(
        'Failed to revoke other devices after password change:',
        error,
      );
    }

    return apiSuccess(null);
  } catch (error) {
    logger.error('修改密码失败:', error);
    return apiError('修改密码失败', 500);
  }
}
