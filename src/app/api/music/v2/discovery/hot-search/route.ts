import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { isMusicSource, lxGetJson } from '@/lib/music-v2';
import { badRequest, internalError } from '@/lib/music-v2-api';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'mg';
    if (!isMusicSource(source)) return badRequest('不支持的音源');

    const list = await lxGetJson<
      Array<{ name: string; singer?: string; source: string }>
    >(`/api/music/hotSearch?source=${source}`, 'none');

    return apiSuccess({ data: {
        list: list.map((item) => ({
          keyword: item.name,
          name: item.name,
          artist: item.singer || '',
          source: item.source,
        })),
      }, });
  } catch (error) {
    return internalError('获取热搜失败', (error as Error).message);
  }
}
