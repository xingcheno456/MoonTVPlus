import { NextRequest } from 'next/server';

import { apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { revokeRefreshToken } from '@/lib/refresh-token';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);

  if (authInfo && authInfo.username && authInfo.tokenId) {
    try {
      await revokeRefreshToken(authInfo.username, authInfo.tokenId);
    } catch (error) {
      logger.error('Failed to revoke refresh token:', error);
    }
  }

  const response = apiSuccess(null);

  response.cookies.set('auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
