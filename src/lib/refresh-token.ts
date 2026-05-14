
import type { RedisAdapter } from './redis-adapter';
import { logger } from './logger';
import { TOKEN_CONFIG } from './token-config';

export { TOKEN_CONFIG };

let getStorageFn: (() => ReturnType<typeof import('./db').getStorage>) | null = null;

async function loadStorage() {
  if (!getStorageFn) {
    const db = await import('./db');
    getStorageFn = db.getStorage;
  }
  return getStorageFn();
}

interface StorageWithAdapter {
  adapter?: RedisAdapter;
}

interface TokenStorage {
  getToken(username: string, tokenId: string): Promise<string | null>;
  setToken(username: string, tokenId: string, data: string): Promise<void>;
  deleteToken(username: string, tokenId: string): Promise<void>;
  getAllTokens(username: string): Promise<Record<string, string>>;
  deleteAllTokens(username: string): Promise<void>;
}

let cachedTokenStorage: TokenStorage | null = null;

async function getTokenStorage(): Promise<TokenStorage> {
  if (cachedTokenStorage) return cachedTokenStorage;

  const storage = await loadStorage();
  if (!storage) {
    throw new Error('Storage not initialized');
  }

  const adapter = (storage as StorageWithAdapter).adapter;
  if (adapter && typeof adapter.hSet === 'function') {
    cachedTokenStorage = {
      getToken: (u, t) => adapter.hGet(`user_tokens:${u}`, t),
      setToken: async (u, t, d) => {
        await adapter.hSet(`user_tokens:${u}`, t, d);
      },
      deleteToken: async (u, t) => {
        await adapter.hDel(`user_tokens:${u}`, t);
      },
      getAllTokens: (u) => adapter.hGetAll(`user_tokens:${u}`),
      deleteAllTokens: async (u) => {
        await adapter.del(`user_tokens:${u}`);
      },
    };
    return cachedTokenStorage;
  }

  const { db } = await import('./db');
  cachedTokenStorage = {
    async getToken(u, t) {
      return db.getGlobalValue(`user_tokens:${u}:${t}`);
    },
    async setToken(u, t, d) {
      await db.setGlobalValue(`user_tokens:${u}:${t}`, d);
      const indexKey = `user_tokens_index:${u}`;
      const indexStr = await db.getGlobalValue(indexKey);
      let tokenIds: string[] = [];
      try {
        tokenIds = indexStr ? JSON.parse(indexStr) : [];
      } catch { tokenIds = []; }
      if (!tokenIds.includes(t)) {
        tokenIds.push(t);
        await db.setGlobalValue(indexKey, JSON.stringify(tokenIds));
      }
    },
    async deleteToken(u, t) {
      await db.deleteGlobalValue(`user_tokens:${u}:${t}`);
      const indexKey = `user_tokens_index:${u}`;
      const indexStr = await db.getGlobalValue(indexKey);
      let tokenIds: string[] = [];
      try {
        tokenIds = indexStr ? JSON.parse(indexStr) : [];
      } catch { tokenIds = []; }
      const filtered = tokenIds.filter((id) => id !== t);
      if (filtered.length > 0) {
        await db.setGlobalValue(indexKey, JSON.stringify(filtered));
      } else {
        await db.deleteGlobalValue(indexKey);
      }
    },
    async getAllTokens(u) {
      const indexKey = `user_tokens_index:${u}`;
      const indexStr = await db.getGlobalValue(indexKey);
      let tokenIds: string[] = [];
      try {
        tokenIds = indexStr ? JSON.parse(indexStr) : [];
      } catch { tokenIds = []; }
      const result: Record<string, string> = {};
      for (const tid of tokenIds) {
        const data = await db.getGlobalValue(`user_tokens:${u}:${tid}`);
        if (data) result[tid] = data;
      }
      return result;
    },
    async deleteAllTokens(u) {
      const indexKey = `user_tokens_index:${u}`;
      const indexStr = await db.getGlobalValue(indexKey);
      let tokenIds: string[] = [];
      try {
        tokenIds = indexStr ? JSON.parse(indexStr) : [];
      } catch { tokenIds = []; }
      for (const tid of tokenIds) {
        await db.deleteGlobalValue(`user_tokens:${u}:${tid}`);
      }
      await db.deleteGlobalValue(indexKey);
    },
  };
  return cachedTokenStorage;
}

