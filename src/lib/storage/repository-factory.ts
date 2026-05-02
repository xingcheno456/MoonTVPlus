import { STORAGE_TYPE, getStorage, type StorageType as LegacyStorageType } from '../db';
import { logger } from '../logger';
import type { IRepositories } from './types';
import {
  ServerPlayRecordRepository,
  ServerFavoriteRepository,
  ServerSearchHistoryRepository,
  ServerSkipConfigRepository,
  ServerDanmakuFilterRepository,
  ServerUserRepository,
  ServerTvboxTokenRepository,
  ServerConfigRepository,
  ServerMusicRepository,
  ServerNotificationRepository,
  ServerMovieRequestRepository,
} from './server-repository';

let repositoriesInstance: IRepositories | null = null;

export function buildServerRepositories(): IRepositories {
  const storage = getStorage();

  return {
    playRecords: new ServerPlayRecordRepository(storage),
    favorites: new ServerFavoriteRepository(storage),
    searchHistory: new ServerSearchHistoryRepository(storage),
    skipConfigs: new ServerSkipConfigRepository(storage),
    danmakuFilters: new ServerDanmakuFilterRepository(storage),
    users: new ServerUserRepository(storage),
    tvboxTokens: new ServerTvboxTokenRepository(storage),
    config: new ServerConfigRepository(storage),
    music: new ServerMusicRepository(storage),
    notifications: new ServerNotificationRepository(storage),
    movieRequests: new ServerMovieRequestRepository(storage),
  };
}

export function getRepositories(): IRepositories {
  if (STORAGE_TYPE === 'localstorage') {
    throw new Error(
      'LocalStorage mode should use client-side storage only. ' +
      'Use getClientRepositories() or call repositories from the browser context. ' +
      'Server-side operations require a database backend (redis/upstash/kvrocks/d1/postgres).',
    );
  }

  if (!repositoriesInstance) {
    repositoriesInstance = buildServerRepositories();
    logger.info(`Repositories initialized for storage type: ${STORAGE_TYPE}`);
  }

  return repositoriesInstance;
}

export function getStorageType(): LegacyStorageType {
  return STORAGE_TYPE;
}

export function isLocalStorageMode(): boolean {
  return STORAGE_TYPE === 'localstorage';
}

export function resetRepositories(): void {
  repositoriesInstance = null;
}