 

import { NextRequest } from 'next/server';

import { apiSuccess } from '@/lib/api-response';
import { getCachedEmbyViews, setCachedEmbyViews } from '@/lib/emby-cache';
import { embyManager } from '@/lib/emby-manager';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const embyKey = searchParams.get('embyKey') || undefined;

    // 检查缓存（按embyKey缓存）
    const cacheKey = embyKey || 'default';
    const cached = getCachedEmbyViews(cacheKey);
    if (cached) {
      return apiSuccess(cached);
    }

    // 获取Emby客户端
    const client = await embyManager.getClient(embyKey);

    // 获取媒体库列表
    const views = await client.getUserViews();

    // 过滤出电影和电视剧媒体库
    const filteredViews = views.filter(
      (view) =>
        view.CollectionType === 'movies' || view.CollectionType === 'tvshows',
    );

    const response = {
      success: true,
      views: filteredViews.map((view) => ({
        id: view.Id,
        name: view.Name,
        type: view.CollectionType,
      })),
    };

    // 缓存结果
    setCachedEmbyViews(cacheKey, response);

    return apiSuccess(response);
  } catch (error) {
    logger.error('获取 Emby 媒体库列表失败:', error);
    return apiSuccess({
      error: '获取 Emby 媒体库列表失败: ' + (error as Error).message,
      views: [],
    });
  }
}
