
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { resetConfig } from '@/lib/config';
import { STORAGE_TYPE } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  const adminAuth = validateAdminAuth(request);
  if ('status' in adminAuth) return adminAuth;

  if (adminAuth.auth.role !== 'owner') {
    return apiError('仅支持站长重置配置', 401);
  }

  try {
    await resetConfig();

    return apiSuccess({ ok: true }, {
        headers: {
          'Cache-Control': 'no-store', // 管理员配置不缓存
        },
      });
  } catch (error) {
    return apiError('重置管理员配置失败', 500);
  }
}
