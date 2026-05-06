/* eslint-disable @typescript-eslint/no-require-imports */

import { AdminConfig } from './admin.types';
import { MusicPlayRecord } from './db.client';
import { KvrocksStorage } from './kvrocks.db';
import { logger } from './logger';
import {
  MusicV2HistoryRecord,
  MusicV2PlaylistItem,
  MusicV2PlaylistRecord,
} from './music-v2';
import { RedisStorage } from './redis.db';
import {
  DanmakuFilterConfig,
  Favorite,
  IStorage,
  PlayRecord,
  SkipConfig,
  UserV2Info,
  UserV2ListResult,
  MusicV1Playlist,
  MusicV1PlaylistSong,
} from './types';
import { UpstashRedisStorage } from './upstash.db';

export type StorageType =
  | 'localstorage'
  | 'redis'
  | 'upstash'
  | 'kvrocks'
  | 'd1'
  | 'postgres';

export const STORAGE_TYPE: StorageType =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as StorageType | undefined) ||
  'localstorage';

interface DatabaseAdapter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

function createStorage(): IStorage {
  switch (STORAGE_TYPE) {
    case 'redis':
      return new RedisStorage();
    case 'upstash':
      return new UpstashRedisStorage();
    case 'kvrocks':
      return new KvrocksStorage();
    case 'd1':
      if (typeof window !== 'undefined') {
        throw new Error('D1Storage can only be used on the server side');
      }
      const d1Adapter = getD1Adapter();
      const { D1Storage } = require('./d1.db');
      return new D1Storage(d1Adapter);
    case 'postgres':
      if (typeof window !== 'undefined') {
        throw new Error('PostgresStorage can only be used on the server side');
      }
      const postgresAdapter = getPostgresAdapter();
      const { PostgresStorage } = require('./postgres.db');
      return new PostgresStorage(postgresAdapter);
    case 'localstorage':
    default:
      throw new Error(
        `LocalStorage mode should use client-side storage only. Server-side operations require a database backend (redis/upstash/kvrocks/d1/postgres).`,
      );
  }
}

function getPostgresAdapter(): DatabaseAdapter {
  const { PostgresAdapter } = require('./postgres-adapter');
  logger.info('Using Vercel Postgres database');
  return new PostgresAdapter();
}

function getD1Adapter(): DatabaseAdapter {
  const { CloudflareD1Adapter, SQLiteAdapter } = require('./d1-adapter');

  const isCloudflare =
    process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare';

  if (isCloudflare) {
    let cachedAdapter: DatabaseAdapter | null = null;

    return new Proxy({} as DatabaseAdapter, {
      get(_target, prop) {
        if (!cachedAdapter) {
          try {
            const { getCloudflareContext } = require('@opennextjs/cloudflare');
            const { env } = getCloudflareContext();
            if (!env.DB) {
              throw new Error(
                'D1 database binding (DB) not found in Cloudflare environment',
              );
            }
            logger.info('Using Cloudflare D1 database');
            cachedAdapter = new CloudflareD1Adapter(env.DB);
          } catch (error) {
            logger.error('Failed to initialize Cloudflare D1:', error);
            throw error;
          }
        }
        const adapter = cachedAdapter as unknown as Record<string, unknown>;
        return adapter[prop as string];
      },
    });
  }

  const Database = require('better-sqlite3');
  const path = require('path');

  const dbPath =
    process.env.SQLITE_DB_PATH ||
    path.join(process.cwd(), '.data', 'moontv.db');

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  logger.info('Using SQLite database (non-Cloudflare mode)');
  logger.info('Database location:', dbPath);

  return new SQLiteAdapter(db);
}

let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

export class DbManager {
  private _storage: IStorage;

  constructor() {
    this._storage = getStorage();
  }

  get storage(): IStorage {
    return this._storage;
  }

  async getPlayRecord(
    userName: string,
    source: string,
    id: string,
  ): Promise<PlayRecord | null> {
    const key = generateStorageKey(source, id);
    return this._storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord,
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this._storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    return this._storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this._storage.deletePlayRecord(userName, key);
  }

  async getFavorite(
    userName: string,
    source: string,
    id: string,
  ): Promise<Favorite | null> {
    const key = generateStorageKey(source, id);
    return this._storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite,
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this._storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string,
  ): Promise<{ [key: string]: Favorite }> {
    return this._storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this._storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string,
  ): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  async saveMusicPlayRecord(
    userName: string,
    platform: string,
    id: string,
    record: MusicPlayRecord,
  ): Promise<void> {
    const key = generateStorageKey(platform, id);
    await this._storage.setMusicPlayRecord(userName, key, record);
  }

