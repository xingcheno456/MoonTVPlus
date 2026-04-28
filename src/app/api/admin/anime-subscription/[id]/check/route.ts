/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { checkSubscription } from '@/lib/anime-subscription';
import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

import { logger } from '../../../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/admin/anime-subscription/[id]/check
 * 手动触发检查单个订阅
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAuth = validateAdminAuth(req);
    if ('status' in adminAuth) return adminAuth;

    const { id } = await params;
    const config = await getConfig();
    const subscriptions = config.AnimeSubscriptionConfig?.Subscriptions || [];

    const subscription = subscriptions.find((sub) => sub.id === id);
    if (!subscription) {
      return apiError('订阅不存在', 404);
    }

    // 执行检查逻辑（忽略时间间隔限制）
    const result = await checkSubscription(subscription);

    // 保存配置
    await db.saveAdminConfig(config);

    return apiSuccess({ ...result, });
  } catch (error: any) {
    logger.error('检查追番订阅失败:', error);
    return apiError('检查失败', 500);
  }
}
