/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getTMDBImages } from '@/lib/tmdb.client';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/tmdb/images?id=xxx&type=movie|tv&page=1&pageSize=24
 * 获取 TMDB 照片墙数据，并在服务端分页
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
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const page = pageParam ? Math.max(parseInt(pageParam, 10), 1) : null;
    const pageSize = pageSizeParam
      ? Math.min(Math.max(parseInt(pageSizeParam, 10), 1), 60)
      : null;

    if (!id) {
      return apiError('缺少ID参数', 400);
    }

    if (type !== 'movie' && type !== 'tv') {
      return apiError('类型参数必须是movie或tv', 400);
    }

    const config = await getConfig();
    const tmdbApiKey = config.SiteConfig.TMDBApiKey;
    const tmdbProxy = config.SiteConfig.TMDBProxy;
    const tmdbReverseProxy = config.SiteConfig.TMDBReverseProxy;

    if (!tmdbApiKey) {
      return apiError('TMDB API Key 未配置', 400);
    }

    const response = await getTMDBImages(
      tmdbApiKey,
      parseInt(id, 10),
      type as 'movie' | 'tv',
      tmdbProxy,
      tmdbReverseProxy,
    );

    if (response.code !== 200 || !response.images) {
      return apiError('TMDB 图片信息获取失败', response.code, String(response.code));
    }

    const backdrops = ((response.images.backdrops as any[]) || []).map((item: any) => ({
      ...item,
      imageType: 'backdrop' as const,
    }));
    const posters = ((response.images.posters as any[]) || []).map((item: any) => ({
      ...item,
      imageType: 'poster' as const,
    }));

    const allImages = [...backdrops, ...posters].sort((a, b) => {
      const voteDiff = (b.vote_average || 0) - (a.vote_average || 0);
      if (voteDiff !== 0) return voteDiff;
      return (b.vote_count || 0) - (a.vote_count || 0);
    });

    const total = allImages.length;

    if (!page || !pageSize) {
      return apiSuccess({
        total,
        list: allImages,
      });
    }

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const list = allImages.slice(start, start + pageSize);

    return apiSuccess({
      page: safePage,
      pageSize,
      total,
      totalPages,
      list,
    });
  } catch (error) {
    logger.error('TMDB图片信息获取失败:', error);
    return apiError('获取图片信息失败: ' + (error as Error).message, 500);
  }
}
