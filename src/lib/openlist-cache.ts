// metainfo.json 缓存 (7天)
interface MetaInfoCacheEntry {
  expiresAt: number;
  data: MetaInfo;
}

// videoinfo.json 缓存 (1天)
interface VideoInfoCacheEntry {
  expiresAt: number;
  data: VideoInfo;
}

const METAINFO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7天
const VIDEOINFO_CACHE_TTL_MS =
  parseInt(process.env.VIDEOINFO_CACHE_MINUTES || '1440', 10) * 60 * 1000; // 默认1天

// 添加缓存大小上限，防止内存泄漏
const MAX_VIDEOINFO_CACHE_SIZE = parseInt(process.env.VIDEOINFO_CACHE_MAX || '500', 10);

const METAINFO_CACHE: Map<string, MetaInfoCacheEntry> = new Map();
const VIDEOINFO_CACHE: Map<string, VideoInfoCacheEntry> = new Map();

export interface MetaInfo {
  folders: {
    [key: string]: {
      folderName: string; // 原始文件夹名称
      tmdb_id: number;
      title: string;
      poster_path: string | null;
      release_date: string;
      overview: string;
      vote_average: number;
      media_type: 'movie' | 'tv';
      last_updated: number;
      failed?: boolean; // 标记是否搜索失败
      season_number?: number; // 季度编号（仅电视剧）
      season_name?: string; // 季度名称（仅电视剧）
    };
  };
  last_refresh: number;
}

export interface VideoInfo {
  episodes: {
    [fileName: string]: {
      episode: number;
      season?: number;
      title?: string;
      parsed_from: 'videoinfo' | 'filename';
      isOVA?: boolean;
    };
  };
  last_updated: number;
}

// MetaInfo 缓存操作（使用固定键）
const METAINFO_CACHE_KEY = 'openlist_meta';

export function getCachedMetaInfo(): MetaInfo | null {
  const entry = METAINFO_CACHE.get(METAINFO_CACHE_KEY);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    METAINFO_CACHE.delete(METAINFO_CACHE_KEY);
    return null;
  }

  return entry.data;
}

export function setCachedMetaInfo(data: MetaInfo): void {
  METAINFO_CACHE.set(METAINFO_CACHE_KEY, {
    expiresAt: Date.now() + METAINFO_CACHE_TTL_MS,
    data,
  });
}

export function invalidateMetaInfoCache(): void {
  METAINFO_CACHE.delete(METAINFO_CACHE_KEY);
}

// VideoInfo 缓存操作
export function getCachedVideoInfo(folderPath: string): VideoInfo | null {
  const entry = VIDEOINFO_CACHE.get(folderPath);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    VIDEOINFO_CACHE.delete(folderPath);
    return null;
  }

  return entry.data;
}

export function setCachedVideoInfo(folderPath: string, data: VideoInfo): void {
  // 超过上限时清理最旧的条目
  if (VIDEOINFO_CACHE.size >= MAX_VIDEOINFO_CACHE_SIZE) {
    const entries = Array.from(VIDEOINFO_CACHE.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDelete = entries.slice(0, Math.ceil(MAX_VIDEOINFO_CACHE_SIZE * 0.2));
    toDelete.forEach(([key]) => VIDEOINFO_CACHE.delete(key));
  }
  VIDEOINFO_CACHE.set(folderPath, {
    expiresAt: Date.now() + VIDEOINFO_CACHE_TTL_MS,
    data,
  });
}

export function invalidateVideoInfoCache(folderPath: string): void {
  VIDEOINFO_CACHE.delete(folderPath);
}
