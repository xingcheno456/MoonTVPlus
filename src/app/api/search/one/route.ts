import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import {
  executeSavedSourceScript,
  listEnabledSourceScripts,
  normalizeScriptSearchResults,
  normalizeScriptSources,
} from '@/lib/source-script';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const resourceId = searchParams.get('resourceId');

  if (!query || !resourceId) {
    const cacheTime = await getCacheTime();
    return apiSuccess({ result: null }, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  try {
    const enabledScripts = await listEnabledSourceScripts();
    const matchedScript = enabledScripts.find(
      (item) => item.key === resourceId,
    );
    if (matchedScript) {
      const sourcesExecution = await executeSavedSourceScript({
        key: matchedScript.key,
        hook: 'getSources',
        payload: {},
      });
      const sources = normalizeScriptSources(sourcesExecution.result);
      const scriptResults = await Promise.all(
        sources.map(async (source) => {
          const execution = await executeSavedSourceScript({
            key: matchedScript.key,
            hook: 'search',
            payload: {
              keyword: query,
              page: 1,
              sourceId: source.id,
            },
          });

          return normalizeScriptSearchResults({
            scriptKey: matchedScript.key,
            scriptName: matchedScript.name,
            sourceId: source.id,
            sourceName: source.name,
            result: execution.result,
          });
        }),
      );

      let result = scriptResults.flat().filter((r) => r.title === query);
      if (!config.SiteConfig.DisableYellowFilter) {
        result = result.filter((item) => {
          const typeName = item.type_name || '';
          return !yellowWords.some((word: string) => typeName.includes(word));
        });
      }

      const cacheTime = await getCacheTime();
      if (result.length === 0) {
        return apiError('未找到结果', 404);
      }

      return apiSuccess({ results: result }, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      });
    }

    const targetSite = apiSites.find((site) => site.key === resourceId);
    if (!targetSite) {
      return apiError(`未找到指定的视频源: ${resourceId}`, 404);
    }

    const results = await searchFromApi(targetSite, query);
    let result = results.filter((r) => r.title === query);
    if (!config.SiteConfig.DisableYellowFilter) {
      result = result.filter((result) => {
        const typeName = result.type_name || '';
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }
    const cacheTime = await getCacheTime();

    if (result.length === 0) {
      return apiError('未找到结果', 404);
    } else {
      return apiSuccess({ results: result }, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      });
    }
  } catch (error) {
    return apiError('搜索失败', 500);
  }
}
