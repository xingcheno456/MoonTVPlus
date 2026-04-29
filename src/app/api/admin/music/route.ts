 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig, setCachedConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const body = await request.json();

    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;
    const username = adminAuth.username;

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
    logger.error('更新音乐配置失败:', error);
    return apiError('更新音乐配置失败', 500);
  }
}
