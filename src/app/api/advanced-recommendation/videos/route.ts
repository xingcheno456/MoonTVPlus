import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { parseSearchParams, validateAuth } from '@/lib/api-validation';
import { commonSchemas } from '@/lib/api-schemas';
import {
  executeSavedSourceScript,
  normalizeScriptRecommendResults,
  normalizeScriptSources,
} from '@/lib/source-script';
import { z } from 'zod';

const recommendQuerySchema = z.object({
  source: commonSchemas.source,
  page: commonSchemas.page,
});

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authResult = validateAuth(request);
  if ('status' in authResult) return authResult;

  const paramResult = parseSearchParams(request, recommendQuerySchema);
  if ('error' in paramResult) return paramResult.error;
  const { source: sourceKey, page } = paramResult.data;

  try {
    let sources = [{ id: 'default', name: '默认源' }];

    try {
      const sourcesExecution = await executeSavedSourceScript({
        key: sourceKey,
        hook: 'getSources',
        payload: {},
      });
      sources = normalizeScriptSources(sourcesExecution.result);
    } catch {
      // 允许脚本未实现 getSources，继续使用默认源
    }

    const execution = await executeSavedSourceScript({
      key: sourceKey,
      hook: 'recommend',
      payload: { page },
    });

    const results = normalizeScriptRecommendResults({
      scriptKey: sourceKey,
      scriptName: execution.meta?.name || sourceKey,
      result: execution.result,
      sources,
      defaultSourceId: sources[0]?.id || 'default',
    });

    return apiSuccess({
      results,
      page: Number(execution.result?.page || page),
      pageCount: Number(execution.result?.pageCount || 1),
      total: Number(execution.result?.total || results.length),
    });
  } catch (error) {
    return apiError((error as Error).message || '获取高级推荐失败', 500);
  }
}
