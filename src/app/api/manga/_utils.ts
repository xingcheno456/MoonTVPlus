import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export async function getAuthorizedUsername(
  request: NextRequest,
): Promise<string | NextResponse> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  if (authInfo.username !== process.env.USERNAME) {
    const userInfoV2 = await db.getUserInfoV2(authInfo.username);
    if (!userInfoV2) {
      return apiError('用户不存在', 401);
    }
    if (userInfoV2.banned) {
      return apiError('用户已被封禁', 401);
    }
  }

  return authInfo.username;
}
