import { AdminConfig } from '@/lib/admin.types';
import { db, STORAGE_TYPE } from '@/lib/db';

import { mergeWithEnvOverrides } from './env-mapping';
import { getInitConfig } from './init';
import { configSelfCheck } from './validation';
import { logger } from '../lib/logger';

let cachedConfig: AdminConfig | null = null;
let configInitPromise: Promise<AdminConfig> | null = null;

export async function getConfig(): Promise<AdminConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (configInitPromise) {
    return configInitPromise;
  }

  configInitPromise = (async () => {
    const storageType = STORAGE_TYPE;

    if (storageType === 'localstorage') {
      logger.info('localStorage 模式：从环境变量初始化配置');
      const adminConfig = await getInitConfig('');
      try {
        cachedConfig = mergeWithEnvOverrides(configSelfCheck(adminConfig));
      } catch (error) {
        logger.error('配置初始化失败', error);
        cachedConfig = adminConfig;
      }
      configInitPromise = null;
      return cachedConfig;
    }

    let adminConfig: AdminConfig | null = null;
    let dbReadFailed = false;
    try {
      adminConfig = await db.getAdminConfig();
    } catch (e) {
      logger.error('获取管理员配置失败', e);
      dbReadFailed = true;
    }

    if (!adminConfig) {
      if (dbReadFailed) {
        logger.warn('数据库读取失败，使用临时默认配置（不会保存到数据库）');
        adminConfig = await getInitConfig('');
      } else {
        logger.info('首次初始化配置');
        adminConfig = await getInitConfig('');
        await db.saveAdminConfig(adminConfig);
      }
    }

    const needsEmbyMigration =
      adminConfig.EmbyConfig &&
      adminConfig.EmbyConfig.ServerURL &&
      !adminConfig.EmbyConfig.Sources;

    adminConfig = configSelfCheck(adminConfig);

    if (!dbReadFailed && needsEmbyMigration) {
      try {
        await db.saveAdminConfig(adminConfig);
        logger.info('[Config] Emby配置迁移已保存到数据库');
      } catch (error) {
        logger.error('[Config] 保存迁移后的配置失败:', error);
      }
    }

    const nonOwnerUsers = adminConfig.UserConfig.Users.filter(
      (u) => u.username !== process.env.USERNAME,
    );
    if (!dbReadFailed && nonOwnerUsers.length > 0) {
      try {
        const storage = (db as unknown as { storage?: { createUserV2?: () => Promise<void> } }).storage;
        if (storage && typeof storage.createUserV2 === 'function') {
          logger.info('检测到配置中有用户，开始自动迁移...');
          await db.migrateUsersFromConfig(adminConfig);
          adminConfig.UserConfig.Users = [];
          await db.saveAdminConfig(adminConfig);
          logger.info('用户自动迁移完成');
        }
      } catch (error) {
        logger.error('自动迁移用户失败:', error);
      }
    }

    adminConfig = mergeWithEnvOverrides(adminConfig);
    cachedConfig = adminConfig;

    configInitPromise = null;
    return cachedConfig;
  })();

  return configInitPromise;
}

export async function resetConfig() {
  let originConfig: AdminConfig | null = null;
  try {
    originConfig = await db.getAdminConfig();
  } catch (e) {
    logger.error('获取管理员配置失败', e);
  }
  if (!originConfig) {
    originConfig = {} as AdminConfig;
  }
  const adminConfig = await getInitConfig(
    originConfig.ConfigFile,
    originConfig.ConfigSubscribtion,
  );
  cachedConfig = adminConfig;
  await db.saveAdminConfig(adminConfig);

  return;
}

export async function getCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.SiteInterfaceCacheTime || 7200;
}

export async function getAvailableApiSites(user?: string): Promise<import('./types').ApiSite[]> {
  const config = await getConfig();
  const allApiSites = config.SourceConfig.filter((s) => !s.disabled);

  if (!user) {
    return allApiSites;
  }

  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return allApiSites;
  }

  const userInfoV2 = await db.getUserInfoV2(user);
  if (!userInfoV2) {
    return allApiSites;
  }

  if (userInfoV2.enabledApis && userInfoV2.enabledApis.length > 0) {
    const userApiSitesSet = new Set(userInfoV2.enabledApis);
    return allApiSites
      .filter((s) => userApiSitesSet.has(s.key))
      .map((s) => ({
        key: s.key,
        name: s.name,
        api: s.api,
        detail: s.detail,
        proxyMode: s.proxyMode,
      }));
  }

  if (userInfoV2.tags && userInfoV2.tags.length > 0 && config.UserConfig.Tags) {
    const enabledApisFromTags = new Set<string>();

    userInfoV2.tags.forEach((tagName) => {
      const tagConfig = config.UserConfig.Tags?.find((t) => t.name === tagName);
      if (tagConfig && tagConfig.enabledApis) {
        tagConfig.enabledApis.forEach((apiKey) =>
          enabledApisFromTags.add(apiKey),
        );
      }
    });

    if (enabledApisFromTags.size > 0) {
      return allApiSites
        .filter((s) => enabledApisFromTags.has(s.key))
        .map((s) => ({
          key: s.key,
          name: s.name,
          api: s.api,
          detail: s.detail,
          proxyMode: s.proxyMode,
        }));
    }
  }

  return allApiSites;
}

export async function setCachedConfig(config: AdminConfig) {
  cachedConfig = config;
}

export async function clearConfigCache() {
  cachedConfig = null;
  configInitPromise = null;
}
