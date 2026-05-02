import type { AdminConfig } from '../admin.types';
import type {
  MusicV2HistoryRecord,
  MusicV2PlaylistItem,
  MusicV2PlaylistRecord,
} from '../music-v2';
import type {
  DanmakuFilterConfig,
  Favorite,
  IStorage,
  MovieRequest,
  Notification,
  PlayRecord,
  SkipConfig,
  UserV2Info,
  UserV2ListResult,
} from '../types';
import { logger } from '../logger';
import type {
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
} from './types';

export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

export class ServerPlayRecordRepository implements IPlayRecordRepository {
  constructor(private storage: IStorage) {}

  async get(userName: string, source: string, id: string): Promise<PlayRecord | null> {
    return this.storage.getPlayRecord(userName, generateStorageKey(source, id));
  }

  async save(userName: string, source: string, id: string, record: PlayRecord): Promise<void> {
    await this.storage.setPlayRecord(userName, generateStorageKey(source, id), record);
  }

  async getAll(userName: string): Promise<Record<string, PlayRecord>> {
    return this.storage.getAllPlayRecords(userName);
  }

  async delete(userName: string, source: string, id: string): Promise<void> {
    await this.storage.deletePlayRecord(userName, generateStorageKey(source, id));
  }

  async cleanupOld(userName: string): Promise<void> {
    await this.storage.cleanupOldPlayRecords(userName);
  }

  async migrate(userName: string): Promise<void> {
    await this.storage.migratePlayRecords(userName);
  }
}

export class ServerFavoriteRepository implements IFavoriteRepository {
  constructor(private storage: IStorage) {}

  async get(userName: string, source: string, id: string): Promise<Favorite | null> {
    return this.storage.getFavorite(userName, generateStorageKey(source, id));
  }

  async save(userName: string, source: string, id: string, favorite: Favorite): Promise<void> {
    await this.storage.setFavorite(userName, generateStorageKey(source, id), favorite);
  }

  async getAll(userName: string): Promise<Record<string, Favorite>> {
    return this.storage.getAllFavorites(userName);
  }

  async delete(userName: string, source: string, id: string): Promise<void> {
    await this.storage.deleteFavorite(userName, generateStorageKey(source, id));
  }

  async isFavorited(userName: string, source: string, id: string): Promise<boolean> {
    const fav = await this.get(userName, source, id);
    return fav !== null;
  }

  async getLastCheckTime(userName: string): Promise<number> {
    return this.storage.getLastFavoriteCheckTime(userName);
  }

  async setLastCheckTime(userName: string, timestamp: number): Promise<void> {
    await this.storage.setLastFavoriteCheckTime(userName, timestamp);
  }

  async migrate(userName: string): Promise<void> {
    await this.storage.migrateFavorites(userName);
  }
}

export class ServerSearchHistoryRepository implements ISearchHistoryRepository {
  constructor(private storage: IStorage) {}

  async get(userName: string): Promise<string[]> {
    return this.storage.getSearchHistory(userName);
  }

  async add(userName: string, keyword: string): Promise<void> {
    await this.storage.addSearchHistory(userName, keyword);
  }

  async delete(userName: string, keyword?: string): Promise<void> {
    await this.storage.deleteSearchHistory(userName, keyword);
  }
}

export class ServerSkipConfigRepository implements ISkipConfigRepository {
  constructor(private storage: IStorage) {}

  async get(userName: string, source: string, id: string): Promise<SkipConfig | null> {
    return this.storage.getSkipConfig?.(userName, source, id) ?? null;
  }

  async set(userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    await this.storage.setSkipConfig?.(userName, source, id, config);
  }

  async delete(userName: string, source: string, id: string): Promise<void> {
    await this.storage.deleteSkipConfig?.(userName, source, id);
  }

  async getAll(userName: string): Promise<Record<string, SkipConfig>> {
    return this.storage.getAllSkipConfigs?.(userName) ?? {};
  }

  async migrate(userName: string): Promise<void> {
    await this.storage.migrateSkipConfigs(userName);
  }
}

export class ServerDanmakuFilterRepository implements IDanmakuFilterRepository {
  constructor(private storage: IStorage) {}

  async get(userName: string): Promise<DanmakuFilterConfig | null> {
    return this.storage.getDanmakuFilterConfig?.(userName) ?? null;
  }

  async set(userName: string, config: DanmakuFilterConfig): Promise<void> {
    await this.storage.setDanmakuFilterConfig?.(userName, config);
  }

  async delete(userName: string): Promise<void> {
    await this.storage.deleteDanmakuFilterConfig?.(userName);
  }
}

export class ServerUserRepository implements IUserRepository {
  constructor(private storage: IStorage) {}

