export type {
  StorageType,
  IPlayRecordRepository,
  IFavoriteRepository,
  ISearchHistoryRepository,
  ISkipConfigRepository,
  IDanmakuFilterRepository,
  IUserRepository,
  ITvboxTokenRepository,
  IConfigRepository,
  IMusicRepository,
  INotificationRepository,
  IMovieRequestRepository,
  IRepositories,
} from './types';

export { generateStorageKey } from './server-repository';

export {
  buildServerRepositories,
  getRepositories,
  getStorageType,
  isLocalStorageMode,
  resetRepositories,
} from './repository-factory';

export { createClientRepositories } from './hybrid-repository';