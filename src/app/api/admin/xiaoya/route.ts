 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { XiaoyaClient } from '@/lib/xiaoya.client';

export const runtime = 'nodejs';

/**
 * POST /api/admin/xiaoya
 * 管理小雅配置
 */
export async function POST(request: NextRequest) {
  try {
    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;

    const body = await request.json();
    const { action, ...configData } = body;

    if (action === 'test') {
      // 测试连接
      try {
        const client = new XiaoyaClient(
          configData.ServerURL,
          configData.Username,
          configData.Password,
          configData.Token,
        );

        // 尝试列出根目录
        await client.listDirectory('/');

        return apiSuccess({ message: '连接成功' });
      } catch (error) {
        return apiError((error as Error).message, 400);
      }
    }

    if (action === 'save') {
      // 保存配置
      const config = await getConfig();

      config.XiaoyaConfig = {
        Enabled: configData.Enabled || false,
        ServerURL: configData.ServerURL || '',
        Token: configData.Token,
        Username: configData.Username,
        Password: configData.Password,
        DisableVideoPreview: configData.DisableVideoPreview || false,
      };

      await db.saveAdminConfig(config);

      return apiSuccess({ message: '保存成功' });
    }

    return apiError('无效的操作', 400);
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
