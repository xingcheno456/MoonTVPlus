import { AdminConfig } from './admin.types';
import {
  MusicV2HistoryRecord,
  MusicV2PlaylistItem,
  MusicV2PlaylistRecord,
} from './music-v2';

// 播放记录数据结构
export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  year: string;
  index: number; // 第几集
  total_episodes: number; // 总集数
  play_time: number; // 播放进度（秒）
  total_time: number; // 总进度（秒）
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
  new_episodes?: number; // 新增的剧集数量（用于显示更新提示）
}

// 收藏数据结构
export interface Favorite {
  source_name: string;
  total_episodes: number; // 总集数
  title: string;
  year: string;
  cover: string;
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
  origin?: 'vod' | 'live';
  is_completed?: boolean; // 是否已完结
  vod_remarks?: string; // 视频备注信息
}

export interface IPlayRecordStorage {
  getPlayRecord(userName: string, key: string): Promise<PlayRecord | null>;
  setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void>;
  getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }>;
  deletePlayRecord(userName: string, key: string): Promise<void>;
  cleanupOldPlayRecords(userName: string): Promise<void>;
  migratePlayRecords(userName: string): Promise<void>;
}

export interface IFavoriteStorage {
  getFavorite(userName: string, key: string): Promise<Favorite | null>;
  setFavorite(userName: string, key: string, favorite: Favorite): Promise<void>;
  getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }>;
  deleteFavorite(userName: string, key: string): Promise<void>;
  migrateFavorites(userName: string): Promise<void>;
  getLastFavoriteCheckTime(userName: string): Promise<number>;
  setLastFavoriteCheckTime(userName: string, timestamp: number): Promise<void>;
}

export interface IUserStorage {
  verifyUser(userName: string, password: string): Promise<boolean>;
  checkUserExist(userName: string): Promise<boolean>;
  changePassword(userName: string, newPassword: string): Promise<void>;
  deleteUser(userName: string): Promise<void>;
  getAllUsers(): Promise<string[]>;
  getSearchHistory(userName: string): Promise<string[]>;
  addSearchHistory(userName: string, keyword: string): Promise<void>;
  deleteSearchHistory(userName: string, keyword?: string): Promise<void>;
}

export interface IConfigStorage {
  getAdminConfig(): Promise<AdminConfig | null>;
  setAdminConfig(config: AdminConfig): Promise<void>;
  getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null>;
  setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void>;
  deleteSkipConfig(userName: string, source: string, id: string): Promise<void>;
  getAllSkipConfigs(userName: string): Promise<{ [key: string]: SkipConfig }>;
  migrateSkipConfigs(userName: string): Promise<void>;
  getDanmakuFilterConfig(userName: string): Promise<DanmakuFilterConfig | null>;
  setDanmakuFilterConfig(
    userName: string,
    config: DanmakuFilterConfig,
  ): Promise<void>;
  deleteDanmakuFilterConfig(userName: string): Promise<void>;
  clearAllData(): Promise<void>;
  getGlobalValue(key: string): Promise<string | null>;
  setGlobalValue(key: string, value: string): Promise<void>;
  deleteGlobalValue(key: string): Promise<void>;
}

export interface INotificationStorage {
  getNotifications(userName: string): Promise<Notification[]>;
  addNotification(userName: string, notification: Notification): Promise<void>;
  markNotificationAsRead(
    userName: string,
    notificationId: string,
  ): Promise<void>;
  deleteNotification(userName: string, notificationId: string): Promise<void>;
  clearAllNotifications(userName: string): Promise<void>;
  getUnreadNotificationCount(userName: string): Promise<number>;
}

export interface IMovieRequestStorage {
  getAllMovieRequests(): Promise<MovieRequest[]>;
  getMovieRequest(requestId: string): Promise<MovieRequest | null>;
  createMovieRequest(request: MovieRequest): Promise<void>;
  updateMovieRequest(
    requestId: string,
    updates: Partial<MovieRequest>,
  ): Promise<void>;
  deleteMovieRequest(requestId: string): Promise<void>;
  getUserMovieRequests(userName: string): Promise<string[]>;
  addUserMovieRequest(userName: string, requestId: string): Promise<void>;
  removeUserMovieRequest(userName: string, requestId: string): Promise<void>;
  updateLastMovieRequestTime?(
    userName: string,
    timestamp: number,
  ): Promise<void>;
}

export interface IMusicStorage {
  getMusicPlayRecord(userName: string, key: string): Promise<any | null>;
  setMusicPlayRecord(userName: string, key: string, record: any): Promise<void>;
  batchSetMusicPlayRecords(
    userName: string,
    records: { key: string; record: any }[],
  ): Promise<void>;
  getAllMusicPlayRecords(userName: string): Promise<{ [key: string]: any }>;
  deleteMusicPlayRecord(userName: string, key: string): Promise<void>;
  clearAllMusicPlayRecords(userName: string): Promise<void>;
}

