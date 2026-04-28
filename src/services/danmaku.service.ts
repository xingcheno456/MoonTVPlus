
import { getConfig } from '@/lib/config';
import { getDanmakuApiBaseUrl } from '@/lib/danmaku/config';
import type {
  DanmakuCommentsResponse,
  DanmakuEpisodesResponse,
  DanmakuMatchResponse,
  DanmakuSearchResponse,
} from '@/lib/danmaku/types';

import { logger } from '../lib/logger';

export function parseXmlDanmaku(
  xmlText: string,
): Array<{ p: string; m: string; cid: number }> {
  const comments: Array<{ p: string; m: string; cid: number }> = [];
  const dTagRegex = /<d\s+p="([^"]+)"[^>]*>([^<]*)<\/d>/g;
  let match;

  while ((match = dTagRegex.exec(xmlText)) !== null) {
    const p = match[1];
    const m = match[2];
    const pParts = p.split(',');
    const cid = pParts[7] ? parseInt(pParts[7]) : 0;
    comments.push({ p, m, cid });
  }

  return comments;
}

async function getBaseUrl(): Promise<string> {
  const config = await getConfig();
  return getDanmakuApiBaseUrl(config.SiteConfig);
}

async function fetchDanmakuApi<T>(
  url: string,
  options?: RequestInit,
  timeout = 30000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
      keepalive: true,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (fetchError) {
    clearTimeout(timeoutId);

    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw new Error('弹幕服务器请求超时，请稍后重试');
    }

    throw fetchError;
  }
}

export async function searchAnime(keyword: string): Promise<DanmakuSearchResponse> {
  if (!keyword) {
    return {
      errorCode: -1,
      success: false,
      errorMessage: '缺少关键词参数',
      animes: [],
    };
  }

  try {
    const baseUrl = await getBaseUrl();
    const apiUrl = `${baseUrl}/api/v2/search/anime?keyword=${encodeURIComponent(keyword)}`;
    return await fetchDanmakuApi<DanmakuSearchResponse>(apiUrl);
  } catch (error) {
    logger.error('弹幕搜索代理错误:', error);
    return {
      errorCode: -1,
      success: false,
      errorMessage: error instanceof Error ? error.message : '搜索失败',
      animes: [],
    };
  }
}

export async function matchAnime(fileName: string): Promise<DanmakuMatchResponse> {
  if (!fileName) {
    return {
      errorCode: -1,
      success: false,
      errorMessage: '缺少文件名参数',
      isMatched: false,
      matches: [],
    };
  }

  try {
    const baseUrl = await getBaseUrl();
    const apiUrl = `${baseUrl}/api/v2/match`;
    return await fetchDanmakuApi<DanmakuMatchResponse>(apiUrl, {
      method: 'POST',
      body: JSON.stringify({ fileName }),
    });
  } catch (error) {
    logger.error('自动匹配代理错误:', error);
    return {
      errorCode: -1,
      success: false,
      errorMessage: error instanceof Error ? error.message : '匹配失败',
      isMatched: false,
      matches: [],
    };
  }
}

export async function getEpisodes(animeId: string): Promise<DanmakuEpisodesResponse> {
  if (!animeId) {
    return {
      errorCode: -1,
      success: false,
      errorMessage: '缺少动漫ID参数',
      bangumi: {
        bangumiId: '',
        animeTitle: '',
        episodes: [],
      },
    };
  }

  try {
    const baseUrl = await getBaseUrl();
    const apiUrl = `${baseUrl}/api/v2/bangumi/${animeId}`;
    return await fetchDanmakuApi<DanmakuEpisodesResponse>(apiUrl);
  } catch (error) {
    logger.error('获取剧集列表代理错误:', error);
    return {
      errorCode: -1,
      success: false,
      errorMessage: error instanceof Error ? error.message : '获取剧集列表失败',
      bangumi: {
        bangumiId: '',
        animeTitle: '',
        episodes: [],
      },
    };
  }
}

export async function getComments(
  episodeId?: string,
  url?: string,
): Promise<DanmakuCommentsResponse> {
  if (!episodeId && !url) {
    return { count: 0, comments: [] };
  }

  try {
    const baseUrl = await getBaseUrl();
    let apiUrl: string;

    if (episodeId) {
      apiUrl = `${baseUrl}/api/v2/comment/${episodeId}?format=xml`;
    } else {
      apiUrl = `${baseUrl}/api/v2/comment?url=${encodeURIComponent(url!)}&format=xml`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/xml, text/xml',
        },
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const comments = parseXmlDanmaku(xmlText);

      return {
        count: comments.length,
        comments,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('弹幕服务器请求超时，请稍后重试');
      }

      throw fetchError;
    }
  } catch (error) {
    logger.error('获取弹幕代理错误:', error);
    return { count: 0, comments: [] };
  }
}
