import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getComments } from '@/services/danmaku.service';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const episodeId = searchParams.get('episodeId');
    const url = searchParams.get('url');

    const result = await getComments(
      episodeId || undefined,
      url || undefined,
    );
    return apiSuccess(result);
  } catch (error) {
    logger.error('获取弹幕失败:', error);
    return apiError(
      error instanceof Error ? error.message : '获取弹幕失败',
      500,
    );
  }
}
