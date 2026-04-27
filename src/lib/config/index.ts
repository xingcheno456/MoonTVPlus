// TODO: 逐步移除文件级 eslint-disable，改用行内禁用
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// NOTE: no-console 已移除，改用 logger 统一日志

export type { ApiSite, LiveCfg, ConfigFileStruct } from './types';
export {
  API_CONFIG,
  BUILTIN_DANMAKU_API_BASE,
} from './types';

export { refineConfig, getInitConfig } from './refine';

export { getConfig, setCachedConfig, clearConfigCache } from './loader';

export { configSelfCheck } from './self-check';

import { AdminConfig } from '../admin.types';
import { db, STORAGE_TYPE } from '../db';
import { getConfig } from './loader';
import type { ApiSite } from './types';

import { logger } from '../logger';

export async function resetConfig() {
  let originConfig: AdminConfig | null = null;
  try {
    originConfig = await db.getAdminConfig();
  } catch (e) {
    logger.error('获取管理员配置失败:', e);
  }
  if (!originConfig) {
    originConfig = {} as AdminConfig;
  }
  const { getInitConfig } = await import('./refine');
  const adminConfig = await getInitConfig(
    originConfig.ConfigFile,
    originConfig.ConfigSubscribtion,
  );
  const { setCachedConfig } = await import('./loader');
  setCachedConfig(adminConfig);
  await db.saveAdminConfig(adminConfig);
}

export async function getCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.SiteInterfaceCacheTime || 7200;
}

export async function getAvailableApiSites(
  user?: string,
): Promise<ApiSite[]> {
  const config = await getConfig();
  const allApiSites = config.SourceConfig.filter((s) => !s.disabled);

  if (!user) return allApiSites;

  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') return allApiSites;

  const userInfoV2 = await db.getUserInfoV2(user);
  if (!userInfoV2) return allApiSites;

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
