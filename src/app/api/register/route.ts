/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';
import { lockManager } from '@/lib/lock';
import { parseJsonBody } from '@/lib/api-validation';
import { z } from 'zod';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

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

const registerBodySchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/, '用户名只能包含字母、数字、下划线，长度3-20位'),
  password: z.string().min(6, '密码长度至少为6位').max(100),
  inviteCode: z.string().optional(),
  turnstileToken: z.string().optional(),
});

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

    const bodyResult = await parseJsonBody(req, registerBodySchema);
    if ('error' in bodyResult) return bodyResult.error;
    const { username, password, inviteCode, turnstileToken } = bodyResult.data;

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
          logger.error('Turnstile Secret Key未配置');
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
        logger.error('创建用户失败', err);
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
    logger.error('注册接口异常', error);
    return apiError('服务器错误', 500);
  }
}
