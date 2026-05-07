import { AdminConfig } from './admin.types';
import { hashPassword, verifyPassword, isLegacyPasswordHash } from './crypto-node';
import { DatabaseAdapter } from './d1-adapter';
import { logger } from './logger';
import {
  DanmakuFilterConfig,
  Favorite,
  IStorage,
  MovieRequest,
  Notification,
  PlayRecord,
  SkipConfig,
} from './types';
import { userInfoCache } from './user-cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

export abstract class SQLStorageBase implements IStorage {
  protected db: DatabaseAdapter;
  protected schemaReady: Promise<void>;
  public adapter: RedisHashAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.db = adapter;
    this.schemaReady = Promise.resolve();
    this.adapter = new RedisHashAdapter(adapter);
  }

  abstract getUsersByTag(tagName: string): Promise<string[]>;

  // ==================== 播放记录 ====================

  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first();

      if (!result) return null;
      return this.rowToPlayRecord(result);
    } catch (err) {
      logger.error('SQLStorageBase.getPlayRecord error:', err);
      throw err;
    }
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO play_records (
            username, key, title, source_name, cover, year,
            episode_index, total_episodes, play_time, total_time,
            save_time, search_title, new_episodes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(username, key) DO UPDATE SET
            title = excluded.title,
            source_name = excluded.source_name,
            cover = excluded.cover,
            year = excluded.year,
            episode_index = excluded.episode_index,
            total_episodes = excluded.total_episodes,
            play_time = excluded.play_time,
            total_time = excluded.total_time,
            save_time = excluded.save_time,
            search_title = excluded.search_title,
            new_episodes = excluded.new_episodes
        `,
        )
        .bind(
          userName,
          key,
          record.title,
          record.source_name,
          record.cover || '',
          record.year || '',
          record.index,
          record.total_episodes,
          record.play_time,
          record.total_time,
          record.save_time,
          record.search_title || '',
          record.new_episodes || null,
        )
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setPlayRecord error:', err);
      throw err;
    }
  }

  async getAllPlayRecords(
    userName: string,
  ): Promise<{ [key: string]: PlayRecord }> {
    try {
      const results = await this.db
        .prepare(
          'SELECT * FROM play_records WHERE username = ? ORDER BY save_time DESC',
        )
        .bind(userName)
        .all();

      const records: { [key: string]: PlayRecord } = {};
      if (results.results) {
        for (const row of results.results) {
          const record = this.rowToPlayRecord(row);
          records[row.key as string] = record;
        }
      }
      return records;
    } catch (err) {
      logger.error('SQLStorageBase.getAllPlayRecords error:', err);
      throw err;
    }
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deletePlayRecord error:', err);
      throw err;
    }
  }

  async cleanupOldPlayRecords(userName: string): Promise<void> {
    try {
      const maxRecords = parseInt(
        process.env.MAX_PLAY_RECORDS_PER_USER || '100',
        10,
      );
      const threshold = maxRecords + 10;

      const countResult = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM play_records WHERE username = ?',
        )
        .bind(userName)
        .first();

      const count = (countResult?.count as number) || 0;
      if (count <= threshold) return;

      await this.db
        .prepare(
          `
          DELETE FROM play_records
          WHERE username = ?
          AND key NOT IN (
            SELECT key FROM play_records
            WHERE username = ?
            ORDER BY save_time DESC
            LIMIT ?
          )
        `,
        )
        .bind(userName, userName, maxRecords)
        .run();

      logger.info(
        `SQLStorageBase: Cleaned up old play records for user ${userName}`,
      );
    } catch (err) {
      logger.error('SQLStorageBase.cleanupOldPlayRecords error:', err);
      throw err;
    }
  }

  async migratePlayRecords(userName: string): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET playrecord_migrated = 1 WHERE username = ?')
        .bind(userName)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.migratePlayRecords error:', err);
    }
  }

  // ==================== 收藏 ====================

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first();

      if (!result) return null;
      return this.rowToFavorite(result);
    } catch (err) {
      logger.error('SQLStorageBase.getFavorite error:', err);
      throw err;
    }
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO favorites (
            username, key, source_name, total_episodes, title,
            year, cover, save_time, search_title, origin,
            is_completed, vod_remarks
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(username, key) DO UPDATE SET
            source_name = excluded.source_name,
            total_episodes = excluded.total_episodes,
            title = excluded.title,
            year = excluded.year,
            cover = excluded.cover,
            save_time = excluded.save_time,
            search_title = excluded.search_title,
            origin = excluded.origin,
            is_completed = excluded.is_completed,
            vod_remarks = excluded.vod_remarks
        `,
        )
        .bind(
          userName,
          key,
          favorite.source_name,
          favorite.total_episodes,
          favorite.title,
          favorite.year || '',
          favorite.cover || '',
          favorite.save_time,
          favorite.search_title || '',
          favorite.origin || null,
          favorite.is_completed ? 1 : 0,
          favorite.vod_remarks || null,
        )
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setFavorite error:', err);
      throw err;
    }
  }

  async getAllFavorites(
    userName: string,
  ): Promise<{ [key: string]: Favorite }> {
    try {
      const results = await this.db
        .prepare(
          'SELECT * FROM favorites WHERE username = ? ORDER BY save_time DESC',
        )
        .bind(userName)
        .all();

      const favorites: { [key: string]: Favorite } = {};
      if (results.results) {
        for (const row of results.results) {
          const favorite = this.rowToFavorite(row);
          favorites[row.key as string] = favorite;
        }
      }
      return favorites;
    } catch (err) {
      logger.error('SQLStorageBase.getAllFavorites error:', err);
      throw err;
    }
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deleteFavorite error:', err);
      throw err;
    }
  }

  async migrateFavorites(userName: string): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET favorite_migrated = 1 WHERE username = ?')
        .bind(userName)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.migrateFavorites error:', err);
    }
  }

  // ==================== 辅助方法 ====================

  protected rowToPlayRecord(row: DbRow): PlayRecord {
    return {
      title: row.title,
      source_name: row.source_name,
      cover: row.cover || '',
      year: row.year || '',
      index: row.episode_index,
      total_episodes: row.total_episodes,
      play_time: row.play_time,
      total_time: row.total_time,
      save_time: row.save_time,
      search_title: row.search_title || '',
      new_episodes: row.new_episodes || undefined,
    };
  }

  protected rowToFavorite(row: DbRow): Favorite {
    return {
      source_name: row.source_name,
      total_episodes: row.total_episodes,
      title: row.title,
      year: row.year || '',
      cover: row.cover || '',
      save_time: row.save_time,
      search_title: row.search_title || '',
      origin: row.origin as 'vod' | 'live' | undefined,
      is_completed: row.is_completed === 1,
      vod_remarks: row.vod_remarks || undefined,
    };
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    try {
      if (
        userName === process.env.USERNAME &&
        password === process.env.PASSWORD
      ) {
        return true;
      }

      const user = await this.db
        .prepare(
          'SELECT password_hash FROM users WHERE username = ? AND banned = 0',
        )
        .bind(userName)
        .first();

      if (!user || !user.password_hash) return false;

      const storedHash = user.password_hash as string;
      const isValid = verifyPassword(password, storedHash);

      if (isValid && isLegacyPasswordHash(storedHash)) {
        const newHash = hashPassword(password);
        await this.db
          .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
          .bind(newHash, userName)
          .run();
      }

      return isValid;
    } catch (err) {
      logger.error('SQLStorageBase.verifyUser error:', err);
      return false;
    }
  }

  async checkUserExist(userName: string): Promise<boolean> {
    try {
      if (userName === process.env.USERNAME) {
        return true;
      }

      const result = await this.db
        .prepare('SELECT 1 FROM users WHERE username = ? LIMIT 1')
        .bind(userName)
        .first();

      return result !== null;
    } catch (err) {
      logger.error('SQLStorageBase.checkUserExist error:', err);
      return false;
    }
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    try {
      const passwordHash = hashPassword(newPassword);

      await this.db
        .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
        .bind(passwordHash, userName)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.changePassword error:', err);
      throw err;
    }
  }

  async deleteUser(userName: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM users WHERE username = ?')
        .bind(userName)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deleteUser error:', err);
      throw err;
    }
  }

  async getAllUsers(): Promise<string[]> {
    try {
      const results = await this.db
        .prepare('SELECT username FROM users ORDER BY created_at DESC')
        .all();

      if (!results.results) return [];
      return results.results.map((row) => row.username as string);
    } catch (err) {
      logger.error('SQLStorageBase.getAllUsers error:', err);
      return [];
    }
  }

  async getUserInfoV2(userName: string): Promise<Record<string, unknown> | null> {
    try {
      const cached = userInfoCache?.get(userName);
      if (cached) {
        return cached;
      }

      const user = await this.db
        .prepare('SELECT * FROM users WHERE username = ?')
        .bind(userName)
        .first();

      if (user) {
        const userInfo = {
          role: user.role as 'owner' | 'admin' | 'user',
          banned: user.banned === 1,
          tags: user.tags ? JSON.parse(user.tags as string) : undefined,
          oidcSub: user.oidc_sub as string | undefined,
          enabledApis: user.enabled_apis
            ? JSON.parse(user.enabled_apis as string)
            : undefined,
          created_at: user.created_at as number,
          playrecord_migrated: user.playrecord_migrated === 1,
          favorite_migrated: user.favorite_migrated === 1,
          skip_migrated: user.skip_migrated === 1,
          last_movie_request_time: user.last_movie_request_time as
            | number
            | undefined,
          email: user.email as string | undefined,
          emailNotifications: user.email_notifications === 1,
        };

        if (userName === process.env.USERNAME) {
          userInfo.role = 'owner';
        }

        userInfoCache?.set(userName, userInfo);

        return userInfo;
      }

      if (userName === process.env.USERNAME) {
        const ownerInfo = {
          role: 'owner' as const,
          banned: false,
          created_at: Date.now(),
          playrecord_migrated: true,
          favorite_migrated: true,
          skip_migrated: true,
        };

        try {
          await this.db
            .prepare(
              `
              INSERT INTO users (
                username, password_hash, role, banned, created_at,
                playrecord_migrated, favorite_migrated, skip_migrated
              )
              VALUES (?, ?, ?, 0, ?, 1, 1, 1)
            `,
            )
            .bind(userName, '', 'owner', ownerInfo.created_at)
            .run();
          logger.info(`Created database record for site owner: ${userName}`);
        } catch (insertErr) {
          logger.error('Failed to create owner record:', insertErr);
        }

        userInfoCache?.set(userName, ownerInfo);
        return ownerInfo;
      }

      return null;
    } catch (err) {
      logger.error('SQLStorageBase.getUserInfoV2 error:', err);
      return null;
    }
  }

  async createUserV2(
    userName: string,
    password: string,
    role: 'owner' | 'admin' | 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
  ): Promise<void> {
    try {
      const passwordHash = hashPassword(password);

      await this.db
        .prepare(
          `
          INSERT INTO users (
            username, password_hash, role, banned, tags, oidc_sub,
            enabled_apis, created_at, playrecord_migrated,
            favorite_migrated, skip_migrated
          )
          VALUES (?, ?, ?, 0, ?, ?, ?, ?, 1, 1, 1)
        `,
        )
        .bind(
          userName,
          passwordHash,
          role,
          tags ? JSON.stringify(tags) : null,
          oidcSub || null,
          enabledApis ? JSON.stringify(enabledApis) : null,
          Date.now(),
        )
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.createUserV2 error:', err);
      throw err;
    }
  }

  async getUserListV2(
    offset = 0,
    limit = 20,
    ownerUsername?: string,
  ): Promise<{
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
  }> {
    try {
      const countResult = await this.db
        .prepare('SELECT COUNT(*) as total FROM users')
        .first();
      let total = (countResult?.total as number) || 0;

      let ownerInfo = null;
      let ownerInDatabase = false;
      if (ownerUsername) {
        ownerInfo = await this.getUserInfoV2(ownerUsername);
        ownerInDatabase = !!ownerInfo && ownerInfo.created_at !== 0;

        if (!ownerInDatabase) {
          total += 1;
        }
      }

      let actualOffset = offset;
      let actualLimit = limit;

      if (ownerUsername && !ownerInDatabase) {
        if (offset === 0) {
          actualLimit = limit - 1;
        } else {
          actualOffset = offset - 1;
        }
      }

      const result = await this.db
        .prepare(
          `
          SELECT username, role, banned, tags, oidc_sub, enabled_apis, created_at
          FROM users
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `,
        )
        .bind(actualLimit, actualOffset)
        .all();

      const users = [];

      if (ownerUsername && offset === 0) {
        users.push({
          username: ownerUsername,
          role: 'owner' as const,
          banned: ownerInfo?.banned || false,
          tags: ownerInfo?.tags,
          oidcSub: ownerInfo?.oidcSub,
          enabledApis: ownerInfo?.enabledApis,
          created_at: ownerInfo?.created_at || 0,
        });
      }

      if (result.results) {
        for (const user of result.results) {
          if (ownerUsername && user.username === ownerUsername) {
            continue;
          }

          users.push({
            username: user.username as string,
            role: user.role as 'owner' | 'admin' | 'user',
            banned: user.banned === 1,
            tags: user.tags ? JSON.parse(user.tags as string) : undefined,
            oidcSub: user.oidc_sub as string | undefined,
            enabledApis: user.enabled_apis
              ? JSON.parse(user.enabled_apis as string)
              : undefined,
            created_at: user.created_at as number,
          });
        }
      }

      return { users, total };
    } catch (err) {
      logger.error('SQLStorageBase.getUserListV2 error:', err);
      return { users: [], total: 0 };
    }
  }

  async verifyUserV2(userName: string, password: string): Promise<boolean> {
    try {
      const user = await this.db
        .prepare('SELECT password_hash FROM users WHERE username = ?')
        .bind(userName)
        .first();

      if (!user) return false;

      const storedHash = user.password_hash as string;
      const isValid = verifyPassword(password, storedHash);

      if (isValid && isLegacyPasswordHash(storedHash)) {
        const newHash = hashPassword(password);
        await this.db
          .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
          .bind(newHash, userName)
          .run();
      }

      return isValid;
    } catch (err) {
      logger.error('SQLStorageBase.verifyUserV2 error:', err);
      return false;
    }
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
    try {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
      }
      if (updates.banned !== undefined) {
        fields.push('banned = ?');
        values.push(updates.banned ? 1 : 0);
      }
      if (updates.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }
      if (updates.oidcSub !== undefined) {
        fields.push('oidc_sub = ?');
        values.push(updates.oidcSub);
      }
      if (updates.enabledApis !== undefined) {
        fields.push('enabled_apis = ?');
        values.push(JSON.stringify(updates.enabledApis));
      }

      if (fields.length === 0) return;

      values.push(userName);

      await this.db
        .prepare(`UPDATE users SET ${fields.join(', ')} WHERE username = ?`)
        .bind(...values)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.updateUserInfoV2 error:', err);
      throw err;
    }
  }

  async changePasswordV2(userName: string, newPassword: string): Promise<void> {
    try {
      const passwordHash = hashPassword(newPassword);

      await this.db
        .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
        .bind(passwordHash, userName)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.changePasswordV2 error:', err);
      throw err;
    }
  }

  async checkUserExistV2(userName: string): Promise<boolean> {
    try {
      const user = await this.db
        .prepare('SELECT 1 FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return !!user;
    } catch (err) {
      logger.error('SQLStorageBase.checkUserExistV2 error:', err);
      return false;
    }
  }

  async getUserByOidcSub(oidcSub: string): Promise<string | null> {
    try {
      const user = await this.db
        .prepare('SELECT username FROM users WHERE oidc_sub = ?')
        .bind(oidcSub)
        .first();

      return user ? (user.username as string) : null;
    } catch (err) {
      logger.error('SQLStorageBase.getUserByOidcSub error:', err);
      return null;
    }
  }

  async deleteUserV2(userName: string): Promise<void> {
    try {
      const playlistIds = await this.db
        .bind(userName)
        .all();
      const v2PlaylistIds = await this.db
        .prepare('SELECT id FROM music_v2_playlists WHERE username = ?')
        .bind(userName)
        .all();

      const stmts = [
        this.db.prepare('DELETE FROM play_records WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM favorites WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM music_v2_history WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM search_history WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM skip_configs WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM danmaku_filter_configs WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM notifications WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM user_movie_requests WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM favorite_check_times WHERE username = ?').bind(userName),
        this.db.prepare('DELETE FROM users WHERE username = ?').bind(userName),
      ];

      if (playlistIds.results) {
        for (const row of playlistIds.results) {
          stmts.push(
          );
        }
      }

      if (v2PlaylistIds.results) {
        for (const row of v2PlaylistIds.results) {
          stmts.push(
            this.db.prepare('DELETE FROM music_v2_playlist_items WHERE playlist_id = ?').bind(row.id),
            this.db.prepare('DELETE FROM music_v2_playlists WHERE id = ?').bind(row.id),
          );
        }
      }

      if (this.db.batch) {
        await this.db.batch(stmts);
      } else {
        for (const stmt of stmts) {
          await stmt.run();
        }
      }

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.deleteUserV2 error:', err);
      throw err;
    }
  }

  async getUserPasswordHash(userName: string): Promise<string | null> {
    try {
      const user = await this.db
        .prepare('SELECT password_hash FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return user ? (user.password_hash as string) : null;
    } catch (err) {
      logger.error('SQLStorageBase.getUserPasswordHash error:', err);
      return null;
    }
  }

  async setUserPasswordHash(
    userName: string,
    passwordHash: string,
  ): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
        .bind(passwordHash, userName)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setUserPasswordHash error:', err);
      throw err;
    }
  }

  async createUserWithHashedPassword(
    userName: string,
    passwordHash: string,
    role: 'owner' | 'admin' | 'user',
    createdAt: number,
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
    banned?: boolean,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO users (
            username, password_hash, role, banned, tags, oidc_sub,
            enabled_apis, created_at, playrecord_migrated,
            favorite_migrated, skip_migrated
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
        `,
        )
        .bind(
          userName,
          passwordHash,
          role,
          banned ? 1 : 0,
          tags ? JSON.stringify(tags) : null,
          oidcSub || null,
          enabledApis ? JSON.stringify(enabledApis) : null,
          createdAt,
        )
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.createUserWithHashedPassword error:', err);
      throw err;
    }
  }

  async getUserEmail(userName: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT email FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return result?.email as string | null;
    } catch (err) {
      logger.error('SQLStorageBase.getUserEmail error:', err);
      return null;
    }
  }

  async setUserEmail(userName: string, email: string): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET email = ? WHERE username = ?')
        .bind(email, userName)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.setUserEmail error:', err);
      throw err;
    }
  }

  async getEmailNotificationPreference(userName: string): Promise<boolean> {
    try {
      const result = await this.db
        .prepare('SELECT email_notifications FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return result?.email_notifications === 1;
    } catch (err) {
      logger.error(
        'SQLStorageBase.getEmailNotificationPreference error:',
        err,
      );
      return true;
    }
  }

  async setEmailNotificationPreference(
    userName: string,
    enabled: boolean,
  ): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET email_notifications = ? WHERE username = ?')
        .bind(enabled ? 1 : 0, userName)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error(
        'SQLStorageBase.setEmailNotificationPreference error:',
        err,
      );
      throw err;
    }
  }

  // ==================== TVBox订阅token ====================

  async getTvboxSubscribeToken(userName: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT tvbox_subscribe_token FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return result?.tvbox_subscribe_token || null;
    } catch (err) {
      logger.error('SQLStorageBase.getTvboxSubscribeToken error:', err);
      return null;
    }
  }

  async setTvboxSubscribeToken(userName: string, token: string): Promise<void> {
    try {
      await this.db
        .prepare(
          'UPDATE users SET tvbox_subscribe_token = ? WHERE username = ?',
        )
        .bind(token, userName)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.setTvboxSubscribeToken error:', err);
      throw err;
    }
  }

  async getUsernameByTvboxToken(token: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT username FROM users WHERE tvbox_subscribe_token = ?')
        .bind(token)
        .first();

      return result?.username || null;
    } catch (err) {
      logger.error('SQLStorageBase.getUsernameByTvboxToken error:', err);
      return null;
    }
  }

  // ==================== 搜索历史 ====================

  async getSearchHistory(userName: string): Promise<string[]> {
    try {
      const results = await this.db
        .prepare(
          'SELECT keyword FROM search_history WHERE username = ? ORDER BY timestamp DESC LIMIT 20',
        )
        .bind(userName)
        .all();

      if (!results.results) return [];
      return results.results.map((row) => row.keyword as string);
    } catch (err) {
      logger.error('SQLStorageBase.getSearchHistory error:', err);
      return [];
    }
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    try {
      const timestamp = Date.now();

      await this.db
        .prepare(
          `
          INSERT INTO search_history (username, keyword, timestamp)
          VALUES (?, ?, ?)
          ON CONFLICT(username, keyword) DO UPDATE SET timestamp = excluded.timestamp
        `,
        )
        .bind(userName, keyword, timestamp)
        .run();

      const countResult = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM search_history WHERE username = ?',
        )
        .bind(userName)
        .first();

      const count = (countResult?.count as number) || 0;
      if (count > 20) {
        await this.db
          .prepare(
            `
            DELETE FROM search_history
            WHERE username = ?
            AND id NOT IN (
              SELECT id FROM search_history
              WHERE username = ?
              ORDER BY timestamp DESC
              LIMIT 20
            )
          `,
          )
          .bind(userName, userName)
          .run();
      }
    } catch (err) {
      logger.error('SQLStorageBase.addSearchHistory error:', err);
      throw err;
    }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    try {
      if (keyword) {
        await this.db
          .prepare(
            'DELETE FROM search_history WHERE username = ? AND keyword = ?',
          )
          .bind(userName, keyword)
          .run();
      } else {
        await this.db
          .prepare('DELETE FROM search_history WHERE username = ?')
          .bind(userName)
          .run();
      }
    } catch (err) {
      logger.error('SQLStorageBase.deleteSearchHistory error:', err);
      throw err;
    }
  }

  // ==================== 跳过配置 ====================

  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null> {
    try {
      const key = `${source}+${id}`;
      const result = await this.db
        .prepare('SELECT * FROM skip_configs WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first();

      if (!result) return null;
      return {
        enable: result.enable === 1,
        intro_time: result.intro_time as number,
        outro_time: result.outro_time as number,
      };
    } catch (err) {
      logger.error('SQLStorageBase.getSkipConfig error:', err);
      return null;
    }
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void> {
    try {
      const key = `${source}+${id}`;
      await this.db
        .prepare(
          `
          INSERT INTO skip_configs (username, key, enable, intro_time, outro_time)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(username, key) DO UPDATE SET
            enable = excluded.enable,
            intro_time = excluded.intro_time,
            outro_time = excluded.outro_time
        `,
        )
        .bind(
          userName,
          key,
          config.enable ? 1 : 0,
          config.intro_time,
          config.outro_time,
        )
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setSkipConfig error:', err);
      throw err;
    }
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    try {
      const key = `${source}+${id}`;
      await this.db
        .prepare('DELETE FROM skip_configs WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deleteSkipConfig error:', err);
      throw err;
    }
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: SkipConfig }> {
    try {
      const results = await this.db
        .prepare('SELECT * FROM skip_configs WHERE username = ?')
        .bind(userName)
        .all();

      const configs: { [key: string]: SkipConfig } = {};
      if (results.results) {
        for (const row of results.results) {
          configs[row.key as string] = {
            enable: row.enable === 1,
            intro_time: row.intro_time as number,
            outro_time: row.outro_time as number,
          };
        }
      }
      return configs;
    } catch (err) {
      logger.error('SQLStorageBase.getAllSkipConfigs error:', err);
      return {};
    }
  }

  async migrateSkipConfigs(userName: string): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET skip_migrated = 1 WHERE username = ?')
        .bind(userName)
        .run();

      userInfoCache?.delete(userName);
    } catch (err) {
      logger.error('SQLStorageBase.migrateSkipConfigs error:', err);
    }
  }

  // ==================== 弹幕过滤配置 ====================

  async getDanmakuFilterConfig(
    userName: string,
  ): Promise<DanmakuFilterConfig | null> {
    try {
      const result = await this.db
        .prepare('SELECT rules FROM danmaku_filter_configs WHERE username = ?')
        .bind(userName)
        .first();

      if (!result) return null;
      return JSON.parse(result.rules as string);
    } catch (err) {
      logger.error('SQLStorageBase.getDanmakuFilterConfig error:', err);
      return null;
    }
  }

  async setDanmakuFilterConfig(
    userName: string,
    config: DanmakuFilterConfig,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO danmaku_filter_configs (username, rules)
          VALUES (?, ?)
          ON CONFLICT(username) DO UPDATE SET rules = excluded.rules
        `,
        )
        .bind(userName, JSON.stringify(config))
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setDanmakuFilterConfig error:', err);
      throw err;
    }
  }

  async deleteDanmakuFilterConfig(userName: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM danmaku_filter_configs WHERE username = ?')
        .bind(userName)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deleteDanmakuFilterConfig error:', err);
      throw err;
    }
  }

  // ==================== 通知 ====================

  async getNotifications(userName: string): Promise<Notification[]> {
    try {
      const results = await this.db
        .prepare(
          'SELECT * FROM notifications WHERE username = ? ORDER BY timestamp DESC',
        )
        .bind(userName)
        .all();

      if (!results.results) return [];
      return results.results.map((row) => ({
        id: row.id as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: row.type as any,
        title: row.title as string,
        message: row.message as string,
        timestamp: row.timestamp as number,
        read: row.read === 1,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      }));
    } catch (err) {
      logger.error('SQLStorageBase.getNotifications error:', err);
      return [];
    }
  }

  async addNotification(
    userName: string,
    notification: Notification,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO notifications (id, username, type, title, message, timestamp, read, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .bind(
          notification.id,
          userName,
          notification.type,
          notification.title,
          notification.message,
          notification.timestamp,
          notification.read ? 1 : 0,
          notification.metadata ? JSON.stringify(notification.metadata) : null,
        )
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.addNotification error:', err);
      throw err;
    }
  }

  async markNotificationAsRead(
    userName: string,
    notificationId: string,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          'UPDATE notifications SET read = 1 WHERE username = ? AND id = ?',
        )
        .bind(userName, notificationId)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.markNotificationAsRead error:', err);
      throw err;
    }
  }

  async deleteNotification(
    userName: string,
    notificationId: string,
  ): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM notifications WHERE username = ? AND id = ?')
        .bind(userName, notificationId)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deleteNotification error:', err);
      throw err;
    }
  }

  async clearAllNotifications(userName: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM notifications WHERE username = ?')
        .bind(userName)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.clearAllNotifications error:', err);
      throw err;
    }
  }

  async getUnreadNotificationCount(userName: string): Promise<number> {
    try {
      const result = await this.db
        .prepare(
          'SELECT COUNT(*) as count FROM notifications WHERE username = ? AND read = 0',
        )
        .bind(userName)
        .first();

      return (result?.count as number) || 0;
    } catch (err) {
      logger.error('SQLStorageBase.getUnreadNotificationCount error:', err);
      return 0;
    }
  }

  // ==================== 求片请求 ====================

  async getAllMovieRequests(): Promise<MovieRequest[]> {
    try {
      const results = await this.db
        .prepare('SELECT * FROM movie_requests ORDER BY created_at DESC')
        .all();

      if (!results.results) return [];
      return results.results.map((row) => this.rowToMovieRequest(row));
    } catch (err) {
      logger.error('SQLStorageBase.getAllMovieRequests error:', err);
      return [];
    }
  }

  async getMovieRequest(requestId: string): Promise<MovieRequest | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM movie_requests WHERE id = ?')
        .bind(requestId)
        .first();

      if (!result) return null;
      return this.rowToMovieRequest(result);
    } catch (err) {
      logger.error('SQLStorageBase.getMovieRequest error:', err);
      return null;
    }
  }

  async createMovieRequest(request: MovieRequest): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO movie_requests (
            id, tmdb_id, title, year, media_type, season, poster, overview,
            requested_by, request_count, status, created_at, updated_at,
            fulfilled_at, fulfilled_source, fulfilled_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .bind(
          request.id,
          request.tmdbId || null,
          request.title,
          request.year || null,
          request.mediaType,
          request.season || null,
          request.poster || null,
          request.overview || null,
          JSON.stringify(request.requestedBy),
          request.requestCount,
          request.status,
          request.createdAt,
          request.updatedAt,
          request.fulfilledAt || null,
          request.fulfilledSource || null,
          request.fulfilledId || null,
        )
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.createMovieRequest error:', err);
      throw err;
    }
  }

  async updateMovieRequest(
    requestId: string,
    updates: Partial<MovieRequest>,
  ): Promise<void> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates.requestedBy !== undefined) {
        fields.push('requested_by = ?');
        values.push(JSON.stringify(updates.requestedBy));
      }
      if (updates.requestCount !== undefined) {
        fields.push('request_count = ?');
        values.push(updates.requestCount);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.fulfilledAt !== undefined) {
        fields.push('fulfilled_at = ?');
        values.push(updates.fulfilledAt);
      }
      if (updates.fulfilledSource !== undefined) {
        fields.push('fulfilled_source = ?');
        values.push(updates.fulfilledSource);
      }
      if (updates.fulfilledId !== undefined) {
        fields.push('fulfilled_id = ?');
        values.push(updates.fulfilledId);
      }

      fields.push('updated_at = ?');
      values.push(Date.now());

      values.push(requestId);

      await this.db
        .prepare(`UPDATE movie_requests SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.updateMovieRequest error:', err);
      throw err;
    }
  }

  async deleteMovieRequest(requestId: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM movie_requests WHERE id = ?')
        .bind(requestId)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deleteMovieRequest error:', err);
      throw err;
    }
  }

  async getUserMovieRequests(userName: string): Promise<string[]> {
    try {
      const results = await this.db
        .prepare(
          'SELECT request_id FROM user_movie_requests WHERE username = ?',
        )
        .bind(userName)
        .all();

      if (!results.results) return [];
      return results.results.map((row) => row.request_id as string);
    } catch (err) {
      logger.error('SQLStorageBase.getUserMovieRequests error:', err);
      return [];
    }
  }

  async addUserMovieRequest(
    userName: string,
    requestId: string,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          'INSERT INTO user_movie_requests (username, request_id) VALUES (?, ?) ON CONFLICT(username, request_id) DO NOTHING',
        )
        .bind(userName, requestId)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.addUserMovieRequest error:', err);
      throw err;
    }
  }

  async removeUserMovieRequest(
    userName: string,
    requestId: string,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          'DELETE FROM user_movie_requests WHERE username = ? AND request_id = ?',
        )
        .bind(userName, requestId)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.removeUserMovieRequest error:', err);
      throw err;
    }
  }

  protected rowToMovieRequest(row: DbRow): MovieRequest {
    return {
      id: row.id,
      tmdbId: row.tmdb_id || undefined,
      title: row.title,
      year: row.year || undefined,
      mediaType: row.media_type as 'movie' | 'tv',
      season: row.season || undefined,
      poster: row.poster || undefined,
      overview: row.overview || undefined,
      requestedBy: JSON.parse(row.requested_by),
      requestCount: row.request_count,
      status: row.status as 'pending' | 'fulfilled',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      fulfilledAt: row.fulfilled_at || undefined,
      fulfilledSource: row.fulfilled_source || undefined,
      fulfilledId: row.fulfilled_id || undefined,
    };
  }

  // ==================== 管理员配置和其他 ====================

  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      const result = await this.db
        .prepare('SELECT config FROM admin_config WHERE id = 1')
        .first();

      if (!result) return null;
      return JSON.parse(result.config as string);
    } catch (err) {
      logger.error('SQLStorageBase.getAdminConfig error:', err);
      return null;
    }
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO admin_config (id, config, updated_at)
          VALUES (1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at
        `,
        )
        .bind(JSON.stringify(config), Date.now())
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setAdminConfig error:', err);
      throw err;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const tables = [
        'play_records',
        'favorites',
        'search_history',
        'skip_configs',
        'music_v2_history',
        'music_v2_playlists',
        'music_v2_playlist_items',
        'danmaku_filter_configs',
        'notifications',
        'movie_requests',
        'user_movie_requests',
        'favorite_check_times',
        'global_config',
      ];

      for (const table of tables) {
        await this.db.prepare(`DELETE FROM ${table}`).run();
      }
    } catch (err) {
      logger.error('SQLStorageBase.clearAllData error:', err);
      throw err;
    }
  }

  async getGlobalValue(key: string): Promise<string | null> {
    try {
      const result = await this.db
        .prepare('SELECT value FROM global_config WHERE key = ?')
        .bind(key)
        .first();

      return result ? (result.value as string) : null;
    } catch (err) {
      logger.error('SQLStorageBase.getGlobalValue error:', err);
      return null;
    }
  }

  async setGlobalValue(key: string, value: string): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO global_config (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `,
        )
        .bind(key, value, Date.now())
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setGlobalValue error:', err);
      throw err;
    }
  }

  async deleteGlobalValue(key: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM global_config WHERE key = ?')
        .bind(key)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.deleteGlobalValue error:', err);
      throw err;
    }
  }

  async getLastFavoriteCheckTime(userName: string): Promise<number> {
    try {
      const result = await this.db
        .prepare(
          'SELECT last_check_time FROM favorite_check_times WHERE username = ?',
        )
        .bind(userName)
        .first();

      return (result?.last_check_time as number) || 0;
    } catch (err) {
      logger.error('SQLStorageBase.getLastFavoriteCheckTime error:', err);
      return 0;
    }
  }

  async setLastFavoriteCheckTime(
    userName: string,
    timestamp: number,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `
          INSERT INTO favorite_check_times (username, last_check_time)
          VALUES (?, ?)
          ON CONFLICT(username) DO UPDATE SET last_check_time = excluded.last_check_time
        `,
        )
        .bind(userName, timestamp)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.setLastFavoriteCheckTime error:', err);
      throw err;
    }
  }

  async updateLastMovieRequestTime(
    userName: string,
    timestamp: number,
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          'UPDATE users SET last_movie_request_time = ? WHERE username = ?',
        )
        .bind(timestamp, userName)
        .run();
    } catch (err) {
      logger.error('SQLStorageBase.updateLastMovieRequestTime error:', err);
      throw err;
    }
  }
}

class RedisHashAdapter {
  constructor(private db: DatabaseAdapter) {}

  async hSet(hashKey: string, field: string, value: string): Promise<void> {
    const key = `${hashKey}:${field}`;
    await this.db
      .prepare(
        `
        INSERT INTO global_config (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      )
      .bind(key, value, Date.now())
      .run();
  }

  async hGet(hashKey: string, field: string): Promise<string | null> {
    const key = `${hashKey}:${field}`;
    const result = await this.db
      .prepare('SELECT value FROM global_config WHERE key = ?')
      .bind(key)
      .first();

    return result ? (result.value as string) : null;
  }

  async hGetAll(hashKey: string): Promise<Record<string, string>> {
    const prefix = `${hashKey}:`;
    const results = await this.db
      .prepare('SELECT key, value FROM global_config WHERE key LIKE ?')
      .bind(`${prefix}%`)
      .all();

    const hash: Record<string, string> = {};

    if (results && results.results) {
      for (const row of results.results) {
        const fullKey = row.key as string;
        const field = fullKey.substring(prefix.length);
        hash[field] = row.value as string;
      }
    }

    return hash;
  }

  async hDel(hashKey: string, field: string): Promise<void> {
    const key = `${hashKey}:${field}`;
    await this.db
      .prepare('DELETE FROM global_config WHERE key = ?')
      .bind(key)
      .run();
  }

  async del(hashKey: string): Promise<void> {
    const prefix = `${hashKey}:`;
    await this.db
      .prepare('DELETE FROM global_config WHERE key LIKE ?')
      .bind(`${prefix}%`)
      .run();
  }
}
