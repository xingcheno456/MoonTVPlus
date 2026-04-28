import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getConfig } from '@/lib/config';
import { getTMDBUpcomingContent } from '@/lib/tmdb.client';

import { logger } from '../../../../lib/logger';

// 内存缓存对象
interface CacheItem {
  data: any;
  timestamp: number;
}

let cache: CacheItem | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1小时（毫秒）

export async function GET(request: NextRequest) {
  try {
    // 检查缓存是否存在且未过期
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_DURATION) {
      return apiSuccess({
        code: 200,
        data: cache.data,
        cached: true,
        cacheAge: Math.floor((now - cache.timestamp) / 1000), // 缓存年龄（秒）
      });
    }

    // 缓存不存在或已过期，获取新数据
    const config = await getConfig();
    const tmdbApiKey = config.SiteConfig?.TMDBApiKey;
    const tmdbProxy = config.SiteConfig?.TMDBProxy;
    const tmdbReverseProxy = config.SiteConfig?.TMDBReverseProxy;

    if (!tmdbApiKey) {
      return apiError('TMDB API Key 未配置', 400);
    }

    // 调用TMDB API获取数据
    const result = await getTMDBUpcomingContent(
      tmdbApiKey,
      tmdbProxy,
      tmdbReverseProxy,
    );

    if (result.code !== 200) {
      return apiError('获取TMDB数据失败', result.code === 401 ? 401 : 500);
    }

    // 更新缓存
    cache = {
      data: result.list,
      timestamp: now,
    };

    return apiSuccess({
      code: 200,
      data: result.list,
      cached: false,
    });
  } catch (error) {
    logger.error('获取TMDB即将上映数据失败:', error);
    return apiError(
      '服务器内部错误: ' + (error instanceof Error ? error.message : '未知错误'),
      500,
    );
  }
}
