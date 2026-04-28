/* eslint-disable @typescript-eslint/no-explicit-any */

import { AdminConfig } from '../admin.types';
import { db, STORAGE_TYPE } from '../db';
import { configSelfCheck } from './self-check';
import { getInitConfig } from './refine';

import { logger } from '../logger';

let cachedConfig: AdminConfig;
let configInitPromise: Promise<AdminConfig> | null = null;

function mergeWithEnvOverrides(adminConfig: AdminConfig): AdminConfig {
  const hasCustomDanmakuEnv = Boolean(
    process.env.DANMAKU_API_BASE?.trim() || process.env.DANMAKU_API_TOKEN?.trim(),
  );

  const VALID_BOOL_VALUES = new Set(['true', 'false']);
  const VALID_SUWAYOMI_AUTH_MODES = new Set([
    'none',
    'basic_auth',
    'simple_login',
  ]);

  if (adminConfig.SiteConfig) {
    if (process.env.NEXT_PUBLIC_SITE_NAME) {
      adminConfig.SiteConfig.SiteName = process.env.NEXT_PUBLIC_SITE_NAME;
    }
    if (process.env.ANNOUNCEMENT) {
      adminConfig.SiteConfig.Announcement = process.env.ANNOUNCEMENT;
    }
    if (process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) {
      const pageNum = Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE);
      if (!isNaN(pageNum) && pageNum > 0 && Number.isInteger(pageNum)) {
        adminConfig.SiteConfig.SearchDownstreamMaxPage = pageNum;
      }
    }
    if (process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE) {
      adminConfig.SiteConfig.DoubanProxyType =
        process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE;
    }
    if (process.env.NEXT_PUBLIC_DOUBAN_PROXY) {
      adminConfig.SiteConfig.DoubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY;
    }
    if (process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE) {
      adminConfig.SiteConfig.DoubanImageProxyType =
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE;
    }
    if (process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY) {
      adminConfig.SiteConfig.DoubanImageProxy =
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY;
    }
    if (VALID_BOOL_VALUES.has(process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER || '')) {
      adminConfig.SiteConfig.DisableYellowFilter =
        process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true';
    }
    if (VALID_BOOL_VALUES.has(process.env.NEXT_PUBLIC_FLUID_SEARCH || '')) {
      adminConfig.SiteConfig.FluidSearch =
        process.env.NEXT_PUBLIC_FLUID_SEARCH === 'true';
    }

    if (hasCustomDanmakuEnv) {
      adminConfig.SiteConfig.DanmakuSourceType = 'custom';
    }
    if (process.env.DANMAKU_API_BASE) {
      adminConfig.SiteConfig.DanmakuApiBase = process.env.DANMAKU_API_BASE;
    } else if (
      hasCustomDanmakuEnv &&
      !adminConfig.SiteConfig.DanmakuApiBase
    ) {
      adminConfig.SiteConfig.DanmakuApiBase = 'http://localhost:9321';
    }
    if (process.env.DANMAKU_API_TOKEN) {
      adminConfig.SiteConfig.DanmakuApiToken = process.env.DANMAKU_API_TOKEN;
    }
    if (process.env.TMDB_API_KEY) {
      adminConfig.SiteConfig.TMDBApiKey = process.env.TMDB_API_KEY;
    }
    if (process.env.TMDB_PROXY) {
      adminConfig.SiteConfig.TMDBProxy = process.env.TMDB_PROXY;
    }
    if (process.env.TMDB_REVERSE_PROXY) {
      adminConfig.SiteConfig.TMDBReverseProxy =
        process.env.TMDB_REVERSE_PROXY;
    }
  }

  if (!adminConfig.SuwayomiConfig) {
    const hasSuwayomiEnv = Boolean(
      process.env.SUWAYOMI_ENABLED ||
      process.env.SUWAYOMI_URL ||
      process.env.NEXT_PUBLIC_SUWAYOMI_URL ||
      process.env.SUWAYOMI_AUTH_MODE ||
      process.env.SUWAYOMI_USERNAME ||
      process.env.SUWAYOMI_PASSWORD,
    );
    if (hasSuwayomiEnv) {
      adminConfig.SuwayomiConfig = {
        Enabled: false,
        ServerURL: '',
        AuthMode: 'none',
        Username: '',
        Password: '',
        DefaultLang: 'zh',
        SourceIds: [],
        MaxSources: 10,
      };
    }
  }
  if (adminConfig.SuwayomiConfig) {
    if (VALID_BOOL_VALUES.has(process.env.SUWAYOMI_ENABLED || '')) {
      adminConfig.SuwayomiConfig.Enabled =
        process.env.SUWAYOMI_ENABLED === 'true';
    }
    if (process.env.SUWAYOMI_URL || process.env.NEXT_PUBLIC_SUWAYOMI_URL) {
      adminConfig.SuwayomiConfig.ServerURL =
        process.env.SUWAYOMI_URL ||
        process.env.NEXT_PUBLIC_SUWAYOMI_URL ||
        '';
    }
    if (
      process.env.SUWAYOMI_AUTH_MODE &&
      VALID_SUWAYOMI_AUTH_MODES.has(process.env.SUWAYOMI_AUTH_MODE)
    ) {
      adminConfig.SuwayomiConfig.AuthMode = process.env
        .SUWAYOMI_AUTH_MODE as 'none' | 'basic_auth' | 'simple_login';
    }
    if (process.env.SUWAYOMI_USERNAME) {
      adminConfig.SuwayomiConfig.Username = process.env.SUWAYOMI_USERNAME;
    }
    if (process.env.SUWAYOMI_PASSWORD) {
      adminConfig.SuwayomiConfig.Password = process.env.SUWAYOMI_PASSWORD;
    }
    if (process.env.SUWAYOMI_DEFAULT_LANG) {
      adminConfig.SuwayomiConfig.DefaultLang =
        process.env.SUWAYOMI_DEFAULT_LANG;
    }
    if (process.env.SUWAYOMI_MAX_SOURCES) {
      const maxSources = Number(process.env.SUWAYOMI_MAX_SOURCES);
      if (
        !isNaN(maxSources) &&
        maxSources > 0 &&
        Number.isInteger(maxSources)
      ) {
        adminConfig.SuwayomiConfig.MaxSources = maxSources;
      }
    }
  }

  return adminConfig;
}

export async function getConfig(): Promise<AdminConfig> {
  if (cachedConfig) return cachedConfig;

  if (configInitPromise) return configInitPromise;

  configInitPromise = (async () => {
    const storageType = STORAGE_TYPE;

    if (storageType === 'localstorage') {
      logger.info('localStorage 模式：从环境变量初始化配置');
      const adminConfig = await getInitConfig('');
      try {
        cachedConfig = mergeWithEnvOverrides(configSelfCheck(adminConfig));
      } catch (error) {
        logger.error('配置初始化失败:', error);
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
      logger.error('获取管理员配置失败:', e);
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
        const storage = (db as any).storage;
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

export async function setCachedConfig(config: AdminConfig) {
  cachedConfig = config;
}

export async function clearConfigCache() {
  cachedConfig = undefined as any;
  configInitPromise = null;
}