export interface IMusicV2Storage {
  listMusicV2History?(userName: string): Promise<MusicV2HistoryRecord[]>;
  upsertMusicV2History?(userName: string, record: MusicV2HistoryRecord): Promise<void>;
  batchUpsertMusicV2History?(userName: string, records: MusicV2HistoryRecord[]): Promise<void>;
  deleteMusicV2History?(userName: string, songId: string): Promise<void>;
  clearMusicV2History?(userName: string): Promise<void>;
  createMusicV2Playlist?(
    userName: string,
    playlist: { id: string; name: string; description?: string; cover?: string },
  ): Promise<void>;
  getMusicV2Playlist?(playlistId: string): Promise<MusicV2PlaylistRecord | null>;
  listMusicV2Playlists?(userName: string): Promise<MusicV2PlaylistRecord[]>;
  updateMusicV2Playlist?(
    playlistId: string,
    updates: { name?: string; description?: string; cover?: string; song_count?: number },
  ): Promise<void>;
  deleteMusicV2Playlist?(playlistId: string): Promise<void>;
  addMusicV2PlaylistItem?(playlistId: string, item: MusicV2PlaylistItem): Promise<void>;
  removeMusicV2PlaylistItem?(playlistId: string, songId: string): Promise<void>;
  listMusicV2PlaylistItems?(playlistId: string): Promise<MusicV2PlaylistItem[]>;
  hasMusicV2PlaylistItem?(playlistId: string, songId: string): Promise<boolean>;
}

export interface IMusicV1PlaylistStorage {
  createMusicPlaylist?(
    userName: string,
    playlist: { id: string; name: string; description?: string; cover?: string },
  ): Promise<void>;
  getMusicPlaylist?(playlistId: string): Promise<MusicV1Playlist | null>;
  getUserMusicPlaylists?(userName: string): Promise<MusicV1Playlist[]>;
  updateMusicPlaylist?(
    playlistId: string,
    updates: { name?: string; description?: string; cover?: string },
  ): Promise<void>;
  deleteMusicPlaylist?(playlistId: string): Promise<void>;
  addSongToPlaylist?(
    playlistId: string,
    song: {
      platform: string;
      id: string;
      name: string;
      artist: string;
      album?: string;
      pic?: string;
      duration: number;
    },
  ): Promise<void>;
  removeSongFromPlaylist?(playlistId: string, platform: string, songId: string): Promise<void>;
  getPlaylistSongs?(playlistId: string): Promise<MusicV1PlaylistSong[]>;
  isSongInPlaylist?(playlistId: string, platform: string, songId: string): Promise<boolean>;
}

export interface MusicV1Playlist {
  id: string;
  username: string;
  name: string;
  description?: string;
  cover?: string;
  song_count: number;
}

export interface MusicV1PlaylistSong {
  platform: string;
  id: string;
  name: string;
  artist: string;
  album?: string;
  pic?: string;
  duration: number;
}

export interface IUserV2Extension {
  createUserV2?(
    userName: string,
    password: string,
    role?: 'owner' | 'admin' | 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
  ): Promise<void>;
  verifyUserV2?(userName: string, password: string): Promise<boolean>;
  getUserInfoV2?(userName: string): Promise<UserV2Info | null>;
  updateUserInfoV2?(
    userName: string,
    updates: {
      role?: 'owner' | 'admin' | 'user';
      banned?: boolean;
      tags?: string[];
      oidcSub?: string;
      enabledApis?: string[];
    },
  ): Promise<void>;
  changePasswordV2?(userName: string, newPassword: string): Promise<void>;
  checkUserExistV2?(userName: string): Promise<boolean>;
  getUserByOidcSub?(oidcSub: string): Promise<string | null>;
  getUserListV2?(
    offset?: number,
    limit?: number,
    ownerUsername?: string,
  ): Promise<UserV2ListResult>;
  deleteUserV2?(userName: string): Promise<void>;
  getUsersByTag?(tagName: string): Promise<string[]>;
}

export interface UserV2Info {
  role: 'owner' | 'admin' | 'user';
  banned: boolean;
  tags?: string[];
  oidcSub?: string;
  enabledApis?: string[];
  created_at: number;
  playrecord_migrated?: boolean;
  favorite_migrated?: boolean;
  skip_migrated?: boolean;
}

export interface UserV2ListResult {
  users: Array<{
    username: string;
    role: 'owner' | 'admin' | 'user';
    banned: boolean;
    tags?: string[];
    oidcSub?: string;
    enabledApis?: string[];
    created_at: number;
  }>;
  total: number;
}

