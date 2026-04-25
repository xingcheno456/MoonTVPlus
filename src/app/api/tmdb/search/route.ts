/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { searchTMDBMulti } from '@/lib/tmdb.client';

export const runtime = 'nodejs';

/**
 * GET /api/tmdb/search?query=xxx
 * 搜索TMDB，返回多个结果供用户选择
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return apiError('缺少查询参数', 400);
    }

    const config = await getConfig();
    const tmdbApiKey = config.SiteConfig.TMDBApiKey;
    const tmdbProxy = config.SiteConfig.TMDBProxy;
    const tmdbReverseProxy = config.SiteConfig.TMDBReverseProxy;

    if (!tmdbApiKey) {
      return apiError('TMDB API Key 未配置', 400);
    }

    const response = await searchTMDBMulti(
      tmdbApiKey,
      query,
      tmdbProxy,
      tmdbReverseProxy,
    );

    if (response.code !== 200) {
      return apiError('TMDB 搜索失败', response.code, String(response.code));
    }

    // 过滤出电影和电视剧
    const validResults = response.results.filter(
      (item: any) => item.media_type === 'movie' || item.media_type === 'tv',
    );

    return apiSuccess({ results: validResults,
      total: validResults.length, });
  } catch (error) {
    console.error('TMDB搜索失败:', error);
    return apiError('搜索失败: ' + (error as Error).message, 500);
  }
}
