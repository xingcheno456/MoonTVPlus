/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { getProxyToken } from '@/lib/emby-token';
import {
  executeSavedSourceScript,
  listEnabledSourceScripts,
  normalizeScriptSearchResults,
  normalizeScriptSources,
} from '@/lib/source-script';
import { SearchResult } from '@/lib/types';
import { yellowWords } from '@/lib/yellow';

import { logger } from '../lib/logger';

export interface SearchOptions {
  username: string;
  query: string;
  timeout?: number;
}

export interface SingleSourceSearchOptions {
  username: string;
  query: string;
  resourceId: string;
  exactMatch?: boolean;
  timeout?: number;
}

export type CacheHeaders = Record<string, string>;

export async function buildCacheHeaders(): Promise<CacheHeaders> {
  const cacheTime = await getCacheTime();
  return {
    'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    'Netlify-Vary': 'query',
  };
}

export function filterYellowWords(
  results: SearchResult[],
  disableFilter: boolean,
): SearchResult[] {
  if (disableFilter) return results;
  return results.filter((result) => {
    const typeName = result.type_name || '';
    return !yellowWords.some((word: string) => typeName.includes(word));
  });
}

export function applyWeightsAndSort(
  results: SearchResult[],
  weightMap: Map<string, number>,
): SearchResult[] {
  const weighted = results.map((result) => ({
    ...result,
    weight: result.weight ?? weightMap.get(result.source) ?? 0,
  }));
  weighted.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  return weighted;
}

export async function buildWeightMap(): Promise<Map<string, number>> {
  const config = await getConfig();
  const weightMap = new Map<string, number>();
  config.SourceConfig.forEach((source) => {
    weightMap.set(source.key, source.weight ?? 0);
  });
  return weightMap;
}

async function searchEmbySources(
  query: string,
  weightMap: Map<string, number>,
  request?: NextRequest,
  timeout = 20000,
): Promise<SearchResult[]> {
  const { embyManager } = await import('@/lib/emby-manager');
  const embySourcesMap = await embyManager.getAllClients();
  const embySources = Array.from(embySourcesMap.values());

  const proxyToken = request ? await getProxyToken(request) : undefined;

  const embyPromises = embySources.map(({ client, config: embyConfig }) =>
    Promise.race([
      (async () => {
        try {
          const searchResult = await client.getItems({
            searchTerm: query,
            IncludeItemTypes: 'Movie,Series',
            Recursive: true,
            Fields: 'Overview,ProductionYear',
            Limit: 50,
          });

          const sourceValue =
            embySources.length === 1 ? 'emby' : `emby_${embyConfig.key}`;
          const sourceName =
            embySources.length === 1 ? 'Emby' : embyConfig.name;

          return searchResult.Items.map((item) => ({
            id: item.Id,
            source: sourceValue,
            source_name: sourceName,
            weight: weightMap.get(sourceValue) ?? 0,
            title: item.Name,
            poster: client.getImageUrl(
              item.Id,
              'Primary',
              undefined,
              client.isProxyEnabled() ? proxyToken || undefined : undefined,
            ),
            episodes: [],
            episodes_titles: [],
            year: item.ProductionYear?.toString() || '',
            desc: item.Overview || '',
            type_name: item.Type === 'Movie' ? '电影' : '电视剧',
            douban_id: 0,
          }));
        } catch (error) {
          logger.error(`[Search] 搜索 ${embyConfig.name} 失败:`, error);
          return [];
        }
      })(),
      new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error(`${embyConfig.name} timeout`)), timeout),
      ),
    ]).catch((error) => {
      logger.error(`[Search] 搜索 ${embyConfig.name} 超时:`, error);
      return [];
    }),
  );

  const results = await Promise.all(embyPromises);
  return results.filter(Array.isArray).flat();
}

