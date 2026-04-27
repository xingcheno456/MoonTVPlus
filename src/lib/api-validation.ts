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
  request: NextRequest,
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

export interface ValidatedRequest<T> {
  body: T;
  searchParams: URLSearchParams;
  request: NextRequest;
}

type RouteHandler<T, R> = (
  req: NextRequest,
  validated: ValidatedRequest<T>,
  context?: unknown,
) => Promise<NextResponse<R>>;

export function withValidation<T, R = unknown>(
  schema: ZodSchema<T>,
  handler: RouteHandler<T, R>,
): (req: NextRequest, context?: unknown) => Promise<NextResponse> {
  return async (req: NextRequest, context?: unknown) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const errors = result.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return apiError(`Validation failed: ${errors.join('; ')}`, 400);
    }

    return handler(req, {
      body: result.data,
      searchParams: req.nextUrl.searchParams,
      request: req,
    }, context);
  };
}

export function withQueryValidation<T, R = unknown>(
  schema: ZodSchema<T>,
  handler: (
    req: NextRequest,
    query: T,
    context?: unknown,
  ) => Promise<NextResponse<R>>,
): (req: NextRequest, context?: unknown) => Promise<NextResponse> {
  return async (req: NextRequest, context?: unknown) => {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = schema.safeParse(params);
    if (!result.success) {
      const errors = result.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return apiError(`Query validation failed: ${errors.join('; ')}`, 400);
    }

    return handler(req, result.data, context);
  };
}

type SimpleHandler<R = unknown> = (
  req: NextRequest,
  context?: unknown,
) => Promise<NextResponse<R>>;

export function withErrorHandler<R = unknown>(
  handler: SimpleHandler<R>,
): SimpleHandler {
  return async (req: NextRequest, context?: unknown) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`,
        );
        return apiError(`Validation failed: ${errors.join('; ')}`, 400);
      }

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('不存在')) {
          return apiError(error.message, 404);
        }
        if (error.message.includes('Unauthorized') || error.message.includes('无权限')) {
          return apiError(error.message, 401);
        }
        return apiError(error.message, 500);
      }

      return apiError('Internal server error', 500);
    }
  };
}
