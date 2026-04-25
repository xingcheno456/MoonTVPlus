import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import {
  executeSavedSourceScript,
  normalizeScriptRecommendResults,
  normalizeScriptSources,
} from '@/lib/source-script';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  const { searchParams } = new URL(request.url);
  const sourceKey = searchParams.get('source');
  const page = Number(searchParams.get('page') || '1');

  if (!sourceKey) {
    return apiError('缺少参数: source', 400);
  }

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
