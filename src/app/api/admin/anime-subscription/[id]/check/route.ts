/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { checkSubscription } from '@/lib/anime-subscription';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

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
    // 权限检查
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || (authInfo.role !== 'admin' && authInfo.role !== 'owner')) {
      return apiError('无权限访问', 403);
    }

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
    console.error('检查追番订阅失败:', error);
    return apiError('检查失败', 500);
  }
}
