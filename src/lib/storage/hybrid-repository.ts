'use client';

import { getAuthInfoFromBrowserCookie } from '../auth';
import { logger } from '../logger';
import type { PlayRecord, Favorite, SkipConfig, DanmakuFilterConfig } from '../types';
import type {
  IPlayRecordRepository,
  IFavoriteRepository,
  ISearchHistoryRepository,
  ISkipConfigRepository,
  IDanmakuFilterRepository,
} from './types';
import {
  ClientPlayRecordRepository,
  ClientFavoriteRepository,
  ClientSearchHistoryRepository,
  ClientSkipConfigRepository,
  ClientDanmakuFilterRepository,
  ClientMusicRepository,
} from './client-repository';

function getCurrentUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const info = getAuthInfoFromBrowserCookie();
    return info?.username ?? null;
  } catch {
    return null;
  }
}

export class HybridPlayRecordRepository implements IPlayRecordRepository {
  private inner = new ClientPlayRecordRepository();
  private cachePrefix = 'moontv_cache_';
  private cacheVersion = '1.0.0';
  private cacheExpireTime = 60 * 60 * 1000;

  private getUserCacheKey(username: string): string {
    return `${this.cachePrefix}${username}`;
  }

  private getUserCache(username: string): Record<string, any> {
    try {
      const cached = localStorage.getItem(this.getUserCacheKey(username));
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  }

  private saveUserCache(username: string, cache: Record<string, any>): void {
    try { localStorage.setItem(this.getUserCacheKey(username), JSON.stringify(cache)); } catch {}
  }

  private isCacheValid(cache: any): boolean {
    if (!cache?.timestamp) return false;
    return cache.version === this.cacheVersion && (Date.now() - cache.timestamp) < this.cacheExpireTime;
  }

  async get(userName: string, source: string, id: string): Promise<PlayRecord | null> {
    return this.inner.get(userName, source, id);
  }

  async save(userName: string, source: string, id: string, record: PlayRecord): Promise<void> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const data = cache.playRecords?.data || {};
      data[`${source}+${id}`] = record;
      cache.playRecords = { data, timestamp: Date.now(), version: this.cacheVersion };
      this.saveUserCache(username, cache);
      window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: data }));
    }
    await this.inner.save(userName, source, id, record);
  }

  async getAll(userName: string): Promise<Record<string, PlayRecord>> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const cached = cache.playRecords;
      if (cached && this.isCacheValid(cached)) {
        return cached.data;
      }
    }
    return this.inner.getAll(userName);
  }

  async delete(userName: string, source: string, id: string): Promise<void> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const data = cache.playRecords?.data || {};
      delete data[`${source}+${id}`];
      cache.playRecords = { data, timestamp: Date.now(), version: this.cacheVersion };
      this.saveUserCache(username, cache);
      window.dispatchEvent(new CustomEvent('playRecordsUpdated', { detail: data }));
    }
    await this.inner.delete(userName, source, id);
  }

  async cleanupOld(userName: string): Promise<void> {
    await this.inner.cleanupOld(userName);
  }

  async migrate(userName: string): Promise<void> {
    await this.inner.migrate(userName);
  }
}

export class HybridFavoriteRepository implements IFavoriteRepository {
  private inner = new ClientFavoriteRepository();
  private cachePrefix = 'moontv_cache_';
  private cacheVersion = '1.0.0';
  private cacheExpireTime = 60 * 60 * 1000;