interface TokenData {
  token: string;
  deviceInfo: string;
  createdAt: number;
  expiresAt: number;
  lastUsed: number;
}

export function generateTokenId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export async function storeRefreshToken(
  username: string,
  tokenId: string,
  tokenData: TokenData,
): Promise<void> {
  try {
    const tokenStorage = await getTokenStorage();
    await tokenStorage.setToken(username, tokenId, JSON.stringify(tokenData));
    logger.info(`Stored refresh token for ${username}:${tokenId}`);
  } catch (error) {
    logger.error('Failed to store refresh token:', error);
    throw error;
  }
}

export async function verifyRefreshToken(
  username: string,
  tokenId: string,
  refreshToken: string,
): Promise<boolean> {
  try {
    const tokenStorage = await getTokenStorage();
    const dataStr = await tokenStorage.getToken(username, tokenId);

    if (!dataStr) {
      return false;
    }

    const tokenData: TokenData = JSON.parse(dataStr);

    if (Date.now() > tokenData.expiresAt) {
      await tokenStorage.deleteToken(username, tokenId);
      return false;
    }

    if (tokenData.token !== refreshToken) {
      return false;
    }

    tokenData.lastUsed = Date.now();
    await tokenStorage.setToken(username, tokenId, JSON.stringify(tokenData));

    return true;
  } catch (error) {
    logger.error('Failed to verify refresh token:', error);
    return false;
  }
}

export async function revokeRefreshToken(
  username: string,
  tokenId: string,
): Promise<void> {
  try {
    const tokenStorage = await getTokenStorage();
    await tokenStorage.deleteToken(username, tokenId);
    logger.info(`Revoked refresh token for ${username}:${tokenId}`);
  } catch (error) {
    logger.error('Failed to revoke refresh token:', error);
  }
}

export async function getUserDevices(username: string): Promise<
  Array<{
    tokenId: string;
    deviceInfo: string;
    createdAt: number;
    lastUsed: number;
    expiresAt: number;
  }>
> {
  try {
    const tokenStorage = await getTokenStorage();
    const allTokens = await tokenStorage.getAllTokens(username);

    if (!allTokens || typeof allTokens !== 'object') {
      return [];
    }

    const devices = [];
    const now = Date.now();

    for (const [tokenId, dataStr] of Object.entries(allTokens)) {
      try {
        const tokenData: TokenData = JSON.parse(dataStr as string);

        if (now > tokenData.expiresAt) {
          await tokenStorage.deleteToken(username, tokenId);
          continue;
        }

        devices.push({
          tokenId,
          deviceInfo: tokenData.deviceInfo,
          createdAt: tokenData.createdAt,
          lastUsed: tokenData.lastUsed,
          expiresAt: tokenData.expiresAt,
        });
      } catch (err) {
        logger.error(`Failed to parse token data for ${tokenId}:`, err);
      }
    }

    return devices;
  } catch (error) {
    logger.error('Failed to get user devices:', error);
    return [];
  }
}

export async function revokeAllRefreshTokens(username: string): Promise<void> {
  try {
    const tokenStorage = await getTokenStorage();
    await tokenStorage.deleteAllTokens(username);
    logger.info(`Revoked all refresh tokens for ${username}`);
  } catch (error) {
    logger.error('Failed to revoke all refresh tokens:', error);
  }
}

export async function cleanupExpiredTokens(username: string): Promise<number> {
  try {
    const tokenStorage = await getTokenStorage();
    const allTokens = await tokenStorage.getAllTokens(username);

    if (!allTokens || typeof allTokens !== 'object') {
      return 0;
    }

    const now = Date.now();
    let cleanedCount = 0;

    for (const [tokenId, dataStr] of Object.entries(allTokens)) {
      try {
        const tokenData: TokenData = JSON.parse(dataStr as string);

        if (now > tokenData.expiresAt) {
          await tokenStorage.deleteToken(username, tokenId);
          cleanedCount++;
        }
      } catch (err) {
        logger.error(`Failed to parse token data for ${tokenId}:`, err);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired tokens for ${username}`);
    }

    return cleanedCount;
  } catch (error) {
    logger.error('Failed to cleanup expired tokens:', error);
    return 0;
  }
}