  async batchSaveMusicPlayRecords(
    userName: string,
    records: Array<{ platform: string; id: string; record: MusicPlayRecord }>,
  ): Promise<void> {
    const batchRecords = records.map(({ platform, id, record }) => ({
      key: generateStorageKey(platform, id),
      record,
    }));
    await this._storage.batchSetMusicPlayRecords(userName, batchRecords);
  }

  async getAllMusicPlayRecords(userName: string): Promise<{
    [key: string]: MusicPlayRecord;
  }> {
    return this._storage.getAllMusicPlayRecords(userName);
  }

  async deleteMusicPlayRecord(
    userName: string,
    platform: string,
    id: string,
  ): Promise<void> {
    const key = generateStorageKey(platform, id);
    await this._storage.deleteMusicPlayRecord(userName, key);
  }

  async clearAllMusicPlayRecords(userName: string): Promise<void> {
    await this._storage.clearAllMusicPlayRecords(userName);
  }

  // Music V2 历史记录
  async listMusicV2History(userName: string): Promise<MusicV2HistoryRecord[]> {
    return this._storage.listMusicV2History?.(userName) ?? [];
  }

  async upsertMusicV2History(
    userName: string,
    record: MusicV2HistoryRecord,
  ): Promise<void> {
    await this._storage.upsertMusicV2History?.(userName, record);
  }

  async batchUpsertMusicV2History(
    userName: string,
    records: MusicV2HistoryRecord[],
  ): Promise<void> {
    await this._storage.batchUpsertMusicV2History?.(userName, records);
  }

  async deleteMusicV2History(userName: string, songId: string): Promise<void> {
    await this._storage.deleteMusicV2History?.(userName, songId);
  }

  async clearMusicV2History(userName: string): Promise<void> {
    await this._storage.clearMusicV2History?.(userName);
  }

  // Music V2 歌单
  async createMusicV2Playlist(
    userName: string,
    playlist: { id: string; name: string; description?: string; cover?: string },
  ): Promise<void> {
    await this._storage.createMusicV2Playlist?.(userName, playlist);
  }

  async getMusicV2Playlist(
    playlistId: string,
  ): Promise<MusicV2PlaylistRecord | null> {
    return this._storage.getMusicV2Playlist?.(playlistId) ?? null;
  }

  async listMusicV2Playlists(
    userName: string,
  ): Promise<MusicV2PlaylistRecord[]> {
    return this._storage.listMusicV2Playlists?.(userName) ?? [];
  }

  async updateMusicV2Playlist(
    playlistId: string,
    updates: { name?: string; description?: string; cover?: string; song_count?: number },
  ): Promise<void> {
    await this._storage.updateMusicV2Playlist?.(playlistId, updates);
  }

  async deleteMusicV2Playlist(playlistId: string): Promise<void> {
    await this._storage.deleteMusicV2Playlist?.(playlistId);
  }

  async addMusicV2PlaylistItem(
    playlistId: string,
    item: MusicV2PlaylistItem,
  ): Promise<void> {
    await this._storage.addMusicV2PlaylistItem?.(playlistId, item);
  }

  async removeMusicV2PlaylistItem(
    playlistId: string,
    songId: string,
  ): Promise<void> {
    await this._storage.removeMusicV2PlaylistItem?.(playlistId, songId);
  }

  async listMusicV2PlaylistItems(
    playlistId: string,
  ): Promise<MusicV2PlaylistItem[]> {
    return this._storage.listMusicV2PlaylistItems?.(playlistId) ?? [];
  }

  async hasMusicV2PlaylistItem(
    playlistId: string,
    songId: string,
  ): Promise<boolean> {
    return this._storage.hasMusicV2PlaylistItem?.(playlistId, songId) ?? false;
  }

  // 音乐歌单 (V1)
  async createMusicPlaylist(
    userName: string,
    playlist: { id: string; name: string; description?: string; cover?: string },
  ): Promise<void> {
    await this._storage.createMusicPlaylist?.(userName, playlist);
  }

  async getMusicPlaylist(playlistId: string): Promise<MusicV1Playlist | null> {
    return this._storage.getMusicPlaylist?.(playlistId) ?? null;
  }

