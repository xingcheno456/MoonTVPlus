 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { validateAuthenticatedUser } from '@/services/auth.service';
import { buildCacheHeaders, generateSuggestions } from '@/services/search.service';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return apiSuccess({ suggestions: [] });
    }

    const suggestions = await generateSuggestions(query, username);
    const cacheHeaders = await buildCacheHeaders();

    return apiSuccess({ suggestions }, { headers: cacheHeaders });
  } catch (error) {
    logger.error('获取搜索建议失败', error);
    return apiError('获取搜索建议失败', 500);
  }
}
