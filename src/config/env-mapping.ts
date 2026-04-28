import { AdminConfig } from '@/lib/admin.types';


const VALID_BOOL_VALUES = new Set(['true', 'false']);
const VALID_SUWAYOMI_AUTH_MODES = new Set([
  'none',
  'basic_auth',
  'simple_login',
]);

export function mergeWithEnvOverrides(adminConfig: AdminConfig): AdminConfig {
  const hasCustomDanmakuEnv = Boolean(
    process.env.DANMAKU_API_BASE?.trim() || process.env.DANMAKU_API_TOKEN?.trim(),
  );

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
      adminConfig.SuwayomiConfig.DefaultLang = process.env.SUWAYOMI_DEFAULT_LANG;
    }
    if (process.env.SUWAYOMI_MAX_SOURCES) {
      const maxSources = Number(process.env.SUWAYOMI_MAX_SOURCES);
      if (!isNaN(maxSources) && maxSources > 0 && Number.isInteger(maxSources)) {
        adminConfig.SuwayomiConfig.MaxSources = maxSources;
      }
    }
  }

  return adminConfig;
}
