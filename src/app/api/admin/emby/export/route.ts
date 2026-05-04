import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { STORAGE_TYPE } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;

    if (adminAuth.auth.role !== 'owner') {
      return apiError('权限不足，仅站长可用', 403);
    }

    const adminConfig = await getConfig();
    const embyConfig = adminConfig.EmbyConfig || {};

    const exportData = JSON.stringify(embyConfig, null, 2);

    return new NextResponse(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="emby-config-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return apiError('导出失败: ' + (error as Error).message, 500);
  }
}
