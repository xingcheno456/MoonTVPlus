/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * PUT /api/admin/anime-subscription/toggle
 * 切换追番功能启用状态
 */
export async function PUT(req: NextRequest) {
  try {
    // 权限检查
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || (authInfo.role !== 'admin' && authInfo.role !== 'owner')) {
      return apiError('无权限访问', 403);
    }

    const { enabled } = await req.json();

    if (typeof enabled !== 'boolean') {
      return apiError('enabled 必须是布尔值', 400);
    }

    const config = await getConfig();
    if (!config.AnimeSubscriptionConfig) {
      config.AnimeSubscriptionConfig = { Enabled: false, Subscriptions: [] };
    }

    config.AnimeSubscriptionConfig.Enabled = enabled;
    await db.saveAdminConfig(config);

    return apiSuccess({ enabled });
  } catch (error: any) {
    console.error('切换追番功能状态失败:', error);
    return apiError('切换状态失败', 500);
  }
}
