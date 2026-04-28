import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { verifyHmacSignature } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { TOKEN_CONFIG } from '@/lib/token-config';

type StorageType = 'localstorage' | 'redis' | 'upstash' | 'kvrocks' | 'd1' | 'postgres';
const STORAGE_TYPE: StorageType = (process.env.NEXT_PUBLIC_STORAGE_TYPE as StorageType) || 'localstorage';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过不需要认证的路径
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  if (!process.env.PASSWORD) {
    // 如果未配置密码，重定向到警告页面
    const warningUrl = new URL('/warning', request.url);
    return warningUrl.pathname === pathname
      ? NextResponse.next()
      : NextResponse.redirect(warningUrl);
  }

  // 从cookie获取认证信息
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo) {
    return handleAuthFailure(request, pathname);
  }

  // 统一验证签名（localstorage 和数据库模式均使用 HMAC 签名，不再存储明文密码）
  if (
    !authInfo.username ||
    !authInfo.role ||
    !authInfo.signature ||
    !authInfo.timestamp
  ) {
    return handleAuthFailure(request, pathname);
  }

  // 验证签名
  const dataToSign = JSON.stringify({
    username: authInfo.username,
    role: authInfo.role,
    timestamp: authInfo.timestamp,
  });
  let isValidSignature = false;
  try {
    isValidSignature = await verifyHmacSignature(
      dataToSign,
      authInfo.signature,
      process.env.PASSWORD || '',
    );
  } catch (error) {
    logger.error('签名验证异常:', error);
  }

  if (!isValidSignature) {
    return handleAuthFailure(request, pathname);
  }

  // 数据库模式：额外验证双 Token 和过期时间
  if (STORAGE_TYPE !== 'localstorage') {
    if (!authInfo.tokenId || !authInfo.refreshToken || !authInfo.refreshExpires) {
      logger.info(
        `Old cookie format detected for ${authInfo.username}, forcing re-login`,
      );
      return handleAuthFailure(request, pathname);
    }

    const now = Date.now();

    if (now >= authInfo.refreshExpires) {
      logger.info(
        `Refresh token expired for ${authInfo.username}, redirecting to login`,
      );
      return handleAuthFailure(request, pathname);
    }

    const ACCESS_TOKEN_AGE = TOKEN_CONFIG.ACCESS_TOKEN_AGE;
    const age = now - authInfo.timestamp;

    if (age > ACCESS_TOKEN_AGE) {
      logger.info(`Access token expired for ${authInfo.username}`);
      if (pathname.startsWith('/api')) {
        return new NextResponse('Access token expired', { status: 401 });
      }
      logger.info(`Allowing page request to pass, frontend will refresh token`);
    }
  }

  return NextResponse.next();
}

// 处理认证失败的情况
function handleAuthFailure(
  request: NextRequest,
  pathname: string,
): NextResponse {
  // 如果是 API 路由，返回 401 状态码
  if (pathname.startsWith('/api')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 否则重定向到登录页面
  const loginUrl = new URL('/login', request.url);
  // 保留完整的URL，包括查询参数
  const fullUrl = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', fullUrl);
  return NextResponse.redirect(loginUrl);
}

// 判断是否需要跳过认证的路径
function shouldSkipAuth(pathname: string): boolean {
  const skipPaths = [
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/icons/',
    '/logo.png',
    '/screenshot.png',
  ];

  return skipPaths.some((path) => pathname.startsWith(path));
}

// 配置middleware匹配规则
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|oidc-register|warning|api/login|api/register|api/logout|api/auth/oidc|api/auth/refresh|api/cron/|api/server-config|api/proxy-m3u8|api/cms-proxy|api/tvbox/subscribe|api/theme/css|api/openlist/cms-proxy|api/openlist/play|api/emby/cms-proxy|api/emby/play|api/emby/sources|tvbox/).*)',
  ],
};
