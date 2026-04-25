/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { lockManager } from '@/lib/lock';

export const runtime = 'nodejs';

const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

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
    console.error('Turnstile验证失败:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (STORAGE_TYPE === 'localstorage') {
      return apiError('localStorage模式不支持注册功能', 400);
    }

    const config = await getConfig();
    const siteConfig = config.SiteConfig;

    if (!siteConfig.EnableRegistration) {
      return apiError('注册功能未开启', 403);
    }

    const { username, password, inviteCode, turnstileToken } = await req.json();

    if (!username || typeof username !== 'string') {
      return apiError('用户名不能为空', 400);
    }
    if (!password || typeof password !== 'string') {
      return apiError('密码不能为空', 400);
    }
    if (inviteCode !== undefined && typeof inviteCode !== 'string') {
      return apiError('邀请码格式错误', 400);
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return apiError('用户名只能包含字母、数字、下划线，长度3-20位', 400);
    }

    if (password.length < 6) {
      return apiError('密码长度至少为6位', 400);
    }

    if (username === process.env.USERNAME) {
      return apiError('该用户名不可用', 409);
    }

    if (siteConfig.RequireRegistrationInviteCode) {
      const expectedInviteCode = (
        siteConfig.RegistrationInviteCode || ''
      ).trim();
      if (!expectedInviteCode) {
        return apiError('服务器未配置邀请码', 500);
      }

      if (!inviteCode || inviteCode.trim() !== expectedInviteCode) {
        return apiError('邀请码错误', 400);
      }
    }

    let releaseLock: (() => void) | null = null;
    try {
      releaseLock = await lockManager.acquire(`register:${username}`);
    } catch (error) {
      return apiError('服务器繁忙，请稍后重试', 503);
    }

    try {
      const userExists = await db.checkUserExistV2(username);
      if (userExists) {
        return apiError('用户名已存在', 409);
      }

      if (siteConfig.RegistrationRequireTurnstile) {
        if (!turnstileToken) {
          return apiError('请完成人机验证', 400);
        }

        if (!siteConfig.TurnstileSecretKey) {
          console.error('Turnstile Secret Key未配置');
          return apiError('服务器配置错误', 500);
        }

        const isValid = await verifyTurnstileToken(
          turnstileToken,
          siteConfig.TurnstileSecretKey,
        );
        if (!isValid) {
          return apiError('人机验证失败，请重试', 400);
        }
      }

      try {
        const defaultTags =
          siteConfig.DefaultUserTags && siteConfig.DefaultUserTags.length > 0
            ? siteConfig.DefaultUserTags
            : undefined;

        await db.createUserV2(username, password, 'user', defaultTags);

        return apiSuccess({ message: '注册成功' });
      } catch (err: any) {
        console.error('创建用户失败', err);
        if (err.message === '用户已存在') {
          return apiError('用户名已存在', 409);
        }
        return apiError('注册失败，请稍后重试', 500);
      }
    } finally {
      if (releaseLock) {
        releaseLock();
      }
    }
  } catch (error) {
    console.error('注册接口异常', error);
    return apiError('服务器错误', 500);
  }
}
