// Emby 缓存模块 - 用于缓存 Emby 媒体库数据

// 缓存条目接口
export interface EmbyCachedEntry<T> {
  expiresAt: number;
  data: T;
}

// 缓存配置
const EMBY_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6小时
const EMBY_VIEWS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1天
const MAX_EMBY_CACHE_SIZE = parseInt(
  process.env.EMBY_CACHE_MAX_SIZE || '500',
  10,
);
const EMBY_CACHE: Map<string, EmbyCachedEntry<any>> = new Map();
const EMBY_VIEWS_CACHE_KEY = 'emby:views';

let cacheHits = 0;
let cacheMisses = 0;

function evictIfNeeded() {
  if (EMBY_CACHE.size <= MAX_EMBY_CACHE_SIZE) return;

  const now = Date.now();
  const entries = Array.from(EMBY_CACHE.entries());

  // 优先删除过期条目
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) {
      EMBY_CACHE.delete(key);
    }
    if (EMBY_CACHE.size <= MAX_EMBY_CACHE_SIZE) return;
  }

  // 仍有超限，按过期时间排序淘汰最早过期的
  const remaining = Array.from(EMBY_CACHE.entries()).sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt,
  );
  const toRemove = EMBY_CACHE.size - MAX_EMBY_CACHE_SIZE;
  for (let i = 0; i < toRemove && i < remaining.length; i++) {
    EMBY_CACHE.delete(remaining[i][0]);
  }
}

/**
 * 生成 Emby 列表缓存键
 */
function makeListCacheKey(
  page: number,
  pageSize: number,
  parentId?: string,
  embyKey?: string,
): string {
  const keyPrefix = embyKey ? `emby:${embyKey}` : 'emby';
  return parentId
    ? `${keyPrefix}:list:${page}:${pageSize}:${parentId}`
    : `${keyPrefix}:list:${page}:${pageSize}`;
}

/**
 * 获取缓存的 Emby 列表数据
 */
export function getCachedEmbyList(
  page: number,
  pageSize: number,
  parentId?: string,
  embyKey?: string,
): any | null {
  const key = makeListCacheKey(page, pageSize, parentId, embyKey);
  const entry = EMBY_CACHE.get(key);
  if (!entry) {
    cacheMisses++;
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    EMBY_CACHE.delete(key);
    cacheMisses++;
    return null;
  }

  cacheHits++;
  return entry.data;
}

/**
 * 设置缓存的 Emby 列表数据
 */
export function setCachedEmbyList(
  page: number,
  pageSize: number,
  data: any,
  parentId?: string,
  embyKey?: string,
): void {
  const now = Date.now();
  const key = makeListCacheKey(page, pageSize, parentId, embyKey);
  evictIfNeeded();
  EMBY_CACHE.set(key, {
    expiresAt: now + EMBY_CACHE_TTL_MS,
    data,
  });
}

/**
 * 清除所有 Emby 缓存
 */
export function clearEmbyCache(): { cleared: number } {
  const size = EMBY_CACHE.size;
  EMBY_CACHE.clear();
  return { cleared: size };
}

/**
 * 获取缓存的 Emby 媒体库列表
 */
export function getCachedEmbyViews(embyKey = 'default'): any | null {
  const cacheKey = `${EMBY_VIEWS_CACHE_KEY}:${embyKey}`;
  const entry = EMBY_CACHE.get(cacheKey);
  if (!entry) {
    cacheMisses++;
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    EMBY_CACHE.delete(cacheKey);
    cacheMisses++;
    return null;
  }

  cacheHits++;
  return entry.data;
}

/**
 * 设置缓存的 Emby 媒体库列表
 */
export function setCachedEmbyViews(embyKey = 'default', data: any): void {
  const now = Date.now();
  const cacheKey = `${EMBY_VIEWS_CACHE_KEY}:${embyKey}`;
  evictIfNeeded();
  EMBY_CACHE.set(cacheKey, {
    expiresAt: now + EMBY_VIEWS_CACHE_TTL_MS,
    data,
  });
}

/**
 * 获取缓存统计信息
 */
export function getEmbyCacheStats(): {
  size: number;
  maxSize: number;
  keys: string[];
  hits: number;
  misses: number;
  hitRate: string;
} {
  const total = cacheHits + cacheMisses;
  return {
    size: EMBY_CACHE.size,
    maxSize: MAX_EMBY_CACHE_SIZE,
    keys: Array.from(EMBY_CACHE.keys()),
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? `${((cacheHits / total) * 100).toFixed(1)}%` : 'N/A',
  };
}
