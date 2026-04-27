/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Vercel Postgres Storage Implementation
 *
 * 兼容 D1Storage 的接口，使用 Vercel Postgres 作为后端
 *
 * 注意：此模块仅在服务端使用，通过 webpack 配置排除客户端打包
 */

import { DatabaseAdapter } from './d1-adapter';
import { logger } from './logger';
import { SQLStorageBase } from './sql-base.db';

/**
 * Vercel Postgres 存储实现
 *
 * 特点：
 * - 兼容 D1Storage 的所有接口
 * - 使用 Vercel Postgres (Neon) 作为数据库
 * - 支持 Vercel serverless 部署
 *
 * 使用方式：
 * 1. 设置环境变量：NEXT_PUBLIC_STORAGE_TYPE=postgres
 * 2. 配置 POSTGRES_URL 环境变量
 * 3. 运行数据库迁移脚本
 */
export class PostgresStorage extends SQLStorageBase {
  constructor(adapter: DatabaseAdapter) {
    super(adapter);
  }

  async getUsersByTag(tagName: string): Promise<string[]> {
    try {
      const result = await this.db
        .prepare(
          `
          SELECT username FROM users
          WHERE tags::jsonb ? ?
        `,
        )
        .bind(tagName)
        .all();

      if (!result.results) return [];

      return result.results.map((row: any) => row.username as string);
    } catch (err) {
      logger.error('PostgresStorage.getUsersByTag error:', err);
      return [];
    }
  }

  async updatePlaylistSongOrder(
    playlistId: string,
    songOrders: Array<{ platform: string; songId: string; sortOrder: number }>,
  ): Promise<void> {
    try {
      const statements = songOrders.map(({ platform, songId, sortOrder }) =>
        this.db
          .prepare(
            'UPDATE music_playlist_songs SET sort_order = ? WHERE playlist_id = ? AND platform = ? AND song_id = ?',
          )
          .bind(sortOrder, playlistId, platform, songId),
      );

      if (this.db.batch) {
        await this.db.batch(statements);
      }

      await this.db
        .prepare('UPDATE music_playlists SET updated_at = ? WHERE id = ?')
        .bind(Date.now(), playlistId)
        .run();
    } catch (err) {
      logger.error('PostgresStorage.updatePlaylistSongOrder error:', err);
      throw err;
    }
  }
}
