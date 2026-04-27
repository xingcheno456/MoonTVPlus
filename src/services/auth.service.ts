import { NextRequest } from 'next/server';

import { apiError } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

import { logger } from '../lib/logger';

export class AuthenticationError extends Error {
  public status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = status;
  }
}

export async function validateAuthenticatedUser(
  request: NextRequest,
): Promise<string> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    throw new AuthenticationError('Unauthorized', 401);
  }

  if (authInfo.username !== process.env.USERNAME) {
    const userInfoV2 = await db.getUserInfoV2(authInfo.username);
    if (!userInfoV2) {
      throw new AuthenticationError('用户不存在', 401);
    }
    if (userInfoV2.banned) {
      throw new AuthenticationError('用户已被封禁', 401);
    }
  }

  return authInfo.username;
}

export function handleServiceError(error: unknown) {
  if (error instanceof AuthenticationError) {
    return apiError(error.message, error.status);
  }
  logger.error('Service error:', error);
  return apiError('Internal Server Error', 500);
}
