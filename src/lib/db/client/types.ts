import type { DanmakuFilterConfig, SkipConfig } from '@/lib/types';

'use client';

export interface PlayRecord {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  index: number;
  total_episodes: number;
  play_time: number;
  total_time: number;
  save_time: number;
  search_title?: string;
  origin?: 'vod' | 'live';
  new_episodes?: number;
}

export interface Favorite {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  total_episodes: number;
  save_time: number;
  search_title?: string;
  origin?: 'vod' | 'live';
  is_completed?: boolean;
  vod_remarks?: string;
}

export interface MusicPlayRecord {
  platform: 'netease' | 'qq' | 'kuwo';
  id: string;
  name: string;
  artist: string;
  album?: string;
  pic?: string;
  play_time: number;
  duration: number;
  save_time: number;
}

export interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

export interface UserCacheStore {
  playRecords?: CacheData<Record<string, PlayRecord>>;
  favorites?: CacheData<Record<string, Favorite>>;
  searchHistory?: CacheData<string[]>;
  skipConfigs?: CacheData<Record<string, SkipConfig>>;
  danmakuFilterConfig?: CacheData<DanmakuFilterConfig>;
  musicPlayRecords?: CacheData<Record<string, MusicPlayRecord>>;
}