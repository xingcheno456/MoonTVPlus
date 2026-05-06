import { NextRequest, NextResponse } from 'next/server';

import { apiError } from './api-response';
import { AuthInfo, getAuthInfoFromCookie } from './auth';
import { ZodError, ZodSchema } from 'zod';

export type AuthenticatedRequest = {
  auth: AuthInfo;
  username: string;
};

export function validateAuth(
  request: NextRequest,
): AuthenticatedRequest | NextResponse {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }
  return { auth: authInfo, username: authInfo.username };
}

export function validateAdminAuth(
  request: NextRequest,
): AuthenticatedRequest | NextResponse {
  const result = validateAuth(request);
  if ('status' in result) return result;

  if (result.auth.role !== 'owner' && result.auth.role !== 'admin') {
    return apiError('权限不足', 403);
  }
  return result;
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
