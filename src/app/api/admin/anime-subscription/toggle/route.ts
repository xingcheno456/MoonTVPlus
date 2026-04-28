/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

import { logger } from '../../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * PUT /api/admin/anime-subscription/toggle
 * 切换追番功能启用状态
 */
export async function PUT(req: NextRequest) {
  try {
    const adminAuth = validateAdminAuth(req);
    if ('status' in adminAuth) return adminAuth;

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
    logger.error('切换追番功能状态失败:', error);
    return apiError('切换状态失败', 500);
  }
}
