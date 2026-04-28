import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { validateAuthenticatedUser } from '@/services/auth.service';
import {
  buildCacheHeaders,
  searchSingleSource,
} from '@/services/search.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const resourceId = searchParams.get('resourceId');

    if (!query || !resourceId) {
      const cacheHeaders = await buildCacheHeaders();
      return apiSuccess({ result: null }, { headers: cacheHeaders });
    }

    const result = await searchSingleSource({
      username,
      query,
      resourceId,
      exactMatch: true,
    });

    const cacheHeaders = await buildCacheHeaders();

    if (result.length === 0) {
      return apiError('未找到结果', 404);
    }

    return apiSuccess({ results: result }, { headers: cacheHeaders });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('未找到指定的视频源')) {
      return apiError(error.message, 404);
    }
    return apiError('搜索失败', 500);
  }
}
