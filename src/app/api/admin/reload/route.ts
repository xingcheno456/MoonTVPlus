
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { clearConfigCache } from '@/lib/config';
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
    return apiError('仅支持站长重载配置', 401);
  }

  try {
    await clearConfigCache();

    return apiSuccess({ ok: true }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
  } catch (error) {
    return apiError('重载配置失败', 500);
  }
}
