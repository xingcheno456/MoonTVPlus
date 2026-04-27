 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getTVSeasonDetails } from '@/lib/tmdb.search';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/tmdb/episodes?id=xxx&season=xxx
 * 获取电视剧季度的集数详情（带图片）
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const season = searchParams.get('season');

    if (!id || !season) {
      return apiError('缺少参数', 400);
    }

    const config = await getConfig();
    const tmdbApiKey = config.SiteConfig.TMDBApiKey;
    const tmdbProxy = config.SiteConfig.TMDBProxy;
    const tmdbReverseProxy = config.SiteConfig.TMDBReverseProxy;

    if (!tmdbApiKey) {
      return apiError('TMDB API Key 未配置', 400);
    }

    const response = await getTVSeasonDetails(
      tmdbApiKey,
      parseInt(id),
      parseInt(season),
      tmdbProxy,
      tmdbReverseProxy,
    );

    if (response.code !== 200 || !response.season) {
      return apiError('获取失败', response.code, String(response.code));
    }

    return apiSuccess(response.season);
  } catch (error) {
    logger.error('获取集数详情失败:', error);
    return apiError('获取失败: ' + (error as Error).message, 500);
  }
}
