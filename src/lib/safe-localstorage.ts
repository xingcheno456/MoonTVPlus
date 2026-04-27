const STORAGE_QUOTA_RETRY_KEY = '__moontv_quota_cleared';

function handleQuotaExceeded(key: string, value: string, error: unknown): void {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    try {
      const oldestKey = findOldestCacheKey();
      if (oldestKey && oldestKey !== key) {
        localStorage.removeItem(oldestKey);
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      // give up
    }
  }
  throw error;
}

function findOldestCacheKey(): string | null {
  let oldestTime = Infinity;
  let oldestKey: string | null = null;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || k === STORAGE_QUOTA_RETRY_KEY) continue;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.timestamp === 'number') {
        if (parsed.timestamp < oldestTime) {
          oldestTime = parsed.timestamp;
          oldestKey = k;
        }
      }
    } catch {
      // not JSON, skip
    }
  }
  return oldestKey;
}

export const safeLocalStorage = {
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      handleQuotaExceeded(key, value, error);
    }
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  setObject<T>(key: string, value: T): void {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  },

  getObject<T>(key: string): T | null {
    const raw = safeLocalStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
};
