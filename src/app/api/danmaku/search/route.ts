import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { searchAnime } from '@/services/danmaku.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');

    const result = await searchAnime(keyword || '');
    return apiSuccess(result);
  } catch (error) {
    console.error('弹幕搜索失败:', error);
    return apiError(
      error instanceof Error ? error.message : '弹幕搜索失败',
      500,
    );
  }
}