  async verify(userName: string, password: string): Promise<boolean> {
    return this.storage.verifyUser(userName, password);
  }

  async checkExists(userName: string): Promise<boolean> {
    return this.storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    await this.storage.changePassword(userName, newPassword);
  }

  async delete(userName: string): Promise<void> {
    await this.storage.deleteUser(userName);
  }

  async getAllUsers(): Promise<string[]> {
    return this.storage.getAllUsers?.() ?? [];
  }

  async createV2(
    userName: string,
    password: string,
    role: 'owner' | 'admin' | 'user' = 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
  ): Promise<void> {
    await this.storage.createUserV2?.(userName, password, role, tags, oidcSub, enabledApis);
  }

  async verifyV2(userName: string, password: string): Promise<boolean> {
    return this.storage.verifyUserV2?.(userName, password) ?? false;
  }

  async getInfoV2(userName: string): Promise<UserV2Info | null> {
    return this.storage.getUserInfoV2?.(userName) ?? null;
  }

  async updateInfoV2(
    userName: string,
    updates: {
      role?: 'owner' | 'admin' | 'user';
      banned?: boolean;
      tags?: string[];
      oidcSub?: string;
      enabledApis?: string[];
    },
  ): Promise<void> {
    await this.storage.updateUserInfoV2?.(userName, updates);
  }

  async changePasswordV2(userName: string, newPassword: string): Promise<void> {
    await this.storage.changePasswordV2?.(userName, newPassword);
  }

  async checkExistsV2(userName: string): Promise<boolean> {
    return this.storage.checkUserExistV2?.(userName) ?? false;
  }

  async getByOidcSub(oidcSub: string): Promise<string | null> {
    return this.storage.getUserByOidcSub?.(oidcSub) ?? null;
  }

  async getListV2(
    offset = 0,
    limit = 20,
    ownerUsername?: string,
  ): Promise<UserV2ListResult> {
    return this.storage.getUserListV2?.(offset, limit, ownerUsername) ?? { users: [], total: 0 };
  }

  async deleteV2(userName: string): Promise<void> {
    await this.storage.deleteUserV2?.(userName);
  }

  async getByTag(tagName: string): Promise<string[]> {
    return this.storage.getUsersByTag?.(tagName) ?? [];
  }

  async getExtendedInfoV2(userName: string): Promise<{
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
  } | null> {
    return (this.storage as any).getUserInfoV2?.(userName) ?? null;
  }

  async getEmail(userName: string): Promise<string | null> {
    return this.storage.getUserEmail?.(userName) ?? null;
  }

  async setEmail(userName: string, email: string): Promise<void> {
    await this.storage.setUserEmail?.(userName, email);
  }

  async getEmailNotificationPreference(userName: string): Promise<boolean> {
    return this.storage.getEmailNotificationPreference?.(userName) ?? false;
  }

  async setEmailNotificationPreference(userName: string, enabled: boolean): Promise<void> {
    await this.storage.setEmailNotificationPreference?.(userName, enabled);
  }

  async migrateFromConfig(adminConfig: AdminConfig): Promise<void> {
    if (typeof this.storage.createUserV2 !== 'function') {
      throw new Error('Current storage type does not support V2 user storage');
    }

    const users = adminConfig.UserConfig?.Users;
    if (!users || users.length === 0) return;

    logger.info(`Starting migration of ${users.length} users...`);

    for (const user of users) {
      try {
        if (user.username === process.env.USERNAME) {
          logger.info(`Skipping owner ${user.username}`);
          continue;
        }

        const exists = await this.checkExistsV2(user.username);
        if (exists) {
          logger.info(`User ${user.username} already exists, skipping`);
          continue;
        }

        let password = '';

        if ('oidcSub' in user && user.oidcSub) {
          password = crypto.randomUUID();
          logger.info(`User ${user.username} (OIDC) using random password`);
        } else {
          try {
            const adapter = (this.storage as unknown as Record<string, unknown>).adapter as Record<string, unknown> | undefined;
            if (adapter && typeof adapter.get === 'function') {
              const storedPassword = await (adapter.get as (key: string) => Promise<string | null>)(
                `u:${user.username}:pwd`,
              );
              if (storedPassword) {
                password = storedPassword;
              } else {
                password = 'defaultPassword123';
              }
            } else {
              password = 'defaultPassword123';
            }
          } catch {
            password = 'defaultPassword123';
          }
        }

        const migratedRole = user.role === 'owner' ? 'user' : user.role;
        await this.createV2(user.username, password, migratedRole, user.tags, user.oidcSub, user.enabledApis);

        if (user.banned) {
          await this.updateInfoV2(user.username, { banned: true });
        }

        logger.info(`User ${user.username} migrated successfully`);
      } catch (err) {
        logger.error(`Failed to migrate user ${user.username}:`, err);
      }
    }

    logger.info('User migration completed');
  }
}