async function searchOpenList(
  query: string,
  weightMap: Map<string, number>,
  timeout = 20000,
): Promise<SearchResult[]> {
  const config = await getConfig();
  const hasOpenList = !!(
    config.OpenListConfig?.Enabled &&
    config.OpenListConfig?.URL &&
    config.OpenListConfig?.Username &&
    config.OpenListConfig?.Password
  );

  if (!hasOpenList) return [];

  return Promise.race([
    (async () => {
      try {
        const { getCachedMetaInfo, setCachedMetaInfo } = await import('@/lib/openlist-cache');
        const { getTMDBImageUrl } = await import('@/lib/tmdb.search');
        const { db } = await import('@/lib/db');

        let metaInfo = getCachedMetaInfo();

        if (!metaInfo) {
          const metainfoJson = await db.getGlobalValue('video.metainfo');
          if (metainfoJson) {
            metaInfo = JSON.parse(metainfoJson);
            if (metaInfo) {
              setCachedMetaInfo(metaInfo);
            }
          }
        }

        if (metaInfo && metaInfo.folders) {
          return Object.entries(metaInfo.folders)
            .filter(([folderName, info]: [string, any]) => {
              const matchFolder = folderName.toLowerCase().includes(query.toLowerCase());
              const matchTitle = info.title.toLowerCase().includes(query.toLowerCase());
              return matchFolder || matchTitle;
            })
            .map(([folderName, info]: [string, any]) => ({
              id: folderName,
              source: 'openlist',
              source_name: '私人影库',
              weight: weightMap.get('openlist') ?? 0,
              title: info.title,
              poster: getTMDBImageUrl(info.poster_path),
              episodes: [],
              episodes_titles: [],
              year: info.release_date.split('-')[0] || '',
              desc: info.overview,
              type_name: info.media_type === 'movie' ? '电影' : '电视剧',
              douban_id: 0,
            }));
        }
        return [];
      } catch (error) {
        logger.error('[Search] 搜索 OpenList 失败:', error);
        return [];
      }
    })(),
    new Promise<any[]>((_, reject) =>
      setTimeout(() => reject(new Error('OpenList timeout')), timeout),
    ),
  ]).catch((error) => {
    logger.error('[Search] 搜索 OpenList 超时:', error);
    return [];
  });
}

async function searchApiSites(
  query: string,
  username: string,
  timeout = 20000,
): Promise<SearchResult[]> {
  const apiSites = await getAvailableApiSites(username);

  const searchPromises = apiSites.map((site) =>
    Promise.race([
      searchFromApi(site, query),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${site.name} timeout`)), timeout),
      ),
    ]).catch((err) => {
      logger.warn(`搜索失败 ${site.name}:`, err.message);
      return [];
    }),
  );

  const results = await Promise.all(searchPromises);
  return results.filter(Array.isArray).flat();
}

async function searchSourceScripts(
  query: string,
  timeout = 20000,
): Promise<SearchResult[]> {
  const scriptSummaries = await listEnabledSourceScripts();
  const scriptPromises = scriptSummaries.map((script) =>
    Promise.race([
      (async () => {
        try {
          const sourcesExecution = await executeSavedSourceScript({
            key: script.key,
            hook: 'getSources',
            payload: {},
          });
          const sources = normalizeScriptSources(sourcesExecution.result);

          const searchResults = await Promise.all(
            sources.map(async (source) => {
              const execution = await executeSavedSourceScript({
                key: script.key,
                hook: 'search',
                payload: { keyword: query, page: 1, sourceId: source.id },
              });

              return normalizeScriptSearchResults({
                scriptKey: script.key,
                scriptName: script.name,
                sourceId: source.id,
                sourceName: source.name,
                result: execution.result,
              });
            }),
          );

          return searchResults.flat();
        } catch (error) {
          logger.error(`[Search] 搜索脚本 ${script.name} 失败:`, error);
          return [];
        }
      })(),
      new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error(`${script.name} timeout`)), timeout),
      ),
    ]).catch((error) => {
      logger.error(`[Search] 搜索脚本 ${script.name} 超时:`, error);
      return [];
    }),
  );

  const results = await Promise.all(scriptPromises);
  return results.filter(Array.isArray).flat();
}

export async function searchAll(
  options: SearchOptions,
  request?: NextRequest,
): Promise<SearchResult[]> {
  const { username, query, timeout = 20000 } = options;
  const config = await getConfig();
  const weightMap = await buildWeightMap();

  const [openlistResults, embyResults, apiResults, scriptResults] =
    await Promise.all([
      searchOpenList(query, weightMap, timeout),
      searchEmbySources(query, weightMap, request, timeout),
      searchApiSites(query, username, timeout),
      searchSourceScripts(query, timeout),
    ]);

  let allResults = [
    ...openlistResults,
    ...embyResults,
    ...apiResults,
    ...scriptResults,
  ];

  allResults = applyWeightsAndSort(allResults, weightMap);
  allResults = filterYellowWords(allResults, config.SiteConfig.DisableYellowFilter);

  return allResults;
}

export async function searchSingleSource(
  options: SingleSourceSearchOptions,
): Promise<SearchResult[]> {
  const { username, query, resourceId, exactMatch = false, timeout = 20000 } = options;
  const config = await getConfig();
  const apiSites = await getAvailableApiSites(username);

  const enabledScripts = await listEnabledSourceScripts();
  const matchedScript = enabledScripts.find((item) => item.key === resourceId);

  let results: SearchResult[];

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
          payload: { keyword: query, page: 1, sourceId: source.id },
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

    results = scriptResults.flat();
  } else {
    const targetSite = apiSites.find((site) => site.key === resourceId);
    if (!targetSite) {
      throw new Error(`未找到指定的视频源: ${resourceId}`);
    }

    results = await Promise.race([
      searchFromApi(targetSite, query),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${targetSite.name} timeout`)), timeout),
      ),
    ]).catch((err) => {
      logger.warn(`搜索失败 ${targetSite.name}:`, err.message);
      return [];
    });
  }

  if (exactMatch) {
    results = results.filter((r) => r.title === query);
  }

  results = filterYellowWords(results, config.SiteConfig.DisableYellowFilter);
  return results;
}

