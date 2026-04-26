 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getTVSeasons } from '@/lib/tmdb.search';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/tmdb/seasons?tvId=xxx
 * 获取电视剧的季度列表
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    const { searchParams } = new URL(request.url);
    const tvIdStr = searchParams.get('tvId');

    if (!tvIdStr) {
      return apiError('缺少 tvId 参数', 400);
    }

    const tvId = parseInt(tvIdStr, 10);
    if (isNaN(tvId)) {
      return apiError('tvId 必须是数字', 400);
    }

    const config = await getConfig();
    const tmdbApiKey = config.SiteConfig.TMDBApiKey;
    const tmdbProxy = config.SiteConfig.TMDBProxy;
    const tmdbReverseProxy = config.SiteConfig.TMDBReverseProxy;

    if (!tmdbApiKey) {
      return apiError('TMDB API Key 未配置', 400);
    }

    const result = await getTVSeasons(
      tmdbApiKey,
      tvId,
      tmdbProxy,
      tmdbReverseProxy,
    );

    if (result.code === 200 && result.seasons) {
      return apiSuccess({ seasons: result.seasons, });
    } else {
      return apiError('获取季度列表失败', result.code, String(result.code));
    }
  } catch (error) {
    logger.error('获取季度列表失败:', error);
    return apiError('获取失败: ' + (error as Error).message, 500);
  }
}
