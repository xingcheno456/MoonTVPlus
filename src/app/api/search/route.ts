 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import {
  buildCacheHeaders,
  searchAll,
} from '@/services/search.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      const cacheHeaders = await buildCacheHeaders();
      return apiSuccess({ results: [] }, { headers: cacheHeaders });
    }

    const results = await searchAll({ username, query }, request);

    const cacheHeaders = await buildCacheHeaders();

    if (results.length === 0) {
      return apiSuccess({ results: [] });
    }

    return apiSuccess({ results }, { headers: cacheHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === '搜索失败') {
      return apiError('搜索失败', 500);
    }
    return handleServiceError(error);
  }
}
