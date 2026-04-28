/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

import { logger } from '../../../../lib/logger';

import { AnimeSubscription } from '@/types/anime-subscription';

export const runtime = 'nodejs';

/**
 * GET /api/admin/anime-subscription
 * 获取订阅列表和配置
 */
export async function GET(req: NextRequest) {
  try {
    const adminAuth = validateAdminAuth(req);
    if ('status' in adminAuth) return adminAuth;

    const config = await getConfig();
    const animeConfig = config.AnimeSubscriptionConfig || {
      Enabled: false,
      Subscriptions: [],
    };

    return apiSuccess(animeConfig);
  } catch (error: any) {
    logger.error('获取追番订阅配置失败:', error);
    return apiError(error.message || '获取配置失败', 500);
  }
}

/**
 * POST /api/admin/anime-subscription
 * 创建新订阅
 */
export async function POST(req: NextRequest) {
  try {
    const adminAuth = validateAdminAuth(req);
    if ('status' in adminAuth) return adminAuth;

    const { title, filterText, source, enabled, lastEpisode } =
      await req.json();

    // 验证必填字段
    if (!title || !filterText || !source) {
      return apiError('缺少必填字段', 400);
    }

    // 验证 source
    if (!['acgrip', 'mikan', 'dmhy'].includes(source)) {
      return apiError('无效的搜索源', 400);
    }

    const config = await getConfig();
    if (!config.AnimeSubscriptionConfig) {
      config.AnimeSubscriptionConfig = { Enabled: false, Subscriptions: [] };
    }

    // 验证集数
    let episodeNum = 0;
    if (lastEpisode !== undefined) {
      episodeNum = parseInt(String(lastEpisode), 10);
      if (isNaN(episodeNum) || episodeNum < 0) {
        return apiError('集数必须是非负整数', 400);
      }
    }

    // 创建新订阅
    const newSubscription: AnimeSubscription = {
      id: crypto.randomUUID(),
      title: title.trim(),
      filterText: filterText.trim(),
      source,
      enabled: enabled ?? true,
      lastCheckTime: 0,
      lastEpisode: episodeNum,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: adminAuth.username || 'unknown',
    };

    config.AnimeSubscriptionConfig.Subscriptions.push(newSubscription);
    await db.saveAdminConfig(config);

    return apiSuccess(newSubscription);
  } catch (error: any) {
    logger.error('创建追番订阅失败:', error);
    return apiError(error.message || '创建订阅失败', 500);
  }
}
