'use client';

import { logger } from '@/lib/logger';
import type { EpisodeFilterConfig } from '@/lib/types';
import {
  STORAGE_TYPE,
  triggerGlobalError,
} from './utils';
export async function getEpisodeFilterConfig(): Promise<EpisodeFilterConfig | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem('moontv_episode_filter_config');
    if (!raw) return null;
    return normalizeEpisodeFilterConfig(JSON.parse(raw) as EpisodeFilterConfig);
  } catch (err) {
    logger.error('读取集数过滤配置失败:', err);
    return null;
  }
}

/**
 * 保存集数过滤配置（纯 localStorage 存储）
 */
export async function saveEpisodeFilterConfig(
  config: EpisodeFilterConfig,
): Promise<void> {
  if (typeof window === 'undefined') {
    logger.warn('无法在服务端保存集数过滤配置');
    return;
  }

  try {
    const normalizedConfig = normalizeEpisodeFilterConfig(config);
    localStorage.setItem(
      'moontv_episode_filter_config',
      JSON.stringify(normalizedConfig),
    );
    window.dispatchEvent(
      new CustomEvent('episodeFilterConfigUpdated', {
        detail: normalizedConfig,
      }),
    );
  } catch (err) {
    logger.error('保存集数过滤配置失败:', err);
    throw err;
  }
}