 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getTMDBMovieDetails, getTMDBTVDetails } from '@/lib/tmdb.client';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/tmdb/detail?id=xxx&type=movie|tv
 * 获取TMDB详情
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'movie';

    if (!id) {
      return apiError('缺少ID参数', 400);
    }

    const config = await getConfig();
    const tmdbApiKey = config.SiteConfig.TMDBApiKey;
    const tmdbProxy = config.SiteConfig.TMDBProxy;
    const tmdbReverseProxy = config.SiteConfig.TMDBReverseProxy;

    if (!tmdbApiKey) {
      return apiError('TMDB API Key 未配置', 400);
    }

    const response =
      type === 'movie'
        ? await getTMDBMovieDetails(
            tmdbApiKey,
            parseInt(id),
            tmdbProxy,
            tmdbReverseProxy,
          )
        : await getTMDBTVDetails(
            tmdbApiKey,
            parseInt(id),
            tmdbProxy,
            tmdbReverseProxy,
          );

    if (response.code !== 200 || !response.details) {
      return apiError('TMDB 详情获取失败', response.code, String(response.code));
    }

    return apiSuccess(response.details);
  } catch (error) {
    logger.error('TMDB详情获取失败:', error);
    return apiError('获取详情失败: ' + (error as Error).message, 500);
  }
}
