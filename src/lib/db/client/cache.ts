'use client';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { CacheData, Favorite, MusicPlayRecord, PlayRecord, UserCacheStore } from './types';
import type { DanmakuFilterConfig, SkipConfig } from '@/lib/types';

const CACHE_PREFIX = 'moontv_cache_';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRE_TIME = 60 * 60 * 1000;
class HybridCacheManager {
  private static instance: HybridCacheManager;

  // 正在进行的请求 Promise 缓存（彻底防止并发重复请求）
  private pendingRequests: Map<string, Promise<any>> = new Map();

  static getInstance(): HybridCacheManager {
    if (!HybridCacheManager.instance) {
      HybridCacheManager.instance = new HybridCacheManager();
    }
    return HybridCacheManager.instance;
  }

  /**
   * 获取或创建请求 Promise（防止并发重复请求）
   */
  getOrCreateRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // 如果已有正在进行的请求，直接返回
    if (this.pendingRequests.has(key)) {
      logger.info(`[${key}] 复用进行中的请求`);
      return this.pendingRequests.get(key)!;
    }

    logger.info(`[${key}] 创建新请求`);
    // 创建新请求
    const promise = fetcher().finally(() => {
      // 请求完成后清除缓存
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * 获取当前用户名
   */
  private getCurrentUsername(): string | null {
    const authInfo = getAuthInfoFromBrowserCookie();
    return authInfo?.username || null;
  }

  /**
   * 生成用户专属的缓存key
   */
  private getUserCacheKey(username: string): string {
    return `${CACHE_PREFIX}${username}`;
  }

  /**
   * 获取用户缓存数据
   */
  private getUserCache(username: string): UserCacheStore {
    if (typeof window === 'undefined') return {};

    try {
      const cacheKey = this.getUserCacheKey(username);
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      logger.warn('获取用户缓存失败:', error);
      return {};
    }
  }

  /**
   * 保存用户缓存数据
   */
  private saveUserCache(username: string, cache: UserCacheStore): void {
    if (typeof window === 'undefined') return;

    try {
      // 检查缓存大小，超过15MB时清理旧数据
      const cacheSize = JSON.stringify(cache).length;
      if (cacheSize > 15 * 1024 * 1024) {
        logger.warn('缓存过大，清理旧数据');
        this.cleanOldCache(cache);
      }

      const cacheKey = this.getUserCacheKey(username);
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      logger.warn('保存用户缓存失败:', error);
      // 存储空间不足时清理缓存后重试
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        this.clearAllCache();
        try {
          const cacheKey = this.getUserCacheKey(username);
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch (retryError) {
          logger.error('重试保存缓存仍然失败:', retryError);
        }
      }
    }
  }

  /**
   * 清理过期缓存数据
   */
  private cleanOldCache(cache: UserCacheStore): void {
    const now = Date.now();
    const maxAge = 60 * 24 * 60 * 60 * 1000; // 两个月

    // 清理过期的播放记录缓存
    if (cache.playRecords && now - cache.playRecords.timestamp > maxAge) {
      delete cache.playRecords;
    }

    // 清理过期的收藏缓存
    if (cache.favorites && now - cache.favorites.timestamp > maxAge) {
      delete cache.favorites;
    }
  }

  /**
   * 清理所有缓存
   */
  private clearAllCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('moontv_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid<T>(cache: CacheData<T>): boolean {
    const now = Date.now();
    return (
      cache.version === CACHE_VERSION &&
      now - cache.timestamp < CACHE_EXPIRE_TIME
    );
  }

  /**
   * 创建缓存数据
   */
  private createCacheData<T>(data: T): CacheData<T> {
    return {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
  }

  /**
   * 获取缓存的播放记录
   */
  getCachedPlayRecords(): Record<string, PlayRecord> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.playRecords;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 缓存播放记录
   */
  cachePlayRecords(data: Record<string, PlayRecord>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.playRecords = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 获取缓存的收藏
   */
  getCachedFavorites(): Record<string, Favorite> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.favorites;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 缓存收藏
   */
  cacheFavorites(data: Record<string, Favorite>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.favorites = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  getCachedSearchHistory(): string[] | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.searchHistory;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 缓存搜索历史
   */
  cacheSearchHistory(data: string[]): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.searchHistory = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 获取缓存的跳过片头片尾配置
   */
  getCachedSkipConfigs(): Record<string, SkipConfig> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.skipConfigs;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 缓存跳过片头片尾配置
   */
  cacheSkipConfigs(data: Record<string, SkipConfig>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.skipConfigs = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 弹幕过滤配置缓存方法
   */
  getCachedDanmakuFilterConfig(): DanmakuFilterConfig | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.danmakuFilterConfig;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  cacheDanmakuFilterConfig(data: DanmakuFilterConfig): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.danmakuFilterConfig = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 音乐播放记录缓存方法
   */
  getCachedMusicPlayRecords(): Record<string, MusicPlayRecord> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.musicPlayRecords;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  cacheMusicPlayRecords(data: Record<string, MusicPlayRecord>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.musicPlayRecords = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 清除指定用户的所有缓存
   */
  clearUserCache(username?: string): void {
    const targetUsername = username || this.getCurrentUsername();
    if (!targetUsername) return;

    try {
      const cacheKey = this.getUserCacheKey(targetUsername);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      logger.warn('清除用户缓存失败:', error);
    }
  }

  /**
   * 清除所有过期缓存
   */
  clearExpiredCaches(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          try {
            const cache = JSON.parse(localStorage.getItem(key) || '{}');
            // 检查是否有任何缓存数据过期
            let hasValidData = false;
            for (const [, cacheData] of Object.entries(cache)) {
              if (cacheData && this.isCacheValid(cacheData as CacheData<any>)) {
                hasValidData = true;
                break;
              }
            }
            if (!hasValidData) {
              keysToRemove.push(key);
            }
          } catch {
            // 解析失败的缓存也删除
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      logger.warn('清除过期缓存失败:', error);
    }
  }
}

// 获取缓存管理器实例
export const cacheManager = HybridCacheManager.getInstance();