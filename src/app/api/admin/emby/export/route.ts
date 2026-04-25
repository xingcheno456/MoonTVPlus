import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    // 仅站长可用
    if (authInfo.username !== process.env.USERNAME) {
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
