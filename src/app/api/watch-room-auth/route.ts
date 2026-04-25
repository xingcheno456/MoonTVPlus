/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/watch-room-auth
 *
 * 需要登录才能访问的接口，返回观影室外部服务器的认证信息
 * 这样可以避免将敏感的 externalServerAuth 暴露给未登录用户
 */
export async function GET(request: NextRequest) {
  console.log('watch-room-auth called: ', request.url);

  // 从 cookie 获取用户信息
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  // 返回外部服务器认证信息
  const externalServerAuth = process.env.WATCH_ROOM_EXTERNAL_SERVER_AUTH;

  return apiSuccess({
    externalServerAuth: externalServerAuth || null,
  });
}