  async getUserMusicPlaylists(userName: string): Promise<MusicV1Playlist[]> {
    return this._storage.getUserMusicPlaylists?.(userName) ?? [];
  }

  async updateMusicPlaylist(
    playlistId: string,
    updates: { name?: string; description?: string; cover?: string },
  ): Promise<void> {
    await this._storage.updateMusicPlaylist?.(playlistId, updates);
  }

  async deleteMusicPlaylist(playlistId: string): Promise<void> {
    await this._storage.deleteMusicPlaylist?.(playlistId);
  }

  async addSongToPlaylist(
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
  ): Promise<void> {
    await this._storage.addSongToPlaylist?.(playlistId, song);
  }

  async removeSongFromPlaylist(
    playlistId: string,
    platform: string,
    songId: string,
  ): Promise<void> {
    await this._storage.removeSongFromPlaylist?.(playlistId, platform, songId);
  }

  async getPlaylistSongs(playlistId: string): Promise<MusicV1PlaylistSong[]> {
    return this._storage.getPlaylistSongs?.(playlistId) ?? [];
  }

  async isSongInPlaylist(
    playlistId: string,
    platform: string,
    songId: string,
  ): Promise<boolean> {
    return this._storage.isSongInPlaylist?.(playlistId, platform, songId) ?? false;
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    return this._storage.verifyUser(userName, password);
  }

