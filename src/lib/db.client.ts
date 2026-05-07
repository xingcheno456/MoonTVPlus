'use client';

export type {
  CacheData,
  Favorite,
  MusicPlayRecord,
  PlayRecord,
  UserCacheStore,
} from './db/client/types';

export { cacheManager } from './db/client/cache';

export {
  FAVORITES_KEY,
  fetchFromApi,
  fetchWithAuth,
  generateStorageKey,
  handleDatabaseOperationFailure,
  MUSIC_PLAY_RECORDS_KEY,
  PLAY_RECORDS_KEY,
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_LIMIT,
  STORAGE_TYPE,
  triggerGlobalError,
} from './db/client/utils';

export {
  getAllPlayRecords,
  getCachedPlayRecordsSnapshot,
  savePlayRecord,
  deletePlayRecord,
  migratePlayRecord,
} from './db/client/play-record';

export {
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
} from './db/client/search-history';

export {
  getAllFavorites,
  saveFavorite,
  deleteFavorite,
  isFavorited,
  clearAllFavorites,
} from './db/client/favorite';

export {
  clearUserCache,
  refreshAllCache,
  getCacheStatus,
  subscribeToDataUpdates,
  preloadUserData,
} from './db/client/cache-management';

export {
  getSkipConfig,
  saveSkipConfig,
  getAllSkipConfigs,
  deleteSkipConfig,
} from './db/client/skip-config';

export {
  getDanmakuFilterConfig,
  saveDanmakuFilterConfig,
} from './db/client/danmaku';

export {
  getAllMusicPlayRecords,
  saveMusicPlayRecord,
  deleteMusicPlayRecord,
  clearAllMusicPlayRecords,
} from './db/client/music';

export {
  getEpisodeFilterConfig,
  saveEpisodeFilterConfig,
} from './db/client/episode-filter';
