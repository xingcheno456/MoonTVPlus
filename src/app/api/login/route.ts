/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { parseAuthInfo } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { generateHmacSignature } from '@/lib/crypto';
import { db, STORAGE_TYPE } from '@/lib/db';
import {
  generateRefreshToken,
  generateTokenId,
  storeRefreshToken,
  TOKEN_CONFIG,
} from '@/lib/refresh-token';
import { loginBodySchema } from '@/lib/api-schemas';
import { parseJsonBody } from '@/lib/api-validation';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

function buildLoginResponse(authToken?: string | null) {
  const data: Record<string, unknown> = {};

  if (authToken) {
    data.token = authToken;
    const authInfo = parseAuthInfo(authToken);
    if (authInfo) {
      const { password, ...rest } = authInfo;
      data.auth = rest;
    }
  }

  return apiSuccess(data);
}

// 生成认证Cookie（带签名和 Refresh Token）
async function generateAuthCookie(
  username?: string,
  /** @deprecated Password is never stored in cookies. Retained for backward compatibility only. */
  password?: string,
  role?: 'owner' | 'admin' | 'user',
  /** @deprecated IncludePassword is no longer used. HMAC signature is used instead. Will be removed in next major version. */
  includePassword?: boolean,
  deviceInfo?: string,
): Promise<string> {
  const now = Date.now();
  const authData: any = { role: role || 'user' };

  // note: includePassword parameter is retained for backward compatibility
  // but password is NEVER stored in the cookie — only validated server-side

  if (username && process.env.PASSWORD) {
    authData.username = username;
    authData.timestamp = now; // Access Token 时间戳

    // 生成 Refresh Token（仅数据库模式）
    if (STORAGE_TYPE !== 'localstorage') {
      const tokenId = generateTokenId();
      const refreshToken = generateRefreshToken();
      const refreshExpires = now + TOKEN_CONFIG.REFRESH_TOKEN_AGE;

      authData.tokenId = tokenId;
      authData.refreshToken = refreshToken;
      authData.refreshExpires = refreshExpires;

      // 存储到 Redis Hash
      try {
        await storeRefreshToken(username, tokenId, {
          token: refreshToken,
          deviceInfo: deviceInfo || 'Unknown Device',
          createdAt: now,
          expiresAt: refreshExpires,
          lastUsed: now,
        });
      } catch (error) {
        logger.error('Failed to store refresh token:', error);
      }
    }

    // 签名所有关键字段（username, role, timestamp）防止篡改
    const dataToSign = JSON.stringify({
      username: authData.username,
      role: authData.role,
      timestamp: authData.timestamp,
    });
    const signature = await generateHmacSignature(dataToSign, process.env.PASSWORD);
    authData.signature = signature;
  }

  return JSON.stringify(authData);
}

// 验证Cloudflare Turnstile Token
async function verifyTurnstileToken(
  token: string,
  secretKey: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      },
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    logger.error('Turnstile验证失败:', error);
    return false;
  }
}

// 获取设备信息
function getDeviceInfo(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // 检查是否为 MoonTVPlus APP
  if (userAgent.toLowerCase().includes('moontvplus')) {
    return 'MoonTVPlus APP';
  }

  // 检查是否为 OrionTV
  if (userAgent.toLowerCase().includes('oriontv')) {
    return 'OrionTV';
  }

  // 简单解析 User-Agent
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return `${browser} on ${os}`;
}

export async function POST(req: NextRequest) {
  try {
    // 获取站点配置
    const adminConfig = await getConfig();
    const siteConfig = adminConfig.SiteConfig;

    // 本地 / localStorage 模式——仅校验固定密码
    if (STORAGE_TYPE === 'localstorage') {
      const envPassword = process.env.PASSWORD;

      // 未配置 PASSWORD 时直接放行
      if (!envPassword) {
        const response = buildLoginResponse();

        // 清除可能存在的认证cookie
        response.cookies.set('auth', '', {
          path: '/',
          expires: new Date(0),
          sameSite: 'lax',
          httpOnly: true,
        });

        return response;
      }

      const bodyResult = await parseJsonBody(req, loginBodySchema);
      if ('error' in bodyResult) return bodyResult.error;
      const { password } = bodyResult.data;

      if (password !== envPassword) {
        return apiError('密码错误', 401);
      }

      // 验证成功，设置认证cookie
      const username = process.env.USERNAME || 'default';
      const deviceInfo = getDeviceInfo(req);
      const cookieValue = await generateAuthCookie(
        username,
        password,
        'owner',
        true,
        deviceInfo,
      );
      const response = buildLoginResponse(cookieValue);
      const expires = new Date();
      expires.setDate(expires.getDate() + 60); // 60天过期（Refresh Token 有效期）

      response.cookies.set('auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;
    }

    // 数据库 / redis 模式——校验用户名并尝试连接数据库
    const bodyResult = await parseJsonBody(req, loginBodySchema);
    if ('error' in bodyResult) return bodyResult.error;
    const { username, password, turnstileToken } = bodyResult.data;

    if (!username) {
      return apiError('用户名不能为空', 400);
    }

    // 如果开启了Turnstile验证
    if (siteConfig.LoginRequireTurnstile) {
      if (!turnstileToken) {
        return apiError('请完成人机验证', 400);
      }

      if (!siteConfig.TurnstileSecretKey) {
        logger.error('Turnstile Secret Key未配置');
        return apiError('服务器配置错误', 500);
      }

      // 验证Turnstile Token
      const isValid = await verifyTurnstileToken(
        turnstileToken,
        siteConfig.TurnstileSecretKey,
      );
      if (!isValid) {
        return apiError('人机验证失败，请重试', 400);
      }
    }

    // 可能是站长，直接读环境变量
    if (
      username === process.env.USERNAME &&
      password === process.env.PASSWORD
    ) {
      // 验证成功，设置认证cookie
      const deviceInfo = getDeviceInfo(req);
      const cookieValue = await generateAuthCookie(
        username,
        password,
        'owner',
        false,
        deviceInfo,
      );
      const response = buildLoginResponse(cookieValue);
      const expires = new Date();
      expires.setDate(expires.getDate() + 60); // 60天过期（Refresh Token 有效期）

      response.cookies.set('auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;
    } else if (username === process.env.USERNAME) {
      return apiError('用户名或密码错误', 401);
    }

    // 使用新版本的用户验证
    let pass = false;
    let userRole: 'owner' | 'admin' | 'user' = 'user';
    let isBanned = false;

    // 验证用户
    const userInfoV2 = await db.getUserInfoV2(username);

    if (userInfoV2) {
      // 使用新版本验证
      pass = await db.verifyUserV2(username, password);
      userRole = userInfoV2.role;
      isBanned = userInfoV2.banned;
    }

    // 检查用户是否被封禁
    if (isBanned) {
      return apiError('用户被封禁', 401);
    }

    if (!pass) {
      return apiError('用户名或密码错误', 401);
    }

    // 验证成功，设置认证cookie
    const deviceInfo = getDeviceInfo(req);
    const cookieValue = await generateAuthCookie(
      username,
      password,
      userRole,
      false,
      deviceInfo,
    );
    const response = buildLoginResponse(cookieValue);
    const expires = new Date();
    expires.setDate(expires.getDate() + 60); // 60天过期（Refresh Token 有效期）

    response.cookies.set('auth', cookieValue, {
      path: '/',
      expires,
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
    });

    logger.info(`Cookie已设置`);

    return response;
  } catch (error) {
    logger.error('登录接口异常', error);
    return apiError('服务器错误', 500);
  }
}
