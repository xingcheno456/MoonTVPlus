import { NextRequest, NextResponse } from 'next/server';

import { apiError } from './api-response';
import { AuthInfo, getAuthInfoFromCookie } from './auth';
import { verifyHmacSignature } from './crypto';
import { db } from './db';
import { logger } from './logger';
import { TOKEN_CONFIG } from './token-config';
import { ZodError, ZodSchema } from 'zod';

export type AuthenticatedRequest = {
  auth: AuthInfo;
  username: string;
};

export class AuthenticationError extends Error {
  public status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = status;
  }
}

export async function validateAuth(
  request: NextRequest,
): Promise<AuthenticatedRequest | NextResponse> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username || !authInfo.role || !authInfo.signature || !authInfo.timestamp) {
    return apiError('Unauthorized', 401);
  }

  const dataToSign = JSON.stringify({
    username: authInfo.username,
    role: authInfo.role,
    timestamp: authInfo.timestamp,
  });

  const isValid = await verifyHmacSignature(dataToSign, authInfo.signature, process.env.PASSWORD || '');
  if (!isValid) {
    return apiError('Unauthorized', 401);
  }

  const age = Date.now() - authInfo.timestamp;
  if (age > TOKEN_CONFIG.ACCESS_TOKEN_AGE) {
    return apiError('Access token expired', 401);
  }

  return { auth: authInfo, username: authInfo.username };
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

export async function validateAdminAuth(
  request: NextRequest,
): Promise<AuthenticatedRequest | NextResponse> {
  const result = await validateAuth(request);
  if ('status' in result) return result;

  if (result.auth.role !== 'owner' && result.auth.role !== 'admin') {
    return apiError('权限不足', 403);
  }

  if (result.auth.role !== 'owner' && result.auth.username !== process.env.USERNAME) {
    const userInfo = await db.getUserInfoV2(result.auth.username);
    if (!userInfo || userInfo.banned) {
      return apiError('用户已被封禁', 403);
    }
  }

  return result;
}

export function handleServiceError(error: unknown) {
  if (error instanceof AuthenticationError) {
    return apiError(error.message, error.status);
  }
  logger.error('Service error:', error);
  return apiError('Internal Server Error', 500);
}

export function parseSearchParams<T>(
  request: Request,
  schema: ZodSchema<T>,
): { data: T } | { error: NextResponse } {
  const { searchParams } = new URL(request.url);
  const raw: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = raw[key];
    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        raw[key] = [existing, value];
      }
    } else {
      raw[key] = value;
    }
  }

  try {
    const data = schema.parse(raw);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return { error: apiError(`参数验证失败: ${messages.join('; ')}`, 400) };
    }
    return { error: apiError('参数解析失败', 400) };
  }
}

export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const json = await request.json();
    const data = schema.parse(json);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return {
        error: apiError(`请求体验证失败: ${messages.join('; ')}`, 400),
      };
    }
    return { error: apiError('请求体解析失败', 400) };
  }
}
