/* eslint-disable no-console*/

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserDevices, revokeRefreshToken } from '@/lib/refresh-token';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (storageType === 'localstorage') {
    return apiError('不支持本地存储模式修改密码', 400);
  }

  try {
    const body = await request.json();
    const { newPassword } = body;

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return apiError('新密码不得为空', 400);
    }

    const username = authInfo.username;

    if (username === process.env.USERNAME) {
      return apiError('站长不能通过此接口修改密码', 403);
    }

    await db.changePasswordV2(username, newPassword);

    try {
      const currentTokenId = authInfo.tokenId;
      const devices = await getUserDevices(username);

      for (const device of devices) {
        if (device.tokenId !== currentTokenId) {
          await revokeRefreshToken(username, device.tokenId);
          console.log(
            `Revoked token ${device.tokenId} for ${username} after password change`,
          );
        }
      }

      console.log(
        `Password changed for ${username}, revoked ${devices.length - 1} other devices`,
      );
    } catch (error) {
      console.error(
        'Failed to revoke other devices after password change:',
        error,
      );
    }

    return apiSuccess(null);
  } catch (error) {
    console.error('修改密码失败:', error);
    return apiError('修改密码失败', 500);
  }
}
