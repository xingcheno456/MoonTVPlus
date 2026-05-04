import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie, parseAuthInfo, setAuthCookies } from '@/lib/auth';
import { verifyHmacSignature } from '@/lib/crypto';
import { STORAGE_TYPE } from '@/lib/db';
import { refreshAccessToken } from '@/lib/middleware-auth';

export const runtime = 'nodejs';

function buildRefreshResponse(authToken?: string | null) {
  const body: Record<string, unknown> = { ok: true };

  if (authToken) {
    body.token = authToken;
    const authInfo = parseAuthInfo(authToken);
    if (authInfo) {
      const { password, ...rest } = authInfo;
      body.auth = rest;
    }
  }

  return apiSuccess(body);
}

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo) {
    return apiError('Unauthorized', 401);
  }

  if (STORAGE_TYPE === 'localstorage') {
    // localstorage mode: verify HMAC signature instead of comparing stored password
    if (
      !authInfo.username ||
      !authInfo.role ||
      !authInfo.timestamp ||
      !authInfo.signature
    ) {
      return apiError('Unauthorized', 401);
    }

    const dataToSign = JSON.stringify({
      username: authInfo.username,
      role: authInfo.role,
      timestamp: authInfo.timestamp,
    });
    const isValid = await verifyHmacSignature(
      dataToSign,
      authInfo.signature,
      process.env.PASSWORD || '',
    );

    if (!isValid) {
      return apiError('Unauthorized', 401);
    }

    const authCookie = request.cookies.get('auth');
    if (!authCookie?.value) {
      return apiError('Unauthorized', 401);
    }

    const response = buildRefreshResponse(authCookie.value);
    const expires = new Date();
    expires.setDate(expires.getDate() + 60);
    setAuthCookies(response, authCookie.value, expires);
    return response;
  }

  if (
    !authInfo.username ||
    !authInfo.role ||
    !authInfo.timestamp ||
    !authInfo.tokenId ||
    !authInfo.refreshToken ||
    !authInfo.refreshExpires
  ) {
    return apiError('Unauthorized', 401);
  }

  const now = Date.now();

  // 只检查 Refresh Token 是否过期
  if (now >= authInfo.refreshExpires) {
    return apiError('Refresh token expired', 401);
  }

  // 只要 Refresh Token 有效，就允许刷新（即使 Access Token 已过期）

  const newAuthData = await refreshAccessToken(
    authInfo.username,
    authInfo.role,
    authInfo.tokenId,
    authInfo.refreshToken,
    authInfo.refreshExpires,
  );

  if (!newAuthData) {
    return apiError('Unauthorized', 401);
  }

  const response = buildRefreshResponse(newAuthData);
  const expires = new Date(authInfo.refreshExpires);
  setAuthCookies(response, newAuthData, expires);
  return response;
}
