import { NextRequest } from 'next/server';

import { logger } from './logger';

export type AuthInfo = {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  role?: 'owner' | 'admin' | 'user';
  tokenId?: string;
  refreshToken?: string;
  refreshExpires?: number;
};

function getAuthTokenFromHeader(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1].trim();
  }

  const tokenMatch = trimmed.match(/^Token\s+(.+)$/i);
  if (tokenMatch) {
    return tokenMatch[1].trim();
  }

  return trimmed;
}

export function parseAuthInfo(value?: string | null): AuthInfo | null {
  if (!value) {
    return null;
  }

  let decoded = value;

  try {
    decoded = decodeURIComponent(decoded);
  } catch (error) {
    decoded = value;
  }

  if (decoded.includes('%')) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch (error) {
      decoded = value;
    }
  }

  try {
    return JSON.parse(decoded) as AuthInfo;
  } catch (error) {
    return null;
  }
}

// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(request: NextRequest): AuthInfo | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const headerValue = getAuthTokenFromHeader(authHeader);
    const headerAuthInfo = parseAuthInfo(headerValue);
    if (headerAuthInfo) {
      return headerAuthInfo;
    }
  }

  const authCookie = request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  return parseAuthInfo(authCookie.value);
}

// 从cookie获取认证信息 (客户端使用)
// auth Cookie 为 httpOnly，客户端无法读取；user_info Cookie 包含非敏感字段
export function getAuthInfoFromBrowserCookie(): AuthInfo | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cookies = parseDocumentCookies();

    const userInfoCookie = cookies['user_info'];
    if (userInfoCookie) {
      return parseAuthInfo(userInfoCookie);
    }

    return null;
  } catch (error) {
    return null;
  }
}

function parseDocumentCookies(): Record<string, string> {
  return document.cookie.split(';').reduce(
    (acc, cookie) => {
      const trimmed = cookie.trim();
      const firstEqualIndex = trimmed.indexOf('=');

      if (firstEqualIndex > 0) {
        const key = trimmed.substring(0, firstEqualIndex);
        const value = trimmed.substring(firstEqualIndex + 1);
        if (key && value) {
          acc[key] = value;
        }
      }

      return acc;
    },
    {} as Record<string, string>,
  );
}

// 清除浏览器中的认证cookie (客户端使用)
export function clearAuthCookie(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const expireStr = '; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    const domainCookie = `; domain=${window.location.hostname}${expireStr}`;

    document.cookie = `auth=${expireStr}`;
    document.cookie = `auth=${domainCookie}`;
    document.cookie = `user_info=${expireStr}`;
    document.cookie = `user_info=${domainCookie}`;
  } catch (error) {
    logger.error('[Auth] Failed to clear cookie:', error);
  }
}
