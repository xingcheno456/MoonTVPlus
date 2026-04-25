import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getEpisodes } from '@/services/danmaku.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const animeId = searchParams.get('animeId');

    const result = await getEpisodes(animeId || '');
    return apiSuccess(result);
  } catch (error) {
    console.error('获取弹幕剧集列表失败:', error);
    return apiError(
      error instanceof Error ? error.message : '获取弹幕剧集列表失败',
      500,
    );
  }
}
