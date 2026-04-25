/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * PUT /api/admin/anime-subscription/[id]
 * 更新订阅
 */
export async function PUT(
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

    const index = subscriptions.findIndex((sub) => sub.id === id);
    if (index === -1) {
      return apiError('订阅不存在', 404);
    }

    const updates = await req.json();
    const subscription = subscriptions[index];

    // 更新字段
    if (updates.title !== undefined) {
      subscription.title = updates.title.trim();
    }
    if (updates.filterText !== undefined) {
      subscription.filterText = updates.filterText.trim();
    }
    if (updates.source !== undefined) {
      if (!['acgrip', 'mikan', 'dmhy'].includes(updates.source)) {
        return apiError('无效的搜索源', 400);
      }
      subscription.source = updates.source;
    }
    if (updates.enabled !== undefined) {
      subscription.enabled = updates.enabled;
    }
    if (updates.lastEpisode !== undefined) {
      // 验证集数为非负整数
      const episode = parseInt(String(updates.lastEpisode), 10);
      if (isNaN(episode) || episode < 0) {
        return apiError('集数必须是非负整数', 400);
      }
      subscription.lastEpisode = episode;
    }

    subscription.updatedAt = Date.now();

    await db.saveAdminConfig(config);

    return apiSuccess(subscription);
  } catch (error: any) {
    console.error('更新追番订阅失败:', error);
    return apiError(error.message || '更新订阅失败', 500);
  }
}

/**
 * DELETE /api/admin/anime-subscription/[id]
 * 删除订阅
 */
export async function DELETE(
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

    const index = subscriptions.findIndex((sub) => sub.id === id);
    if (index === -1) {
      return apiError('订阅不存在', 404);
    }

    subscriptions.splice(index, 1);
    await db.saveAdminConfig(config);

    return apiSuccess({ success: true });
  } catch (error: any) {
    console.error('删除追番订阅失败:', error);
    return apiError('删除订阅失败', 500);
  }
}