export class ServerTvboxTokenRepository implements ITvboxTokenRepository {
  constructor(private storage: IStorage) {}

  async getToken(userName: string): Promise<string | null> {
    return this.storage.getTvboxSubscribeToken?.(userName) ?? null;
  }

  async setToken(userName: string, token: string): Promise<void> {
    await this.storage.setTvboxSubscribeToken?.(userName, token);
  }

  async getUsernameByToken(token: string): Promise<string | null> {
    return this.storage.getUsernameByTvboxToken?.(token) ?? null;
  }
}

export class ServerConfigRepository implements IConfigRepository {
  constructor(private storage: IStorage) {}

  async getAdminConfig(): Promise<AdminConfig | null> {
    return this.storage.getAdminConfig?.() ?? null;
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    await this.storage.setAdminConfig?.(config);
  }

  async getGlobalValue(key: string): Promise<string | null> {
    return this.storage.getGlobalValue?.(key) ?? null;
  }

  async setGlobalValue(key: string, value: string): Promise<void> {
    await this.storage.setGlobalValue?.(key, value);
  }

  async deleteGlobalValue(key: string): Promise<void> {
    await this.storage.deleteGlobalValue?.(key);
  }

  async clearAllData(): Promise<void> {
    if (typeof this.storage.clearAllData === 'function') {
      await this.storage.clearAllData();
    } else {
      throw new Error('Storage does not support clearAllData');
    }
  }
}

export class ServerMusicRepository implements IMusicRepository {
  constructor(private storage: IStorage) {}

  async getPlayRecord(userName: string, platform: string, id: string): Promise<any | null> {
    return this.storage.getMusicPlayRecord(userName, generateStorageKey(platform, id));
  }

  async savePlayRecord(userName: string, platform: string, id: string, record: any): Promise<void> {
    await this.storage.setMusicPlayRecord(userName, generateStorageKey(platform, id), record);
  }

  async batchSavePlayRecords(
    userName: string,
    records: Array<{ platform: string; id: string; record: any }>,
  ): Promise<void> {
    const batch = records.map(({ platform, id, record }) => ({
      key: generateStorageKey(platform, id),
      record,
    }));
    await this.storage.batchSetMusicPlayRecords(userName, batch);
  }

  async getAllPlayRecords(userName: string): Promise<Record<string, any>> {
    return this.storage.getAllMusicPlayRecords(userName);
  }

  async deletePlayRecord(userName: string, platform: string, id: string): Promise<void> {
    await this.storage.deleteMusicPlayRecord(userName, generateStorageKey(platform, id));
  }

  async clearAllPlayRecords(userName: string): Promise<void> {
    await this.storage.clearAllMusicPlayRecords(userName);
  }

  async listV2History(userName: string): Promise<MusicV2HistoryRecord[]> {
    return this.storage.listMusicV2History?.(userName) ?? [];
  }

  async upsertV2History(userName: string, record: MusicV2HistoryRecord): Promise<void> {
    await this.storage.upsertMusicV2History?.(userName, record);
  }

  async batchUpsertV2History(userName: string, records: MusicV2HistoryRecord[]): Promise<void> {
    await this.storage.batchUpsertMusicV2History?.(userName, records);
  }

  async deleteV2History(userName: string, songId: string): Promise<void> {
    await this.storage.deleteMusicV2History?.(userName, songId);
  }

  async clearV2History(userName: string): Promise<void> {
    await this.storage.clearMusicV2History?.(userName);
  }

  async createV2Playlist(userName: string, playlist: { id: string; name: string; description?: string; cover?: string }): Promise<void> {
    await this.storage.createMusicV2Playlist?.(userName, playlist);
  }

  async getV2Playlist(playlistId: string): Promise<MusicV2PlaylistRecord | null> {
    return this.storage.getMusicV2Playlist?.(playlistId) ?? null;
  }

  async listV2Playlists(userName: string): Promise<MusicV2PlaylistRecord[]> {
    return this.storage.listMusicV2Playlists?.(userName) ?? [];
  }

  async updateV2Playlist(playlistId: string, updates: { name?: string; description?: string; cover?: string; song_count?: number }): Promise<void> {
    await this.storage.updateMusicV2Playlist?.(playlistId, updates);
  }

  async deleteV2Playlist(playlistId: string): Promise<void> {
    await this.storage.deleteMusicV2Playlist?.(playlistId);
  }

