
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import {
  getUserDevices,
  revokeAllRefreshTokens,
  revokeRefreshToken,
} from '@/lib/refresh-token';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

// 获取所有设备
export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const devices = await getUserDevices(authInfo.username);

    // 标记当前设备
    const devicesWithCurrent = devices.map((device) => ({
      ...device,
      isCurrent: device.tokenId === authInfo.tokenId,
    }));

    return apiSuccess({ devices: devicesWithCurrent });
  } catch (error) {
    logger.error('Failed to get devices:', error);
    return apiError('Server error', 500);
  }
}

// 撤销指定设备
export async function DELETE(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const { tokenId } = await request.json();

    if (!tokenId) {
      return apiError('Token ID required', 400);
    }

    await revokeRefreshToken(authInfo.username, tokenId);

    return apiSuccess({ ok: true });
  } catch (error) {
    logger.error('Failed to revoke device:', error);
    return apiError('Server error', 500);
  }
}

// 登出所有设备
export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    await revokeAllRefreshTokens(authInfo.username);

    const response = apiSuccess({ ok: true });

    // 清除当前设备的 Cookie
    response.cookies.set('auth', '', {
      path: '/',
      expires: new Date(0),
      sameSite: 'lax',
      httpOnly: false,
      secure: false,
    });

    return response;
  } catch (error) {
    logger.error('Failed to revoke all devices:', error);
    return apiError('Server error', 500);
  }
}
