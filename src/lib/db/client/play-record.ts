'use client';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { cacheManager } from './cache';
import type { PlayRecord, UserCacheStore } from './types';
import {
  fetchFromApi,
  fetchWithAuth,
  generateStorageKey,
  handleDatabaseOperationFailure,
  PLAY_RECORDS_KEY,
  STORAGE_TYPE,
  triggerGlobalError,
} from './utils';

const CACHE_PREFIX = 'moontv_cache_';
export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  // 服务器端渲染阶段直接返回空，交由客户端 useEffect 再行请求
  if (typeof window === 'undefined') {
    return {};
  }

  // 数据库存储模式：使用混合缓存策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 优先从缓存获取数据
    const cachedData = cacheManager.getCachedPlayRecords();

    if (cachedData) {
      // 返回缓存数据，同时后台异步更新
      fetchFromApi<Record<string, PlayRecord>>(`/api/playrecords`)
        .then((freshData) => {
          // 只有数据真正不同时才更新缓存
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cachePlayRecords(freshData);
            // 触发数据更新事件，供组件监听
            window.dispatchEvent(
              new CustomEvent('playRecordsUpdated', {
                detail: freshData,
              }),
            );
          }
        })
        .catch((err) => {
          logger.warn('后台同步播放记录失败:', err);
          triggerGlobalError('后台同步播放记录失败');
        });

      return cachedData;
    } else {
      // 缓存为空，直接从 API 获取并缓存
      try {
        const freshData =
          await fetchFromApi<Record<string, PlayRecord>>(`/api/playrecords`);
        cacheManager.cachePlayRecords(freshData);
        return freshData;
      } catch (err) {
        logger.error('获取播放记录失败:', err);
        triggerGlobalError('获取播放记录失败');
        return {};
      }
    }
  }

  // localstorage 模式
  try {
    const raw = localStorage.getItem(PLAY_RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PlayRecord>;
  } catch (err) {
    logger.error('读取播放记录失败:', err);
    triggerGlobalError('读取播放记录失败');
    return {};
  }
}

export function getCachedPlayRecordsSnapshot(): Record<string, PlayRecord> {
  if (typeof window === 'undefined') {
    return {};
  }

  if (STORAGE_TYPE !== 'localstorage') {
    const cachedRecords = cacheManager.getCachedPlayRecords();
    if (cachedRecords) {
      return cachedRecords;
    }

    try {
      const username = getAuthInfoFromBrowserCookie()?.username;
      if (!username) return {};

      const raw = localStorage.getItem(`${CACHE_PREFIX}${username}`);
      if (!raw) return {};

      const userCache = JSON.parse(raw) as UserCacheStore;
      return userCache.playRecords?.data || {};
    } catch (err) {
      logger.error('读取用户播放记录快照失败:', err);
      return {};
    }
  }

  try {
    const raw = localStorage.getItem(PLAY_RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PlayRecord>;
  } catch (err) {
    logger.error('读取本地播放记录快照失败:', err);
    return {};
  }
}

/**
 * 保存播放记录。
 * 数据库存储模式下使用乐观更新：先更新缓存（立即生效），再异步同步到数据库。
 */
export async function savePlayRecord(
  source: string,
  id: string,
  record: PlayRecord,
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 数据库存储模式：乐观更新策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新缓存
    const cachedRecords = cacheManager.getCachedPlayRecords() || {};
    cachedRecords[key] = record;
    cacheManager.cachePlayRecords(cachedRecords);

    // 触发立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: cachedRecords,
      }),
    );

    // 异步同步到数据库
    try {
      await fetchWithAuth('/api/playrecords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, record }),
      });
    } catch (err) {
      // 播放记录以用户体验为优先：保留已经写入的本地缓存，避免切集后记忆进度被回滚。
      logger.warn('同步播放记录到数据库失败，保留本地缓存:', err);

      // 后台再尝试补一次，不打断当前播放流程。
      window.setTimeout(() => {
        fetchWithAuth('/api/playrecords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, record }),
        }).catch((retryErr) => {
          logger.warn('播放记录后台重试失败:', retryErr);
        });
      }, 3000);
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    logger.warn('无法在服务端保存播放记录到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    allRecords[key] = record;
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: allRecords,
      }),
    );
  } catch (err) {
    logger.error('保存播放记录失败:', err);
    triggerGlobalError('保存播放记录失败');
    throw err;
  }
}

/**
 * 删除播放记录。
 * 数据库存储模式下使用乐观更新：先更新缓存，再异步同步到数据库。
 */
export async function deletePlayRecord(
  source: string,
  id: string,
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 数据库存储模式：乐观更新策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新缓存
    const cachedRecords = cacheManager.getCachedPlayRecords() || {};
    delete cachedRecords[key];
    cacheManager.cachePlayRecords(cachedRecords);

    // 触发立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: cachedRecords,
      }),
    );

    // 异步同步到数据库
    try {
      await fetchWithAuth(`/api/playrecords?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      await handleDatabaseOperationFailure('playRecords', err);
      triggerGlobalError('删除播放记录失败');
      throw err;
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    logger.warn('无法在服务端删除播放记录到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    delete allRecords[key];
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: allRecords,
      }),
    );
  } catch (err) {
    logger.error('删除播放记录失败:', err);
    triggerGlobalError('删除播放记录失败');
    throw err;
  }
}

/**
 * 迁移播放记录到新的 source/id。
 * 用于换源时保留单一记忆点语义：当前进度迁移到新源后，再清理旧源记录。
 */
export async function migratePlayRecord(
  fromSource: string,
  fromId: string,
  toSource: string,
  toId: string,
  record: PlayRecord,
): Promise<void> {
  const fromKey = generateStorageKey(fromSource, fromId);
  const toKey = generateStorageKey(toSource, toId);

  if (fromKey === toKey) {
    await savePlayRecord(toSource, toId, record);
    return;
  }

  if (STORAGE_TYPE !== 'localstorage') {
    const cachedRecords = {
      ...(cacheManager.getCachedPlayRecords() || {}),
    };

    delete cachedRecords[fromKey];
    cachedRecords[toKey] = record;
    cacheManager.cachePlayRecords(cachedRecords);

    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: cachedRecords,
      }),
    );

    const persistMove = async () => {
      await fetchWithAuth('/api/playrecords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: toKey, record }),
      });

      await fetchWithAuth(
        `/api/playrecords?key=${encodeURIComponent(fromKey)}`,
        {
          method: 'DELETE',
        },
      );
    };

    persistMove().catch((err) => {
      logger.warn('迁移播放记录到数据库失败，稍后重试:', err);

      window.setTimeout(() => {
        persistMove().catch((retryErr) => {
          logger.warn('迁移播放记录后台重试失败:', retryErr);
        });
      }, 3000);
    });
    return;
  }

  if (typeof window === 'undefined') {
    logger.warn('无法在服务端迁移播放记录到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    delete allRecords[fromKey];
    allRecords[toKey] = record;
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: allRecords,
      }),
    );
  } catch (err) {
    logger.error('迁移播放记录失败:', err);
    triggerGlobalError('迁移播放记录失败');
    throw err;
  }
}

/* ---------------- 搜索历史相关 API ---------------- */

/**
 * 获取搜索历史。
 * 数据库存储模式下使用混合缓存策略：优先返回缓存数据，后台异步同步最新数据。
 */