export interface ITvboxTokenStorage {
  getTvboxSubscribeToken?(userName: string): Promise<string | null>;
  setTvboxSubscribeToken?(userName: string, token: string): Promise<void>;
  getUsernameByTvboxToken?(token: string): Promise<string | null>;
}

export interface IV2UserExtension {
  getUserInfoV2?(userName: string): Promise<{
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
  getUserEmail?(userName: string): Promise<string | null>;
  setUserEmail?(userName: string, email: string): Promise<void>;
  getEmailNotificationPreference?(userName: string): Promise<boolean>;
  setEmailNotificationPreference?(
    userName: string,
    enabled: boolean,
  ): Promise<void>;
  getTvboxSubscribeToken?(userName: string): Promise<string | null>;
  setTvboxSubscribeToken?(userName: string, token: string): Promise<void>;
  getUsernameByTvboxToken?(token: string): Promise<string | null>;
}

export type IStorage = IPlayRecordStorage &
  IFavoriteStorage &
  IUserStorage &
  IConfigStorage &
  INotificationStorage &
  IMovieRequestStorage &
  IMusicStorage &
  IV2UserExtension &
  IMusicV2Storage &
  IMusicV1PlaylistStorage &
  IUserV2Extension &
  ITvboxTokenStorage;

// 搜索结果数据结构
export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  episodes_titles: string[];
  source: string;
  source_name: string;
  weight?: number; // 播放源权重（来自后台配置，用于排序和优选评分）
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
  vod_remarks?: string; // 视频备注信息（如"全80集"、"更新至25集"等）
  vod_total?: number; // 总集数
  proxyMode?: boolean; // 代理模式：启用后由服务器代理m3u8和ts分片
  subtitles?: Array<Array<{ label: string; url: string }>>; // 字幕列表（按集数索引）
  tmdb_id?: number; // TMDB ID
  rating?: number; // 评分
  initialEpisodeIndex?: number; // 初始集数索引（用于小雅源从文件点击进入时指定集数）
  metadataSource?: 'folder' | 'nfo' | 'tmdb' | 'file'; // 元数据来源（用于小雅源判断是否保留fileName）
}

// 豆瓣数据结构
export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
}

export interface DoubanResult {
  code: number;
  message: string;
  list: DoubanItem[];
}

// 跳过片头片尾配置数据结构
export interface SkipConfig {
  enable: boolean; // 是否启用跳过片头片尾
  intro_time: number; // 片头时间（秒）
  outro_time: number; // 片尾时间（秒）
}

// 弹幕过滤规则数据结构
export interface DanmakuFilterRule {
  keyword: string; // 关键字
  type: 'normal' | 'regex'; // 普通模式或正则模式
  enabled: boolean; // 是否启用
  id?: string; // 规则ID（用于前端管理）
}

// 弹幕过滤配置数据结构
export interface DanmakuFilterConfig {
  rules: DanmakuFilterRule[]; // 过滤规则列表
}

// 集数过滤规则数据结构
export interface EpisodeFilterRule {
  keyword: string; // 关键字
  type: 'normal' | 'regex'; // 普通模式或正则模式
  enabled: boolean; // 是否启用
  id?: string; // 规则ID（用于前端管理）
}

// 集数过滤配置数据结构
export interface EpisodeFilterConfig {
  rules: EpisodeFilterRule[]; // 过滤规则列表
  reverseMode?: boolean; // 反向模式：开启后仅显示符合规则的集数
}

// 通知类型枚举
export type NotificationType =
  | 'favorite_update' // 收藏更新
  | 'system' // 系统通知
  | 'announcement' // 公告
  | 'movie_request' // 新求片通知（给管理员）
  | 'request_fulfilled' // 求片已上架通知（给求片用户）
  | 'anime_subscription_update'; // 追番订阅更新

// 通知数据结构
export interface Notification {
  id: string; // 通知ID
  type: NotificationType; // 通知类型
  title: string; // 通知标题
  message: string; // 通知内容
  timestamp: number; // 通知时间戳
  read: boolean; // 是否已读
  metadata?: Record<string, any>; // 额外的元数据（如收藏更新的source、id等）
}

// 收藏更新检查结果
export interface FavoriteUpdateCheck {
  last_check_time: number; // 上次检查时间戳
  updates: Array<{
    source: string;
    id: string;
    title: string;
    old_episodes: number;
    new_episodes: number;
  }>;
}

// 求片请求数据结构
export interface MovieRequest {
  id: string;
  tmdbId?: number;
  title: string;
  year?: string;
  mediaType: 'movie' | 'tv';
  season?: number; // 季度（仅剧集）
  poster?: string;
  overview?: string;
  requestedBy: string[];
  requestCount: number;
  status: 'pending' | 'fulfilled';
  createdAt: number;
  updatedAt: number;
  fulfilledAt?: number;
  fulfilledSource?: string;
  fulfilledId?: string;
}
