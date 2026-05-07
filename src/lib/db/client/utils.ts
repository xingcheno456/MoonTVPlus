'use client';

import { clearAuthCookie } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { cacheManager } from './cache';
import type { Favorite, PlayRecord } from './types';

export const PLAY_RECORDS_KEY = 'moontv_play_records';
export const FAVORITES_KEY = 'moontv_favorites';
export const SEARCH_HISTORY_KEY = 'moontv_search_history';
export const MUSIC_PLAY_RECORDS_KEY = 'moontv_music_play_records';

export const STORAGE_TYPE = (() => {
  const raw =
    (typeof window !== 'undefined' &&
      (window as any).RUNTIME_CONFIG?.STORAGE_TYPE) ||
    (process.env.STORAGE_TYPE as
      | 'localstorage'
      | 'redis'
      | 'upstash'
      | undefined) ||
    'localstorage';
  return raw;
})();

export const SEARCH_HISTORY_LIMIT = 20;

export function triggerGlobalError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('globalError', {
        detail: { message },
      }),
    );
  }
}

export async function handleDatabaseOperationFailure(
  dataType: 'playRecords' | 'favorites' | 'searchHistory',
  error: unknown,
): Promise<void> {
  logger.error(`数据库操作失败 (${dataType}):`, error);
  triggerGlobalError('数据库操作失败');

  try {
    await cacheManager.getOrCreateRequest(`recovery-${dataType}`, async () => {
      let freshData: unknown;
      let eventName: string;

      switch (dataType) {
        case 'playRecords':
          freshData = await fetchFromApi<Record<string, PlayRecord>>('/api/playrecords');
          cacheManager.cachePlayRecords(freshData);
          eventName = 'playRecordsUpdated';
          break;
        case 'favorites':
          freshData = await fetchFromApi<Record<string, Favorite>>('/api/favorites');
          cacheManager.cacheFavorites(freshData);
          eventName = 'favoritesUpdated';
          break;
        case 'searchHistory':
          freshData = await fetchFromApi<string[]>('/api/searchhistory');
          cacheManager.cacheSearchHistory(freshData);
          eventName = 'searchHistoryUpdated';
          break;
      }

      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: freshData,
        }),
      );
    });
  } catch (refreshErr) {
    logger.error(`刷新${dataType}缓存失败:`, refreshErr);
    triggerGlobalError(`刷新${dataType}缓存失败`);
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => cacheManager.clearExpiredCaches(), 1000);
}

export async function fetchWithAuth(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  let res = await fetch(url, options);

  if (res.status === 401) {
    const text = await res.clone().text();

    if (
      text.includes('Unauthorized') ||
      text.includes('Refresh token expired') ||
      text.includes('Access token expired')
    ) {
      if (
        typeof window !== 'undefined' &&
        window.location.pathname === '/login'
      ) {
        return res;
      }

      if (
        url.includes('/api/login') ||
        url.includes('/api/register') ||
        url.includes('/api/auth/oidc') ||
        url.includes('/api/auth/refresh')
      ) {
        throw new Error('用户未授权');
      }

      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        res = await fetch(url, options);
      }
    } else {
      return res;
    }

    if (res.status === 401) {
      const text2 = await res.clone().text();
      if (
        text2.includes('Unauthorized') ||
        text2.includes('Refresh token expired') ||
        text2.includes('Access token expired')
      ) {
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login')
        ) {
          try {
            await fetch('/api/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (error) {
            logger.error('注销请求失败:', error);
            clearAuthCookie();
          }
          const currentUrl = window.location.pathname + window.location.search;
          const loginUrl = new URL('/login', window.location.origin);
          loginUrl.searchParams.set('redirect', currentUrl);
          window.location.href = loginUrl.toString();
        }
        throw new Error('用户未授权，已跳转到登录页面');
      }
    }
  }

  if (!res.ok) {
    throw new Error(`请求 ${url} 失败: ${res.status}`);
  }

  return res;
}

export async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(path);
  const json = await res.json();

  if (json && typeof json.success === 'boolean') {
    if (json.success) {
      return json.data as T;
    }
    throw new Error(json.error || '请求失败');
  }

  return json as T;
}

export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}
