/* eslint-disable @typescript-eslint/no-explicit-any */

import { AdminConfig } from '../admin.types';
import {
  ApiSite,
  LiveCfg,
  ConfigFileStruct,
} from './types';

import { logger } from '../logger';

export function refineConfig(adminConfig: AdminConfig): AdminConfig {
  let fileConfig: ConfigFileStruct;
  try {
    fileConfig = JSON.parse(adminConfig.ConfigFile) as ConfigFileStruct;
  } catch (e) {
    fileConfig = {} as ConfigFileStruct;
  }

  const apiSitesFromFile = Object.entries(fileConfig.api_site || []);
  const currentApiSites = new Map(
    (adminConfig.SourceConfig || []).map((s) => [s.key, s]),
  );

  apiSitesFromFile.forEach(([key, site]) => {
    const existingSource = currentApiSites.get(key);
    if (existingSource) {
      existingSource.name = site.name;
      existingSource.api = site.api;
      existingSource.detail = site.detail;
      existingSource.from = 'config';
    } else {
      currentApiSites.set(key, {
        key,
        name: site.name,
        api: site.api,
        detail: site.detail,
        from: 'config',
        disabled: false,
      });
    }
  });

  const apiSitesFromFileKey = new Set(apiSitesFromFile.map(([key]) => key));
  currentApiSites.forEach((source) => {
    if (!apiSitesFromFileKey.has(source.key)) {
      source.from = 'custom';
    }
  });

  adminConfig.SourceConfig = Array.from(currentApiSites.values());

  const customCategoriesFromFile = fileConfig.custom_category || [];
  const currentCustomCategories = new Map(
    (adminConfig.CustomCategories || []).map((c) => [c.query + c.type, c]),
  );

  customCategoriesFromFile.forEach((category) => {
    const key = category.query + category.type;
    const existedCategory = currentCustomCategories.get(key);
    if (existedCategory) {
      existedCategory.name = category.name;
      existedCategory.query = category.query;
      existedCategory.type = category.type;
      existedCategory.from = 'config';
    } else {
      currentCustomCategories.set(key, {
        name: category.name,
        type: category.type,
        query: category.query,
        from: 'config',
        disabled: false,
      });
    }
  });

  const customCategoriesFromFileKeys = new Set(
    customCategoriesFromFile.map((c) => c.query + c.type),
  );
  currentCustomCategories.forEach((category) => {
    if (!customCategoriesFromFileKeys.has(category.query + category.type)) {
      category.from = 'custom';
    }
  });

  adminConfig.CustomCategories = Array.from(currentCustomCategories.values());



  return adminConfig;
}

export async function getInitConfig(
  configFile: string,
  subConfig: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  } = {
    URL: '',
    AutoUpdate: false,
    LastCheck: '',
  },
): Promise<AdminConfig> {
  let cfgFile: ConfigFileStruct;

  const envSubUrl = process.env.CONFIG_SUBSCRIPTION_URL || '';

  if (envSubUrl) {
    try {
      const response = await fetch(envSubUrl);
      if (response.ok) {
        const configContent = await response.text();
        const bs58 = (await import('bs58')).default;
        const decodedBytes = bs58.decode(configContent);
        const decodedContent = new TextDecoder().decode(decodedBytes);
        configFile = decodedContent;
        logger.info('已从订阅 URL 获取配置');
      }
    } catch (e) {
      logger.error('从订阅 URL 获取配置失败:', e);
    }
  }

  const envConfig = process.env.INIT_CONFIG || '';
  const configSource = envConfig || configFile;

  try {
    cfgFile = JSON.parse(configSource) as ConfigFileStruct;
  } catch (e) {
    cfgFile = {} as ConfigFileStruct;
  }

  const hasCustomDanmakuEnv = Boolean(
    process.env.DANMAKU_API_BASE?.trim() || process.env.DANMAKU_API_TOKEN?.trim(),
  );

  const adminConfig: AdminConfig = {
    ConfigFile: configSource,
    ConfigSubscribtion: subConfig,
    SiteConfig: {
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus',
      Announcement:
        process.env.ANNOUNCEMENT ||
        '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
      SearchDownstreamMaxPage:
        Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: cfgFile.cache_time || 7200,
      DoubanProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-ali',
      DoubanProxy: process.env.NEXT_PUBLIC_DOUBAN_PROXY || '',
      DoubanImageProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE ||
        'cmliussss-cdn-ali',
      DoubanImageProxy: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '',
      DisableYellowFilter:
        process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
      FluidSearch: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
      DanmakuSourceType: hasCustomDanmakuEnv ? 'custom' : 'builtin',
      DanmakuApiBase:
        process.env.DANMAKU_API_BASE ||
        (hasCustomDanmakuEnv
          ? 'http://localhost:9321'
          : 'https://mtvpls-danmu.netlify.app/87654321'),
      DanmakuApiToken: process.env.DANMAKU_API_TOKEN || '87654321',
      DanmakuAutoLoadDefault: true,

      PansouApiUrl: '',
      PansouUsername: '',
      PansouPassword: '',
      PansouKeywordBlocklist: '',
      MagnetProxy: '',
      MagnetMikanReverseProxy: '',
      MagnetDmhyReverseProxy: '',
      MagnetAcgripReverseProxy: '',
      EnableComments: false,
      EnableRegistration: false,
      RequireRegistrationInviteCode: false,
      RegistrationInviteCode: '',
      RegistrationRequireTurnstile: false,
      LoginRequireTurnstile: false,
      TurnstileSiteKey: '',
      TurnstileSecretKey: '',
      DefaultUserTags: [],
    },
    UserConfig: {
      Users: [],
    },
    SourceConfig: [],
    CustomCategories: [],
  };

  adminConfig.UserConfig.Users = [];

  Object.entries(cfgFile.api_site || []).forEach(([key, site]) => {
    adminConfig.SourceConfig.push({
      key: key,
      name: site.name,
      api: site.api,
      detail: site.detail,
      from: 'config',
      disabled: false,
    });
  });

  cfgFile.custom_category?.forEach((category) => {
    adminConfig.CustomCategories.push({
      name: category.name || category.query,
      type: category.type,
      query: category.query,
      from: 'config',
      disabled: false,
    });
  });

  return adminConfig;
}
