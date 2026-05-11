import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { detailQuerySchema } from '@/lib/api-schemas';
import { parseSearchParams, validateAuth } from '@/lib/api-validation';
import { getAvailableApiSites, getCacheTime } from '@/lib/config';
import { getDetailFromApiV2 } from '@/lib/downstream';
import {
  executeSavedSourceScript,
  normalizeScriptDetailResult,
  normalizeScriptSources,
  parseScriptSourceValue,
} from '@/lib/source-script';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

/**
 * 根据 source 和 id 直接获取视频详情
 * 这个API专门用于play页面快速获取当前源的详情
 */
export async function GET(request: NextRequest) {
  const authResult = validateAuth(request);
  if ('status' in authResult) return authResult;
  const { username: _username } = authResult;

  const paramResult = parseSearchParams(request, detailQuerySchema);
  if ('error' in paramResult) return paramResult.error;
  const { id, source: sourceCode } = paramResult.data;

  const parsedScriptSource = parseScriptSourceValue(sourceCode);
  if (parsedScriptSource) {
    try {
      const sourcesExecution = await executeSavedSourceScript({
        key: parsedScriptSource.scriptKey,
        hook: 'getSources',
        payload: {},
      });
      const sources = normalizeScriptSources(sourcesExecution.result);
      const sourceInfo = sources.find(
        (item) => item.id === parsedScriptSource.sourceId,
      ) || {
        id: parsedScriptSource.sourceId,
        name: parsedScriptSource.sourceId,
      };

      const detailExecution = await executeSavedSourceScript({
        key: parsedScriptSource.scriptKey,
        hook: 'detail',
        payload: {
          id,
          sourceId: parsedScriptSource.sourceId,
        },
      });

      const normalized = normalizeScriptDetailResult({
        source: sourceCode,
        scriptKey: parsedScriptSource.scriptKey,
        scriptName: detailExecution.meta?.name || parsedScriptSource.scriptKey,
        sourceId: parsedScriptSource.sourceId,
        sourceName: sourceInfo.name,
        detailId: id,
        result: detailExecution.result,
      });

      return apiSuccess(normalized);
    } catch (error) {
      return apiError((error as Error).message, 500);
    }
  }

  if (sourceCode === 'emby' || sourceCode.startsWith('emby_')) {
    return apiError('Emby 功能已不可用', 400);
  }

  if (sourceCode === 'xiaoya') {
    return apiError('小雅功能已不可用', 400);
  }

  if (sourceCode === 'quark-temp') {
    return apiError('夸克临时播放功能已不可用', 400);
  }

  if (sourceCode === 'openlist') {
    return apiError('私人影库功能已不可用', 400);
  }

  if (!/^[\w-]+$/.test(id)) {
    return apiError('无效的视频ID格式', 400);
  }

  // 对于其他采集源，直接按 id 获取详情。
  try {
    const apiSites = await getAvailableApiSites(_username);
    const apiSite = apiSites.find((site) => site.key === sourceCode);

    if (!apiSite) {
      return apiError('无效的API来源', 400);
    }

    const result = await getDetailFromApiV2(apiSite, id);

    // 添加 proxyMode 到返回结果
    const resultWithProxy = {
      ...result,
      proxyMode: apiSite.proxyMode || false,
    };

    const cacheTime = await getCacheTime();

    return apiSuccess(resultWithProxy, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
