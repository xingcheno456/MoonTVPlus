
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';
import { EmbyClient } from '@/lib/emby.client';
import { clearEmbyCache } from '@/lib/emby-cache';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/admin/emby
 * Emby 配置管理接口
 * - test: 测试 Emby 连接
 * - clearCache: 清除 Emby 缓存
 */
export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const body = await request.json();
    const { action, ServerURL, ApiKey, Username, Password } = body;

    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;
    const username = adminAuth.username;

    // 获取配置
    const adminConfig = await getConfig();

    if (action === 'test') {
      // 测试连接
      if (!ServerURL) {
        return apiError('请填写 Emby 服务器地址', 400);
      }

      if (!ApiKey && !Username) {
        return apiError('请填写 API Key 或用户名', 400);
      }

      const testConfig = {
        ServerURL,
        ApiKey,
        Username,
        Password,
      };

      const client = new EmbyClient(testConfig);

      // 如果使用用户名密码，先认证
      if (!ApiKey && Username) {
        try {
          await client.authenticate(Username, Password || '');
        } catch (error) {
          return apiSuccess({
              success: false,
              message: 'Emby 认证失败: ' + (error as Error).message,
            }, { status: 200 });
        }
      }

      // 测试连接
      const isConnected = await client.checkConnectivity();
      if (!isConnected) {
        return apiSuccess({
            success: false,
            message: 'Emby 连接失败，请检查服务器地址和认证信息',
          }, { status: 200 });
      }

      return apiSuccess({ message: 'Emby 连接测试成功', });
    }

    if (action === 'clearCache') {
      // 清除缓存
      const result = clearEmbyCache();
      return apiSuccess({ message: `已清除 ${result.cleared} 条 Emby 缓存`,
        cleared: result.cleared, });
    }

    return apiError('不支持的操作', 400);
  } catch (error) {
    logger.error('Emby 配置保存失败:', error);
    return apiError('Emby 配置保存失败: ' + (error as Error).message, 500);
  }
}
