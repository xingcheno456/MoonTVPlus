import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { verifyHmacSignature } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { CSP_HEADER_VALUE } from '@/lib/security/csp';
import { TOKEN_CONFIG } from '@/lib/token-config';

type StorageType = 'localstorage' | 'redis' | 'upstash' | 'kvrocks' | 'd1' | 'postgres';
const STORAGE_TYPE: StorageType = (process.env.NEXT_PUBLIC_STORAGE_TYPE as StorageType) || 'localstorage';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response: NextResponse;

  if (shouldSkipAuth(pathname)) {
    response = NextResponse.next();
  } else if (!process.env.PASSWORD) {
    const warningUrl = new URL('/warning', request.url);
    response = warningUrl.pathname === pathname
      ? NextResponse.next()
      : NextResponse.redirect(warningUrl);
  } else {
    const authInfo = getAuthInfoFromCookie(request);

    if (!authInfo) {
      response = handleAuthFailure(request, pathname);
    } else if (
      !authInfo.username ||
      !authInfo.role ||
      !authInfo.signature ||
      !authInfo.timestamp
    ) {
      response = handleAuthFailure(request, pathname);
    } else {
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
        response = handleAuthFailure(request, pathname);
      } else if (STORAGE_TYPE !== 'localstorage') {
        if (!authInfo.tokenId || !authInfo.refreshToken || !authInfo.refreshExpires) {
          logger.info(
            `Old cookie format detected for ${authInfo.username}, forcing re-login`,
          );
          response = handleAuthFailure(request, pathname);
        } else {
          const now = Date.now();
          if (now >= authInfo.refreshExpires) {
            logger.info(
              `Refresh token expired for ${authInfo.username}, redirecting to login`,
            );
            response = handleAuthFailure(request, pathname);
          } else {
            const ACCESS_TOKEN_AGE = TOKEN_CONFIG.ACCESS_TOKEN_AGE;
            const age = now - authInfo.timestamp;
            if (age > ACCESS_TOKEN_AGE) {
              logger.info(`Access token expired for ${authInfo.username}`);
              if (pathname.startsWith('/api')) {
                response = new NextResponse('Access token expired', { status: 401 });
              } else {
                logger.info(`Allowing page request to pass, frontend will refresh token`);
                response = NextResponse.next();
              }
            } else {
              response = NextResponse.next();
            }
          }
        }
      } else {
        response = NextResponse.next();
      }
    }
  }

  response.headers.set('Content-Security-Policy', CSP_HEADER_VALUE);
  return response;
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
