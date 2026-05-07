'use client';

import { logger } from '@/lib/logger';
import { cacheManager } from './cache';
import type { DanmakuFilterConfig } from '@/lib/types';
import {
  fetchFromApi,
  fetchWithAuth,
  STORAGE_TYPE,
  triggerGlobalError,
} from './utils';
export async function getDanmakuFilterConfig(): Promise<DanmakuFilterConfig | null> {
  // 服务器端渲染阶段直接返回空
  if (typeof window === 'undefined') {
    return null;
  }

  // 数据库存储模式：使用混合缓存策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 优先从缓存获取数据
    const cachedData = cacheManager.getCachedDanmakuFilterConfig();

    if (cachedData) {
      // 返回缓存数据，同时后台异步更新
      fetchFromApi<DanmakuFilterConfig>(`/api/danmaku-filter`)
        .then((freshData) => {
          // 只有数据真正不同时才更新缓存
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cacheDanmakuFilterConfig(freshData);
            // 触发数据更新事件
            window.dispatchEvent(
              new CustomEvent('danmakuFilterConfigUpdated', {
                detail: freshData,
              }),
            );
          }
        })
        .catch((err) => {
          logger.warn('后台同步弹幕过滤配置失败:', err);
        });

      return cachedData;
    } else {
      // 缓存为空，直接从 API 获取并缓存
      try {
        const freshData =
          await fetchFromApi<DanmakuFilterConfig>(`/api/danmaku-filter`);
        cacheManager.cacheDanmakuFilterConfig(freshData);
        return freshData;
      } catch (err) {
        logger.error('获取弹幕过滤配置失败:', err);
        return null;
      }
    }
  }

  // localStorage 模式
  try {
    const raw = localStorage.getItem('moontv_danmaku_filter_config');
    if (!raw) return null;
    return JSON.parse(raw) as DanmakuFilterConfig;
  } catch (err) {
    logger.error('读取弹幕过滤配置失败:', err);
    triggerGlobalError('读取弹幕过滤配置失败');
    return null;
  }
}

/**
 * 保存弹幕过滤配置。
 * 数据库存储模式下使用乐观更新：先更新缓存，再异步同步到数据库。
 */
export async function saveDanmakuFilterConfig(
  config: DanmakuFilterConfig,
): Promise<void> {
  // 数据库存储模式：乐观更新策略（包括 redis 和 upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新缓存
    cacheManager.cacheDanmakuFilterConfig(config);

    // 触发立即更新事件
    window.dispatchEvent(
      new CustomEvent('danmakuFilterConfigUpdated', {
        detail: config,
      }),
    );

    // 异步同步到数据库
    try {
      await fetchWithAuth('/api/danmaku-filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
    } catch (err) {
      logger.error('保存弹幕过滤配置失败:', err);
      triggerGlobalError('保存弹幕过滤配置失败');
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    logger.warn('无法在服务端保存弹幕过滤配置到 localStorage');
    return;
  }

  try {
    localStorage.setItem(
      'moontv_danmaku_filter_config',
      JSON.stringify(config),
    );
    window.dispatchEvent(
      new CustomEvent('danmakuFilterConfigUpdated', {
        detail: config,
      }),
    );
  } catch (err) {
    logger.error('保存弹幕过滤配置失败:', err);
    triggerGlobalError('保存弹幕过滤配置失败');
    throw err;
  }
}