'use client';

import type {
  DanmakuFilterConfig as TypesDanmakuFilterConfig,
  Favorite as TypesFavorite,
  PlayRecord as TypesPlayRecord,
  SkipConfig,
} from '../types';
import { logger } from '../logger';
import type {
  IPlayRecordRepository,
  IFavoriteRepository,
  ISearchHistoryRepository,
  ISkipConfigRepository,
  IDanmakuFilterRepository,
  IMusicRepository,
} from './types';

import * as clientDb from '../db.client';

export class ClientPlayRecordRepository implements IPlayRecordRepository {
  async get(_userName: string, source: string, id: string): Promise<TypesPlayRecord | null> {
    const records = await clientDb.getAllPlayRecords() as unknown as Record<string, TypesPlayRecord>;
    const key = clientDb.generateStorageKey(source, id);
    return records[key] ?? null;
  }

  async save(_userName: string, source: string, id: string, record: TypesPlayRecord): Promise<void> {
    await clientDb.savePlayRecord(source, id, record as any);
  }

  async getAll(_userName: string): Promise<Record<string, TypesPlayRecord>> {
    return clientDb.getAllPlayRecords() as unknown as Record<string, TypesPlayRecord>;
  }

  async delete(_userName: string, source: string, id: string): Promise<void> {
    await clientDb.deletePlayRecord(source, id);
  }

  async cleanupOld(_userName: string): Promise<void> {}

  async migrate(_userName: string): Promise<void> {
    // migratePlayRecord requires fromSource/fromId/toSource/toId/record params - no-op for new repos
    logger.info('Play record migration should use db.migratePlayRecords() directly');
  }
}

export class ClientFavoriteRepository implements IFavoriteRepository {
  async get(_userName: string, source: string, id: string): Promise<TypesFavorite | null> {
    const all = await clientDb.getAllFavorites() as unknown as Record<string, TypesFavorite>;
    const key = clientDb.generateStorageKey(source, id);
    return all[key] ?? null;
  }

  async save(_userName: string, source: string, id: string, favorite: TypesFavorite): Promise<void> {
    await clientDb.saveFavorite(source, id, favorite as any);
  }

  async getAll(_userName: string): Promise<Record<string, TypesFavorite>> {
    return clientDb.getAllFavorites() as unknown as Record<string, TypesFavorite>;
  }

  async delete(_userName: string, source: string, id: string): Promise<void> {
    await clientDb.deleteFavorite(source, id);
  }

  async isFavorited(_userName: string, source: string, id: string): Promise<boolean> {
    return clientDb.isFavorited(source, id);
  }

  async getLastCheckTime(_userName: string): Promise<number> { return 0; }
  async setLastCheckTime(_userName: string, _timestamp: number): Promise<void> {}
  async migrate(_userName: string): Promise<void> {}
}

export class ClientSearchHistoryRepository implements ISearchHistoryRepository {
  async get(_userName: string): Promise<string[]> {
    return clientDb.getSearchHistory();
  }

  async add(_userName: string, keyword: string): Promise<void> {
    await clientDb.addSearchHistory(keyword);
  }

  async delete(_userName: string, keyword?: string): Promise<void> {
    if (keyword) {
      await clientDb.deleteSearchHistory(keyword);
    } else {
      await clientDb.clearSearchHistory();
    }
  }
}

export class ClientSkipConfigRepository implements ISkipConfigRepository {
  async get(_userName: string, source: string, id: string): Promise<SkipConfig | null> {
    return clientDb.getSkipConfig(source, id);
  }

  async set(_userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    await clientDb.saveSkipConfig(source, id, config);
  }

  async delete(_userName: string, source: string, id: string): Promise<void> {
    await clientDb.deleteSkipConfig(source, id);
  }

  async getAll(_userName: string): Promise<Record<string, SkipConfig>> {
    return clientDb.getAllSkipConfigs();
  }

  async migrate(_userName: string): Promise<void> {
    logger.warn('Skip config migration not supported in client mode');
  }
}

export class ClientDanmakuFilterRepository implements IDanmakuFilterRepository {
  async get(_userName: string): Promise<TypesDanmakuFilterConfig | null> {
    return clientDb.getDanmakuFilterConfig() as Promise<TypesDanmakuFilterConfig | null>;
  }

  async set(_userName: string, config: TypesDanmakuFilterConfig): Promise<void> {
    await clientDb.saveDanmakuFilterConfig(config);
  }

  async delete(_userName: string): Promise<void> {
    logger.warn('Danmaku filter config deletion not implemented in client mode');
  }
}

export class ClientMusicRepository implements IMusicRepository {
  async getPlayRecord(): Promise<any> { return null; }
  async savePlayRecord(): Promise<void> {}
  async batchSavePlayRecords(): Promise<void> {}
  async getAllPlayRecords(): Promise<any> { return {}; }
  async deletePlayRecord(): Promise<void> {}
  async clearAllPlayRecords(): Promise<void> {}
  async listV2History(): Promise<any> { return []; }
  async upsertV2History(): Promise<void> {}
  async batchUpsertV2History(): Promise<void> {}
  async deleteV2History(): Promise<void> {}
  async clearV2History(): Promise<void> {}
  async createV2Playlist(): Promise<void> {}
  async getV2Playlist(): Promise<any> { return null; }
  async listV2Playlists(): Promise<any> { return []; }
  async updateV2Playlist(): Promise<void> {}
  async deleteV2Playlist(): Promise<void> {}
  async addV2PlaylistItem(): Promise<void> {}
  async removeV2PlaylistItem(): Promise<void> {}
  async listV2PlaylistItems(): Promise<any> { return []; }
  async hasV2PlaylistItem(): Promise<any> { return false; }
  async createV1Playlist(): Promise<void> {}
  async getV1Playlist(): Promise<any> { return null; }
  async listV1Playlists(): Promise<any> { return []; }
  async updateV1Playlist(): Promise<void> {}
  async deleteV1Playlist(): Promise<void> {}
  async addV1PlaylistSong(): Promise<void> {}
  async removeV1PlaylistSong(): Promise<void> {}
  async listV1PlaylistSongs(): Promise<any> { return []; }
  async isSongInV1Playlist(): Promise<any> { return false; }
}