  private getUserCache(username: string): Record<string, any> {
    try {
      const cached = localStorage.getItem(`${this.cachePrefix}${username}`);
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  }

  private saveUserCache(username: string, cache: Record<string, any>): void {
    try { localStorage.setItem(`${this.cachePrefix}${username}`, JSON.stringify(cache)); } catch {}
  }

  private isCacheValid(cache: any): boolean {
    if (!cache?.timestamp) return false;
    return cache.version === this.cacheVersion && (Date.now() - cache.timestamp) < this.cacheExpireTime;
  }

  async get(userName: string, source: string, id: string): Promise<Favorite | null> {
    return this.inner.get(userName, source, id);
  }

  async save(userName: string, source: string, id: string, favorite: Favorite): Promise<void> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const data = cache.favorites?.data || {};
      data[`${source}+${id}`] = favorite;
      cache.favorites = { data, timestamp: Date.now(), version: this.cacheVersion };
      this.saveUserCache(username, cache);
      window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: data }));
    }
    await this.inner.save(userName, source, id, favorite);
  }

  async getAll(userName: string): Promise<Record<string, Favorite>> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const cached = cache.favorites;
      if (cached && this.isCacheValid(cached)) {
        return cached.data;
      }
    }
    return this.inner.getAll(userName);
  }

  async delete(userName: string, source: string, id: string): Promise<void> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const data = cache.favorites?.data || {};
      delete data[`${source}+${id}`];
      cache.favorites = { data, timestamp: Date.now(), version: this.cacheVersion };
      this.saveUserCache(username, cache);
      window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: data }));
    }
    await this.inner.delete(userName, source, id);
  }

  async isFavorited(userName: string, source: string, id: string): Promise<boolean> {
    return this.inner.isFavorited(userName, source, id);
  }

  async getLastCheckTime(_userName: string): Promise<number> { return 0; }
  async setLastCheckTime(_userName: string, _timestamp: number): Promise<void> {}
  async migrate(_userName: string): Promise<void> {}
}

export class HybridSearchHistoryRepository implements ISearchHistoryRepository {
  private inner = new ClientSearchHistoryRepository();
  private cachePrefix = 'moontv_cache_';
  private cacheVersion = '1.0.0';
  private cacheExpireTime = 60 * 60 * 1000;

  private getUserCache(username: string): Record<string, any> {
    try {
      const cached = localStorage.getItem(`${this.cachePrefix}${username}`);
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  }

  private saveUserCache(username: string, cache: Record<string, any>): void {
    try { localStorage.setItem(`${this.cachePrefix}${username}`, JSON.stringify(cache)); } catch {}
  }

  private isCacheValid(cache: any): boolean {
    if (!cache?.timestamp) return false;
    return cache.version === this.cacheVersion && (Date.now() - cache.timestamp) < this.cacheExpireTime;
  }

  async get(userName: string): Promise<string[]> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const cached = cache.searchHistory;
      if (cached && this.isCacheValid(cached)) {
        return cached.data;
      }
    }
    return this.inner.get(userName);
  }

  async add(userName: string, keyword: string): Promise<void> {
    const username = getCurrentUsername();
    if (username) {
      const cache = this.getUserCache(username);
      const history: string[] = cache.searchHistory?.data || [];
      const updated = [keyword, ...history.filter((k: string) => k !== keyword)].slice(0, 20);
      cache.searchHistory = { data: updated, timestamp: Date.now(), version: this.cacheVersion };
      this.saveUserCache(username, cache);
      window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: updated }));
    }
    await this.inner.add(userName, keyword);
  }

  async delete(userName: string, keyword?: string): Promise<void> {
    await this.inner.delete(userName, keyword);
  }
}

export class HybridSkipConfigRepository implements ISkipConfigRepository {
  private inner = new ClientSkipConfigRepository();

  async get(userName: string, source: string, id: string): Promise<SkipConfig | null> {
    return this.inner.get(userName, source, id);
  }

  async set(userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    await this.inner.set(userName, source, id, config);
  }

  async delete(userName: string, source: string, id: string): Promise<void> {
    await this.inner.delete(userName, source, id);
  }

  async getAll(userName: string): Promise<Record<string, SkipConfig>> {
    return this.inner.getAll(userName);
  }

  async migrate(userName: string): Promise<void> {
    await this.inner.migrate(userName);
  }
}

export class HybridDanmakuFilterRepository implements IDanmakuFilterRepository {
  private inner = new ClientDanmakuFilterRepository();

  async get(userName: string): Promise<DanmakuFilterConfig | null> {
    return this.inner.get(userName);
  }

  async set(userName: string, config: DanmakuFilterConfig): Promise<void> {
    await this.inner.set(userName, config);
  }

  async delete(userName: string): Promise<void> {
    await this.inner.delete(userName);
  }
}

export function createClientRepositories() {
  return {
    playRecords: new HybridPlayRecordRepository(),
    favorites: new HybridFavoriteRepository(),
    searchHistory: new HybridSearchHistoryRepository(),
    skipConfigs: new HybridSkipConfigRepository(),
    danmakuFilters: new HybridDanmakuFilterRepository(),
    music: new ClientMusicRepository(),
  };
}