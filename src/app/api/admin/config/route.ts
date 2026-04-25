/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { AdminConfigResult } from '@/lib/admin.types';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return apiSuccess({
        error: '不支持本地存储进行管理员配置',
      }, { status: 400 });
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }
  const username = authInfo.username;

  try {
    const config = await getConfig();
    const result: AdminConfigResult = {
      Role: 'owner',
      Config: config,
    };
    if (username === process.env.USERNAME) {
      result.Role = 'owner';
    } else {
      // 从新版数据库获取用户信息
      const { db } = await import('@/lib/db');
      const userInfoV2 = await db.getUserInfoV2(username);

      if (userInfoV2 && userInfoV2.role === 'admin' && !userInfoV2.banned) {
        result.Role = 'admin';
      } else {
        return apiError('你是管理员吗你就访问？', 401);
      }
    }

    return apiSuccess(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('获取管理员配置失败:', error);
    return apiError('获取管理员配置失败: ' + (error as Error).message, 500);
  }
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }
  const username = authInfo.username;

  try {
    const newConfig = await request.json();

    // 权限检查
    if (username !== process.env.USERNAME) {
      const { db } = await import('@/lib/db');
      const userInfoV2 = await db.getUserInfoV2(username);

      if (
        !userInfoV2 ||
        (userInfoV2.role !== 'admin' && userInfoV2.role !== 'owner') ||
        userInfoV2.banned
      ) {
        return apiError('权限不足', 401);
      }
    }

    // 保存配置
    const { db } = await import('@/lib/db');
    const { configSelfCheck, setCachedConfig } = await import('@/lib/config');

    // 自检配置
    const checkedConfig = configSelfCheck(newConfig);

    // 保存到数据库
    await db.saveAdminConfig(checkedConfig);

    // 更新缓存
    await setCachedConfig(checkedConfig);

    return apiSuccess({ message: '配置已保存' });
  } catch (error) {
    console.error('保存配置失败:', error);
    return apiError('保存配置失败: ' + (error as Error).message, 500);
  }
}
