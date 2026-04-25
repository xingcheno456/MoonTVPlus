import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { matchAnime } from '@/services/danmaku.service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName } = body;

    const result = await matchAnime(fileName || '');
    return apiSuccess(result);
  } catch (error) {
    console.error('弹幕匹配失败:', error);
    return apiError(
      error instanceof Error ? error.message : '弹幕匹配失败',
      500,
    );
  }
}
