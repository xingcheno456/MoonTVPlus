/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig, setCachedConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return apiSuccess({
        error: '不支持本地存储进行管理员配置',
      }, { status: 400 });
  }

  try {
    const body = await request.json();

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }
    const username = authInfo.username;

    const { Enabled, BaseUrl, Token, ProxyEnabled } = body as {
      Enabled?: boolean;
      BaseUrl?: string;
      Token?: string;
      ProxyEnabled?: boolean;
    };

    // 参数校验
    if (
      (Enabled !== undefined && typeof Enabled !== 'boolean') ||
      (BaseUrl !== undefined && typeof BaseUrl !== 'string') ||
      (Token !== undefined && typeof Token !== 'string') ||
      (ProxyEnabled !== undefined && typeof ProxyEnabled !== 'boolean')
    ) {
      return apiError('参数格式错误', 400);
    }

    const adminConfig = await getConfig();

    // 权限校验 - 使用v2用户系统
    if (username !== process.env.USERNAME) {
      const userInfo = await db.getUserInfoV2(username);
      if (!userInfo || userInfo.role !== 'admin' || userInfo.banned) {
        return apiError('权限不足', 401);
      }
    }

    // 更新缓存中的音乐配置
    adminConfig.MusicConfig = {
      Enabled,
      BaseUrl,
      Token,
      ProxyEnabled: ProxyEnabled ?? true,
    };

    // 写入数据库
    await db.saveAdminConfig(adminConfig);
    await setCachedConfig(adminConfig);

    return apiSuccess({ ok: true }, {
        headers: {
          'Cache-Control': 'no-store', // 不缓存结果
        },
      });
  } catch (error) {
    console.error('更新音乐配置失败:', error);
    return apiSuccess({
        error: '更新音乐配置失败',
        details: (error as Error).message,
      }, { status: 500 });
  }
}