export async function getSearchResources(username?: string) {
  const apiSites = await getAvailableApiSites(username);
  const scriptSites = (await listEnabledSourceScripts()).map((item) => ({
    key: item.key,
    name: item.name,
    script: true,
  }));
  return [...apiSites, ...scriptSites];
}

export async function generateSuggestions(
  query: string,
  username: string,
): Promise<
  Array<{
    text: string;
    type: 'exact' | 'related' | 'suggestion';
    score: number;
  }>
> {
  const config = await getConfig();
  const queryLower = query.toLowerCase();
  const apiSites = await getAvailableApiSites(username);
  let realKeywords: string[] = [];

  if (apiSites.length > 0) {
    const firstSite = apiSites[0];
    const results = await searchFromApi(firstSite, query);

    realKeywords = Array.from(
      new Set(
        results
          .filter(
            (r: any) =>
              config.SiteConfig.DisableYellowFilter ||
              !yellowWords.some((word: string) =>
                (r.type_name || '').includes(word),
              ),
          )
          .map((r: any) => r.title)
          .filter(Boolean)
          .flatMap((title: string) => title.split(/[ -:：·、-]/))
          .filter(
            (w: string) => w.length > 1 && w.toLowerCase().includes(queryLower),
          ),
      ),
    ).slice(0, 8);
  }

  const realSuggestions = realKeywords.map((word) => {
    const wordLower = word.toLowerCase();
    const queryWords = queryLower.split(/[ -:：·、-]/);

    let score = 1.0;
    if (wordLower === queryLower) {
      score = 2.0;
    } else if (
      wordLower.startsWith(queryLower) ||
      wordLower.endsWith(queryLower)
    ) {
      score = 1.8;
    } else if (queryWords.some((qw) => wordLower.includes(qw))) {
      score = 1.5;
    }

    let type: 'exact' | 'related' | 'suggestion' = 'related';
    if (score >= 2.0) {
      type = 'exact';
    } else if (score >= 1.5) {
      type = 'related';
    } else {
      type = 'suggestion';
    }

    return { text: word, type, score };
  });

  return realSuggestions.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    const typePriority = { exact: 3, related: 2, suggestion: 1 };
    return typePriority[b.type] - typePriority[a.type];
  });
}
