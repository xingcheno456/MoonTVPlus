'use client';

import { logger } from '@/lib/logger';
import { cacheManager } from './cache';
import type { MusicPlayRecord } from './types';
import {
  fetchFromApi,
  fetchWithAuth,
  generateStorageKey,
  MUSIC_PLAY_RECORDS_KEY,
  STORAGE_TYPE,
  triggerGlobalError,
} from './utils';
export async function getAllMusicPlayRecords(): Promise<
  Record<string, MusicPlayRecord>
> {
  // 服务器端渲染阶段直接返回空
  if (typeof window === 'undefined') {
    return {};
  }

  // 数据库存储模式：使用混合缓存策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 优先从缓存获取数据
    const cachedData = cacheManager.getCachedMusicPlayRecords();

    if (cachedData) {
      // 返回缓存数据，同时后台异步更新
      fetchFromApi<Record<string, MusicPlayRecord>>(`/api/music/playrecords`)
        .then((freshData) => {
          // 只有数据真正不同时才更新缓存
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cacheMusicPlayRecords(freshData);
            // 触发数据更新事件
            window.dispatchEvent(
              new CustomEvent('musicPlayRecordsUpdated', {
                detail: freshData,
              }),
            );
          }
        })
        .catch((err) => {
          logger.warn('后台同步音乐播放记录失败:', err);
          triggerGlobalError('后台同步音乐播放记录失败');
        });

      return cachedData;
    } else {
      // 缓存为空，直接从 API 获取并缓存
      try {
        const freshData = await fetchFromApi<Record<string, MusicPlayRecord>>(
          `/api/music/playrecords`,
        );
        cacheManager.cacheMusicPlayRecords(freshData);
        return freshData;
      } catch (err) {
        logger.error('获取音乐播放记录失败:', err);
        triggerGlobalError('获取音乐播放记录失败');
        return {};
      }
    }
  }

  // localstorage 模式
  try {
    const raw = localStorage.getItem(MUSIC_PLAY_RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MusicPlayRecord>;
  } catch (err) {
    logger.error('读取音乐播放记录失败:', err);
    triggerGlobalError('读取音乐播放记录失败');
    return {};
  }
}

/**
 * 保存音乐播放记录。
 * 数据库存储模式下使用乐观更新：先更新缓存（立即生效），再异步同步到数据库。
 */
export async function saveMusicPlayRecord(
  platform: string,
  id: string,
  record: MusicPlayRecord,
): Promise<void> {
  const key = generateStorageKey(platform, id);

  // 数据库存储模式：乐观更新策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新缓存
    const cachedRecords = cacheManager.getCachedMusicPlayRecords() || {};
    cachedRecords[key] = record;
    cacheManager.cacheMusicPlayRecords(cachedRecords);

    // 触发立即更新事件
    window.dispatchEvent(
      new CustomEvent('musicPlayRecordsUpdated', {
        detail: cachedRecords,
      }),
    );

    // 异步同步到数据库
    try {
      await fetchWithAuth('/api/music/playrecords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, record }),
      });
    } catch (err) {
      logger.error('保存音乐播放记录失败:', err);
      triggerGlobalError('保存音乐播放记录失败');
      throw err;
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    logger.warn('无法在服务端保存音乐播放记录到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllMusicPlayRecords();
    allRecords[key] = record;
    localStorage.setItem(MUSIC_PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('musicPlayRecordsUpdated', {
        detail: allRecords,
      }),
    );
  } catch (err) {
    logger.error('保存音乐播放记录失败:', err);
    triggerGlobalError('保存音乐播放记录失败');
    throw err;
  }
}

/**
 * 删除音乐播放记录。
 * 数据库存储模式下使用乐观更新：先更新缓存，再异步同步到数据库。
 */
export async function deleteMusicPlayRecord(
  platform: string,
  id: string,
): Promise<void> {
  const key = generateStorageKey(platform, id);

  // 数据库存储模式：乐观更新策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新缓存
    const cachedRecords = cacheManager.getCachedMusicPlayRecords() || {};
    delete cachedRecords[key];
    cacheManager.cacheMusicPlayRecords(cachedRecords);

    // 触发立即更新事件
    window.dispatchEvent(
      new CustomEvent('musicPlayRecordsUpdated', {
        detail: cachedRecords,
      }),
    );

    // 异步同步到数据库
    try {
      await fetchWithAuth(
        `/api/music/playrecords?key=${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
        },
      );
    } catch (err) {
      logger.error('删除音乐播放记录失败:', err);
      triggerGlobalError('删除音乐播放记录失败');
      throw err;
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    logger.warn('无法在服务端删除音乐播放记录到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllMusicPlayRecords();
    delete allRecords[key];
    localStorage.setItem(MUSIC_PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('musicPlayRecordsUpdated', {
        detail: allRecords,
      }),
    );
  } catch (err) {
    logger.error('删除音乐播放记录失败:', err);
    triggerGlobalError('删除音乐播放记录失败');
    throw err;
  }
}

/**
 * 清空全部音乐播放记录
 * 数据库存储模式下使用乐观更新：先更新缓存，再异步同步到数据库。
 */
export async function clearAllMusicPlayRecords(): Promise<void> {
  // 数据库存储模式：乐观更新策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新缓存
    cacheManager.cacheMusicPlayRecords({});

    // 触发立即更新事件
    window.dispatchEvent(
      new CustomEvent('musicPlayRecordsUpdated', {
        detail: {},
      }),
    );

    // 异步同步到数据库
    try {
      await fetchWithAuth(`/api/music/playrecords`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      logger.error('清空音乐播放记录失败:', err);
      triggerGlobalError('清空音乐播放记录失败');
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MUSIC_PLAY_RECORDS_KEY);
  window.dispatchEvent(
    new CustomEvent('musicPlayRecordsUpdated', {
      detail: {},
    }),
  );
}