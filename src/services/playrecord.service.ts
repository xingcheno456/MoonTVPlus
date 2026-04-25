/* eslint-disable no-console */

import { db } from '@/lib/db';
import { DanmakuFilterConfig, Favorite, PlayRecord, SkipConfig } from '@/lib/types';

export function parseCompositeKey(key: string): { source: string; id: string } {
  const [source, id] = key.split('+');
  if (!source || !id) {
    throw new Error('Invalid key format');
  }
  return { source, id };
}

export async function ensurePlayRecordsMigrated(username: string): Promise<void> {
  const userInfoV2 = await db.getUserInfoV2(username);
  if (!userInfoV2?.playrecord_migrated) {
    console.log(`用户 ${username} 播放记录未迁移，开始执行迁移...`);
    await db.migratePlayRecords(username);
  }
}

export async function ensureFavoritesMigrated(username: string): Promise<void> {
  const userInfoV2 = await db.getUserInfoV2(username);
  if (!userInfoV2?.favorite_migrated) {
    console.log(`用户 ${username} 收藏未迁移，开始执行迁移...`);
    await db.migrateFavorites(username);
  }
}

export async function ensureSkipConfigsMigrated(username: string): Promise<void> {
  const userInfoV2 = await db.getUserInfoV2(username);
  if (!userInfoV2?.skip_migrated) {
    await db.migrateSkipConfigs(username);
  }
}

export async function getAllPlayRecords(username: string): Promise<Record<string, PlayRecord>> {
  await ensurePlayRecordsMigrated(username);
  return db.getAllPlayRecords(username);
}

export async function savePlayRecord(
  username: string,
  key: string,
  record: PlayRecord,
): Promise<void> {
  const { source, id } = parseCompositeKey(key);

  if (!record.title || !record.source_name || record.index < 1) {
    throw new Error('Invalid record data');
  }

  const finalRecord: PlayRecord = {
    ...record,
    save_time: record.save_time ?? Date.now(),
  };

  await db.savePlayRecord(username, source, id, finalRecord);

  (db as any).storage.cleanupOldPlayRecords(username).catch((err: Error) => {
    console.error('异步清理播放记录失败:', err);
  });
}

export async function deletePlayRecord(
  username: string,
  key?: string,
): Promise<void> {
  if (key) {
    const { source, id } = parseCompositeKey(key);
    await db.deletePlayRecord(username, source, id);
  } else {
    const all = await db.getAllPlayRecords(username);
    await Promise.all(
      Object.keys(all).map(async (k) => {
        const { source, id } = parseCompositeKey(k);
        await db.deletePlayRecord(username, source, id);
      }),
    );
  }
}

export async function getAllFavorites(username: string): Promise<Record<string, Favorite>> {
  await ensureFavoritesMigrated(username);
  return db.getAllFavorites(username);
}

export async function getFavorite(
  username: string,
  key: string,
): Promise<Favorite | null> {
  const { source, id } = parseCompositeKey(key);
  return db.getFavorite(username, source, id);
}

export async function saveFavorite(
  username: string,
  key: string,
  favorite: Favorite,
): Promise<void> {
  const { source, id } = parseCompositeKey(key);

  if (!favorite.title || !favorite.source_name) {
    throw new Error('Invalid favorite data');
  }

  const finalFavorite: Favorite = {
    ...favorite,
    save_time: favorite.save_time ?? Date.now(),
  };

  await db.saveFavorite(username, source, id, finalFavorite);
}

export async function deleteFavorite(
  username: string,
  key?: string,
): Promise<void> {
  if (key) {
    const { source, id } = parseCompositeKey(key);
    await db.deleteFavorite(username, source, id);
  } else {
    const all = await db.getAllFavorites(username);
    await Promise.all(
      Object.keys(all).map(async (k) => {
        const { source, id } = parseCompositeKey(k);
        await db.deleteFavorite(username, source, id);
      }),
    );
  }
}

export async function getSearchHistory(username: string): Promise<string[]> {
  return db.getSearchHistory(username);
}

export async function addSearchHistory(
  username: string,
  keyword: string,
): Promise<string[]> {
  await db.addSearchHistory(username, keyword);
  const history = await db.getSearchHistory(username);
  return history.slice(0, 20);
}

export async function deleteSearchHistory(
  username: string,
  keyword?: string,
): Promise<void> {
  await db.deleteSearchHistory(username, keyword);
}

export async function getAllSkipConfigs(username: string): Promise<Record<string, SkipConfig>> {
  await ensureSkipConfigsMigrated(username);
  return db.getAllSkipConfigs(username);
}

export async function getSkipConfig(
  username: string,
  source: string,
  id: string,
): Promise<SkipConfig | null> {
  return db.getSkipConfig(username, source, id);
}

export async function saveSkipConfig(
  username: string,
  key: string,
  config: { enable?: boolean; intro_time?: number; outro_time?: number },
): Promise<void> {
  const { source, id } = parseCompositeKey(key);

  const skipConfig: SkipConfig = {
    enable: Boolean(config.enable),
    intro_time: Number(config.intro_time) || 0,
    outro_time: Number(config.outro_time) || 0,
  };

  await db.setSkipConfig(username, source, id, skipConfig);
}

export async function deleteSkipConfig(
  username: string,
  key: string,
): Promise<void> {
  const { source, id } = parseCompositeKey(key);
  await db.deleteSkipConfig(username, source, id);
}

export async function getDanmakuFilterConfig(
  username: string,
): Promise<DanmakuFilterConfig | null> {
  return db.getDanmakuFilterConfig(username);
}

export async function saveDanmakuFilterConfig(
  username: string,
  config: DanmakuFilterConfig,
): Promise<void> {
  if (!config || !Array.isArray(config.rules)) {
    throw new Error('配置格式错误');
  }

  const validatedConfig: DanmakuFilterConfig = {
    rules: config.rules.map((rule) => ({
      keyword: String(rule.keyword || ''),
      type: rule.type === 'regex' || rule.type === 'normal' ? rule.type : 'normal',
      enabled: Boolean(rule.enabled),
      id: rule.id || undefined,
    })),
  };

  await db.setDanmakuFilterConfig(username, validatedConfig);
}
