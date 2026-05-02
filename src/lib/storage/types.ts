import type { AdminConfig } from '../admin.types';
import type {
  DanmakuFilterConfig,
  Favorite,
  MovieRequest,
  Notification,
  PlayRecord,
  SkipConfig,
  UserV2Info,
  UserV2ListResult,
  NotificationType,
} from '../types';

import type {
  MusicV2HistoryRecord,
  MusicV2PlaylistItem,
  MusicV2PlaylistRecord,
} from '../music-v2';

export type StorageType =
  | 'localstorage'
  | 'redis'
  | 'upstash'
  | 'kvrocks'
  | 'd1'
  | 'postgres';

export interface IPlayRecordRepository {
  get(userName: string, source: string, id: string): Promise<PlayRecord | null>;
  save(userName: string, source: string, id: string, record: PlayRecord): Promise<void>;
  getAll(userName: string): Promise<Record<string, PlayRecord>>;
  delete(userName: string, source: string, id: string): Promise<void>;
  cleanupOld(userName: string): Promise<void>;
  migrate(userName: string): Promise<void>;
}

export interface IFavoriteRepository {
  get(userName: string, source: string, id: string): Promise<Favorite | null>;
  save(userName: string, source: string, id: string, favorite: Favorite): Promise<void>;
  getAll(userName: string): Promise<Record<string, Favorite>>;
  delete(userName: string, source: string, id: string): Promise<void>;
  isFavorited(userName: string, source: string, id: string): Promise<boolean>;
  getLastCheckTime(userName: string): Promise<number>;
  setLastCheckTime(userName: string, timestamp: number): Promise<void>;
  migrate(userName: string): Promise<void>;
}

export interface ISearchHistoryRepository {
  get(userName: string): Promise<string[]>;
  add(userName: string, keyword: string): Promise<void>;
  delete(userName: string, keyword?: string): Promise<void>;
}

export interface ISkipConfigRepository {
  get(userName: string, source: string, id: string): Promise<SkipConfig | null>;
  set(userName: string, source: string, id: string, config: SkipConfig): Promise<void>;
  delete(userName: string, source: string, id: string): Promise<void>;
  getAll(userName: string): Promise<Record<string, SkipConfig>>;
  migrate(userName: string): Promise<void>;
}

export interface IDanmakuFilterRepository {
  get(userName: string): Promise<DanmakuFilterConfig | null>;
  set(userName: string, config: DanmakuFilterConfig): Promise<void>;
  delete(userName: string): Promise<void>;
}

export interface IUserRepository {
  verify(userName: string, password: string): Promise<boolean>;
  checkExists(userName: string): Promise<boolean>;
  changePassword(userName: string, newPassword: string): Promise<void>;
  delete(userName: string): Promise<void>;
  getAllUsers(): Promise<string[]>;

  createV2(
    userName: string,
    password: string,
    role?: 'owner' | 'admin' | 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
  ): Promise<void>;
  verifyV2(userName: string, password: string): Promise<boolean>;
  getInfoV2(userName: string): Promise<UserV2Info | null>;
  updateInfoV2(
    userName: string,
    updates: {
      role?: 'owner' | 'admin' | 'user';
      banned?: boolean;
      tags?: string[];
      oidcSub?: string;
      enabledApis?: string[];
    },
  ): Promise<void>;
  changePasswordV2(userName: string, newPassword: string): Promise<void>;
  checkExistsV2(userName: string): Promise<boolean>;
  getByOidcSub(oidcSub: string): Promise<string | null>;
  getListV2(
    offset?: number,
    limit?: number,
    ownerUsername?: string,
  ): Promise<UserV2ListResult>;
  deleteV2(userName: string): Promise<void>;
  getByTag(tagName: string): Promise<string[]>;
  getExtendedInfoV2(userName: string): Promise<{
    role: 'owner' | 'admin' | 'user';
    banned: boolean;
    tags?: string[];
    oidcSub?: string;
    enabledApis?: string[];
    created_at: number;
    playrecord_migrated?: boolean;
    favorite_migrated?: boolean;
    skip_migrated?: boolean;
    last_movie_request_time?: number;
    email?: string;
    emailNotifications?: boolean;
  } | null>;
  getEmail(userName: string): Promise<string | null>;
  setEmail(userName: string, email: string): Promise<void>;
  getEmailNotificationPreference(userName: string): Promise<boolean>;
  setEmailNotificationPreference(userName: string, enabled: boolean): Promise<void>;
  migrateFromConfig(adminConfig: AdminConfig): Promise<void>;
}

