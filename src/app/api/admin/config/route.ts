
import { NextRequest } from 'next/server';

import { AdminConfigResult } from '@/lib/admin.types';
import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiSuccess({
        error: '不支持本地存储进行管理员配置',
      }, { status: 400 });
  }

  const adminAuth = validateAdminAuth(request);
  if ('status' in adminAuth) return adminAuth;
  const username = adminAuth.username;

  try {
    const config = await getConfig();
    const result: AdminConfigResult = {
      Role: adminAuth.auth.role as 'owner' | 'admin',
      Config: config,
    };

    return apiSuccess(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('获取管理员配置失败:', error);
    return apiError('获取管理员配置失败: ' + (error as Error).message, 500);
  }
}

export async function POST(request: NextRequest) {
  if (STORAGE_TYPE === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  const adminAuth = validateAdminAuth(request);
  if ('status' in adminAuth) return adminAuth;

  try {
    const newConfig = await request.json();
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
    logger.error('保存配置失败:', error);
    return apiError('保存配置失败: ' + (error as Error).message, 500);
  }
}
