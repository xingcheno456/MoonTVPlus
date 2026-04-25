/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

/**
 * D1 Storage Implementation
 *
 * 注意：此模块仅在服务端使用，通过 webpack 配置排除客户端打包
 */

import { DatabaseAdapter } from './d1-adapter';
import { SQLStorageBase } from './sql-base.db';

/**
 * Cloudflare D1 存储实现
 *
 * 特点：
 * - 开发环境：使用 better-sqlite3（本地 SQLite 文件）
 * - 生产环境：使用 Cloudflare D1（云端分布式数据库）
 * - 统一接口：通过 DatabaseAdapter 抽象层实现
 *
 * 使用方式：
 * 1. 设置环境变量：NEXT_PUBLIC_STORAGE_TYPE=d1
 * 2. 开发环境：运行 npm run init:sqlite
 * 3. 生产环境：配置 wrangler.toml 并运行迁移
 */
export class D1Storage extends SQLStorageBase {
  constructor(adapter: DatabaseAdapter) {
    super(adapter);
  }

  async getUsersByTag(tagName: string): Promise<string[]> {
    try {
      const result = await this.db
        .prepare(
          `
          SELECT username FROM users
          WHERE tags LIKE ?
        `,
        )
        .bind(`%"${tagName}"%`)
        .all();

      if (!result.results) return [];

      return result.results.map((row: any) => row.username as string);
    } catch (err) {
      console.error('D1Storage.getUsersByTag error:', err);
      return [];
    }
  }

  async isSongInPlaylist(
    playlistId: string,
    platform: string,
    songId: string,
  ): Promise<boolean> {
    try {
      const result = await this.db
        .prepare(
          'SELECT 1 FROM music_playlist_songs WHERE playlist_id = ? AND platform = ? AND song_id = ? LIMIT 1',
        )
        .bind(playlistId, platform, songId)
        .first();

      return result !== null;
    } catch (err) {
      console.error('D1Storage.isSongInPlaylist error:', err);
      return false;
    }
  }
}