export interface ITvboxTokenRepository {
  getToken(userName: string): Promise<string | null>;
  setToken(userName: string, token: string): Promise<void>;
  getUsernameByToken(token: string): Promise<string | null>;
}

export interface IConfigRepository {
  getAdminConfig(): Promise<AdminConfig | null>;
  saveAdminConfig(config: AdminConfig): Promise<void>;
  getGlobalValue(key: string): Promise<string | null>;
  setGlobalValue(key: string, value: string): Promise<void>;
  deleteGlobalValue(key: string): Promise<void>;
  clearAllData(): Promise<void>;
}

export interface IMusicRepository {
  getPlayRecord(userName: string, platform: string, id: string): Promise<any | null>;
  savePlayRecord(userName: string, platform: string, id: string, record: any): Promise<void>;
  batchSavePlayRecords(userName: string, records: Array<{ platform: string; id: string; record: any }>): Promise<void>;
  getAllPlayRecords(userName: string): Promise<Record<string, any>>;
  deletePlayRecord(userName: string, platform: string, id: string): Promise<void>;
  clearAllPlayRecords(userName: string): Promise<void>;

  listV2History(userName: string): Promise<MusicV2HistoryRecord[]>;
  upsertV2History(userName: string, record: MusicV2HistoryRecord): Promise<void>;
  batchUpsertV2History(userName: string, records: MusicV2HistoryRecord[]): Promise<void>;
  deleteV2History(userName: string, songId: string): Promise<void>;
  clearV2History(userName: string): Promise<void>;

  createV2Playlist(userName: string, playlist: { id: string; name: string; description?: string; cover?: string }): Promise<void>;
  getV2Playlist(playlistId: string): Promise<MusicV2PlaylistRecord | null>;
  listV2Playlists(userName: string): Promise<MusicV2PlaylistRecord[]>;
  updateV2Playlist(playlistId: string, updates: { name?: string; description?: string; cover?: string; song_count?: number }): Promise<void>;
  deleteV2Playlist(playlistId: string): Promise<void>;
  addV2PlaylistItem(playlistId: string, item: MusicV2PlaylistItem): Promise<void>;
  removeV2PlaylistItem(playlistId: string, songId: string): Promise<void>;
  listV2PlaylistItems(playlistId: string): Promise<MusicV2PlaylistItem[]>;
  hasV2PlaylistItem(playlistId: string, songId: string): Promise<boolean>;

  createV1Playlist(userName: string, playlist: { id: string; name: string; description?: string; cover?: string }): Promise<void>;
  getV1Playlist(playlistId: string): Promise<any | null>;
  listV1Playlists(userName: string): Promise<any[]>;
  updateV1Playlist(playlistId: string, updates: { name?: string; description?: string; cover?: string }): Promise<void>;
  deleteV1Playlist(playlistId: string): Promise<void>;
  addV1PlaylistSong(playlistId: string, song: { platform: string; id: string; name: string; artist: string; album?: string; pic?: string; duration: number }): Promise<void>;
  removeV1PlaylistSong(playlistId: string, platform: string, songId: string): Promise<void>;
  listV1PlaylistSongs(playlistId: string): Promise<any[]>;
  isSongInV1Playlist(playlistId: string, platform: string, songId: string): Promise<boolean>;
}

export interface INotificationRepository {
  getAll(userName: string): Promise<Notification[]>;
  add(userName: string, notification: Notification): Promise<void>;
  markAsRead(userName: string, notificationId: string): Promise<void>;
  delete(userName: string, notificationId: string): Promise<void>;
  clearAll(userName: string): Promise<void>;
  getUnreadCount(userName: string): Promise<number>;
}

export interface IMovieRequestRepository {
  getAll(): Promise<MovieRequest[]>;
  get(requestId: string): Promise<MovieRequest | null>;
  create(request: MovieRequest): Promise<void>;
  update(requestId: string, updates: Partial<MovieRequest>): Promise<void>;
  delete(requestId: string): Promise<void>;
  getUserRequests(userName: string): Promise<string[]>;
  addUserRequest(userName: string, requestId: string): Promise<void>;
  removeUserRequest(userName: string, requestId: string): Promise<void>;
  updateLastRequestTime(userName: string, timestamp: number): Promise<void>;
}

export interface IRepositories {
  playRecords: IPlayRecordRepository;
  favorites: IFavoriteRepository;
  searchHistory: ISearchHistoryRepository;
  skipConfigs: ISkipConfigRepository;
  danmakuFilters: IDanmakuFilterRepository;
  users: IUserRepository;
  tvboxTokens: ITvboxTokenRepository;
  config: IConfigRepository;
  music: IMusicRepository;
  notifications: INotificationRepository;
  movieRequests: IMovieRequestRepository;
}