  async checkUserExist(userName: string): Promise<boolean> {
    return this._storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    await this._storage.changePassword(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    await this._storage.deleteUser(userName);
  }

  // 用户相关（新版本）
  async createUserV2(
    userName: string,
    password: string,
    role: 'owner' | 'admin' | 'user' = 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
  ): Promise<void> {
    await this._storage.createUserV2?.(userName, password, role, tags, oidcSub, enabledApis);
  }

  async verifyUserV2(userName: string, password: string): Promise<boolean> {
    return this._storage.verifyUserV2?.(userName, password) ?? false;
  }

  async getUserInfoV2(userName: string): Promise<UserV2Info | null> {
    return this._storage.getUserInfoV2?.(userName) ?? null;
  }

  async updateUserInfoV2(
    userName: string,
    updates: {
      role?: 'owner' | 'admin' | 'user';
      banned?: boolean;
      tags?: string[];
      oidcSub?: string;
      enabledApis?: string[];
    },
  ): Promise<void> {
    await this._storage.updateUserInfoV2?.(userName, updates);
  }

  async changePasswordV2(userName: string, newPassword: string): Promise<void> {
    await this._storage.changePasswordV2?.(userName, newPassword);
  }

  async checkUserExistV2(userName: string): Promise<boolean> {
    return this._storage.checkUserExistV2?.(userName) ?? false;
  }

  async getUserByOidcSub(oidcSub: string): Promise<string | null> {
    return this._storage.getUserByOidcSub?.(oidcSub) ?? null;
  }

  async getUserListV2(
    offset = 0,
    limit = 20,
    ownerUsername?: string,
  ): Promise<UserV2ListResult> {
    return this._storage.getUserListV2?.(offset, limit, ownerUsername) ?? { users: [], total: 0 };
  }

  async deleteUserV2(userName: string): Promise<void> {
    await this._storage.deleteUserV2?.(userName);
  }

  async getUsersByTag(tagName: string): Promise<string[]> {
    return this._storage.getUsersByTag?.(tagName) ?? [];
  }

  // TVBox订阅token
  async getTvboxSubscribeToken(userName: string): Promise<string | null> {
    return this._storage.getTvboxSubscribeToken?.(userName) ?? null;
  }

  async setTvboxSubscribeToken(userName: string, token: string): Promise<void> {
    await this._storage.setTvboxSubscribeToken?.(userName, token);
  }

  async getUsernameByTvboxToken(token: string): Promise<string | null> {
    return this._storage.getUsernameByTvboxToken?.(token) ?? null;
  }

  // 播放记录迁移
  async migratePlayRecords(userName: string): Promise<void> {
    await this._storage.migratePlayRecords(userName);
  }

  // 收藏迁移
  async migrateFavorites(userName: string): Promise<void> {
    await this._storage.migrateFavorites(userName);
  }

  // 跳过配置迁移
  async migrateSkipConfigs(userName: string): Promise<void> {
    await this._storage.migrateSkipConfigs(userName);
  }

  // 数据迁移
  async migrateUsersFromConfig(adminConfig: AdminConfig): Promise<void> {
    if (typeof this._storage.createUserV2 !== 'function') {
      throw new Error('当前存储类型不支持新版用户存储');
    }

    const users = adminConfig.UserConfig.Users;
    if (!users || users.length === 0) {
      return;
    }

    logger.info(`开始迁移 ${users.length} 个用户...`);

    for (const user of users) {
      try {
        if (user.username === process.env.USERNAME) {
          logger.info(`跳过站长 ${user.username} 的迁移`);
          continue;
        }

        const exists = await this.checkUserExistV2(user.username);
        if (exists) {
          logger.info(`用户 ${user.username} 已存在，跳过迁移`);
          continue;
        }

        let password = '';

        if ('oidcSub' in user && user.oidcSub) {
          password = crypto.randomUUID();
          logger.info(`用户 ${user.username} (OIDC用户) 使用随机密码迁移`);
        } else {
          try {
            const storage = this.storage as unknown as Record<string, unknown>;
            const adapter = storage.adapter as Record<string, unknown> | undefined;
            if (adapter && typeof adapter.get === 'function') {
              const storedPassword = await (adapter.get as (key: string) => Promise<string | null>)(
                `u:${user.username}:pwd`,
              );
              if (storedPassword) {
                password = storedPassword;
                logger.info(`用户 ${user.username} 使用旧密码迁移`);
              } else {
                password = 'defaultPassword123';
                logger.info(`用户 ${user.username} 没有旧密码，使用默认密码`);
              }
            } else {
              password = 'defaultPassword123';
            }
          } catch (err) {
            logger.error(`获取用户 ${user.username} 的密码失败，使用默认密码`, err);
            password = 'defaultPassword123';
          }
        }

        const migratedRole = user.role === 'owner' ? 'user' : user.role;
        if (user.role === 'owner') {
          logger.info(`用户 ${user.username} 的角色从 owner 转换为 user`);
        }

        await this.createUserV2(
          user.username,
          password,
          migratedRole,
          user.tags,
          user.oidcSub,
          user.enabledApis,
        );

        if (user.banned) {
          await this.updateUserInfoV2(user.username, { banned: true });
        }

        logger.info(`用户 ${user.username} 迁移成功`);
      } catch (err) {
        logger.error(`迁移用户 ${user.username} 失败:`, err);
      }
    }

    logger.info('用户迁移完成');
  }

  // 搜索历史
  async getSearchHistory(userName: string): Promise<string[]> {
    return this._storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    await this._storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    await this._storage.deleteSearchHistory(userName, keyword);
  }

  async getAllUsers(): Promise<string[]> {
    return this._storage.getAllUsers?.() ?? [];
  }

  // 管理员配置
  async getAdminConfig(): Promise<AdminConfig | null> {
    return this._storage.getAdminConfig?.() ?? null;
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    await this._storage.setAdminConfig?.(config);
  }

  // 跳过片头片尾配置
  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null> {
    return this._storage.getSkipConfig?.(userName, source, id) ?? null;
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void> {
    await this._storage.setSkipConfig?.(userName, source, id, config);
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    await this._storage.deleteSkipConfig?.(userName, source, id);
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: SkipConfig }> {
    return this._storage.getAllSkipConfigs?.(userName) ?? {};
  }

  // 弹幕过滤配置
  async getDanmakuFilterConfig(
    userName: string,
  ): Promise<DanmakuFilterConfig | null> {
    return this._storage.getDanmakuFilterConfig?.(userName) ?? null;
  }

  async setDanmakuFilterConfig(
    userName: string,
    config: DanmakuFilterConfig,
  ): Promise<void> {
    await this._storage.setDanmakuFilterConfig?.(userName, config);
  }

  async deleteDanmakuFilterConfig(userName: string): Promise<void> {
    await this._storage.deleteDanmakuFilterConfig?.(userName);
  }

  // 数据清理
  async clearAllData(): Promise<void> {
    if (typeof this._storage.clearAllData === 'function') {
      await this._storage.clearAllData();
    } else {
      throw new Error('存储类型不支持清空数据操作');
    }
  }

  // 通用键值存储
  async getGlobalValue(key: string): Promise<string | null> {
    return this._storage.getGlobalValue?.(key) ?? null;
  }

  async setGlobalValue(key: string, value: string): Promise<void> {
    await this._storage.setGlobalValue?.(key, value);
  }

  async deleteGlobalValue(key: string): Promise<void> {
    await this._storage.deleteGlobalValue?.(key);
  }
}

export const db = new DbManager();