  async addV2PlaylistItem(playlistId: string, item: MusicV2PlaylistItem): Promise<void> {
    await this.storage.addMusicV2PlaylistItem?.(playlistId, item);
  }

  async removeV2PlaylistItem(playlistId: string, songId: string): Promise<void> {
    await this.storage.removeMusicV2PlaylistItem?.(playlistId, songId);
  }

  async listV2PlaylistItems(playlistId: string): Promise<MusicV2PlaylistItem[]> {
    return this.storage.listMusicV2PlaylistItems?.(playlistId) ?? [];
  }

  async hasV2PlaylistItem(playlistId: string, songId: string): Promise<boolean> {
    return this.storage.hasMusicV2PlaylistItem?.(playlistId, songId) ?? false;
  }

  async createV1Playlist(userName: string, playlist: { id: string; name: string; description?: string; cover?: string }): Promise<void> {
    await this.storage.createMusicPlaylist?.(userName, playlist);
  }

  async getV1Playlist(playlistId: string): Promise<any | null> {
    return this.storage.getMusicPlaylist?.(playlistId) ?? null;
  }

  async listV1Playlists(userName: string): Promise<any[]> {
    return this.storage.getUserMusicPlaylists?.(userName) ?? [];
  }

  async updateV1Playlist(playlistId: string, updates: { name?: string; description?: string; cover?: string }): Promise<void> {
    await this.storage.updateMusicPlaylist?.(playlistId, updates);
  }

  async deleteV1Playlist(playlistId: string): Promise<void> {
    await this.storage.deleteMusicPlaylist?.(playlistId);
  }

  async addV1PlaylistSong(playlistId: string, song: { platform: string; id: string; name: string; artist: string; album?: string; pic?: string; duration: number }): Promise<void> {
    await this.storage.addSongToPlaylist?.(playlistId, song);
  }

  async removeV1PlaylistSong(playlistId: string, platform: string, songId: string): Promise<void> {
    await this.storage.removeSongFromPlaylist?.(playlistId, platform, songId);
  }

  async listV1PlaylistSongs(playlistId: string): Promise<any[]> {
    return this.storage.getPlaylistSongs?.(playlistId) ?? [];
  }

  async isSongInV1Playlist(playlistId: string, platform: string, songId: string): Promise<boolean> {
    return this.storage.isSongInPlaylist?.(playlistId, platform, songId) ?? false;
  }
}

export class ServerNotificationRepository implements INotificationRepository {
  constructor(private storage: IStorage) {}

  async getAll(userName: string): Promise<Notification[]> {
    return this.storage.getNotifications?.(userName) ?? [];
  }

  async add(userName: string, notification: Notification): Promise<void> {
    await this.storage.addNotification?.(userName, notification);
  }

  async markAsRead(userName: string, notificationId: string): Promise<void> {
    await this.storage.markNotificationAsRead?.(userName, notificationId);
  }

  async delete(userName: string, notificationId: string): Promise<void> {
    await this.storage.deleteNotification?.(userName, notificationId);
  }

  async clearAll(userName: string): Promise<void> {
    await this.storage.clearAllNotifications?.(userName);
  }

  async getUnreadCount(userName: string): Promise<number> {
    return this.storage.getUnreadNotificationCount?.(userName) ?? 0;
  }
}

export class ServerMovieRequestRepository implements IMovieRequestRepository {
  constructor(private storage: IStorage) {}

  async getAll(): Promise<MovieRequest[]> {
    return this.storage.getAllMovieRequests?.() ?? [];
  }

  async get(requestId: string): Promise<MovieRequest | null> {
    return this.storage.getMovieRequest?.(requestId) ?? null;
  }

  async create(request: MovieRequest): Promise<void> {
    await this.storage.createMovieRequest?.(request);
  }

  async update(requestId: string, updates: Partial<MovieRequest>): Promise<void> {
    await this.storage.updateMovieRequest?.(requestId, updates);
  }

  async delete(requestId: string): Promise<void> {
    await this.storage.deleteMovieRequest?.(requestId);
  }

  async getUserRequests(userName: string): Promise<string[]> {
    return this.storage.getUserMovieRequests?.(userName) ?? [];
  }

  async addUserRequest(userName: string, requestId: string): Promise<void> {
    await this.storage.addUserMovieRequest?.(userName, requestId);
  }

  async removeUserRequest(userName: string, requestId: string): Promise<void> {
    await this.storage.removeUserMovieRequest?.(userName, requestId);
  }

  async updateLastRequestTime(userName: string, timestamp: number): Promise<void> {
    await this.storage.updateLastMovieRequestTime?.(userName, timestamp);
  }
}