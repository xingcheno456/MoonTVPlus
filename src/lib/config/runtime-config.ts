import { getConfig } from './index';
import { listEnabledSourceScripts } from '../source-script';

export interface RuntimeConfig {
  SITE_NAME: string;
  ANNOUNCEMENT: string;
  TMDB_API_KEY: string;
  STORAGE_TYPE: string;
  DISPLAY_STORAGE_TYPE: string;
  DOUBAN_PROXY_TYPE: string;
  DOUBAN_PROXY: string;
  DOUBAN_IMAGE_PROXY_TYPE: string;
  DOUBAN_IMAGE_PROXY: string;
  DISABLE_YELLOW_FILTER: boolean;
  CUSTOM_CATEGORIES: { name: string; type: 'movie' | 'tv'; query: string }[];
  FLUID_SEARCH: boolean;
  EnableComments: boolean;
  DANMAKU_AUTO_LOAD_DEFAULT: boolean;
  RecommendationDataSource: string;
  ENABLE_TVBOX_SUBSCRIBE: boolean;
  ENABLE_OFFLINE_DOWNLOAD: boolean;
  VOICE_CHAT_STRATEGY: string;
  OPENLIST_ENABLED: boolean;
  EMBY_ENABLED: boolean;
  XIAOYA_ENABLED: boolean;
  PRIVATE_LIBRARY_ENABLED: boolean;
  LOGIN_BACKGROUND_IMAGE: string;
  REGISTER_BACKGROUND_IMAGE: string;
  PROGRESS_THUMB_TYPE: string;
  PROGRESS_THUMB_PRESET_ID: string;
  PROGRESS_THUMB_CUSTOM_URL: string;
  ENABLE_REGISTRATION: boolean;
  REQUIRE_REGISTRATION_INVITE_CODE: boolean;
  LOGIN_REQUIRE_TURNSTILE: boolean;
  REGISTRATION_REQUIRE_TURNSTILE: boolean;
  TURNSTILE_SITE_KEY: string;
  ENABLE_OIDC_LOGIN: boolean;
  ENABLE_OIDC_REGISTRATION: boolean;
  OIDC_BUTTON_TEXT: string;
  AI_ENABLED: boolean;
  AI_ENABLE_HOMEPAGE_ENTRY: boolean;
  AI_ENABLE_VIDEOCARD_ENTRY: boolean;
  AI_ENABLE_PLAYPAGE_ENTRY: boolean;
  AIConfig: { EnableAIComments: boolean };
  AI_DEFAULT_MESSAGE_NO_VIDEO: string;
  AI_DEFAULT_MESSAGE_WITH_VIDEO: string;
  ENABLE_MOVIE_REQUEST: boolean;
  ADVANCED_RECOMMENDATION_ENABLED: boolean;
  CUSTOM_AD_FILTER_VERSION: number;
  MUSIC_ENABLED: boolean;
  MUSIC_PROXY_ENABLED: boolean;
  SUWAYOMI_ENABLED: boolean;
  FESTIVE_EFFECT_ENABLED: boolean;
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus';
  let announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';

  let doubanProxyType =
    process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-tencent';
  let doubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY || '';
  let doubanImageProxyType =
    process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE || 'cmliussss-cdn-tencent';
  let doubanImageProxy = process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '';
  let disableYellowFilter =
    process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true';
  let fluidSearch = process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false';
  let enableComments = false;
  let danmakuAutoLoadDefault = true;
  let recommendationDataSource = 'Mixed';
  let tmdbApiKey = '';
  let openListEnabled = false;
  let embyEnabled = false;
  let xiaoyaEnabled = false;
  let loginBackgroundImage = '';
  let registerBackgroundImage = '';
  let progressThumbType = 'default';
  let progressThumbPresetId = '';
  let progressThumbCustomUrl = '';
  let enableRegistration = false;
  let requireRegistrationInviteCode = false;
  let loginRequireTurnstile = false;
  let registrationRequireTurnstile = false;
  let turnstileSiteKey = '';
  let enableOIDCLogin = false;
  let enableOIDCRegistration = false;
  let oidcButtonText = '';
  let aiEnabled = false;
  let aiEnableHomepageEntry = false;
  let aiEnableVideoCardEntry = false;
  let aiEnablePlayPageEntry = false;
  let aiEnableComments = false;
  let aiDefaultMessageNoVideo = '';
  let aiDefaultMessageWithVideo = '';
  let enableMovieRequest = true;
  let customAdFilterVersion = 0;
  let tuneHubEnabled = false;
  let suwayomiEnabled = false;
  let musicProxyEnabled = true;
  let advancedRecommendationEnabled = false;
  let customCategories = [] as {
    name: string;
    type: 'movie' | 'tv';
    query: string;
  }[];

  if (storageType !== 'localstorage') {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
    announcement = config.SiteConfig.Announcement;

    doubanProxyType = config.SiteConfig.DoubanProxyType;
    doubanProxy = config.SiteConfig.DoubanProxy;
    doubanImageProxyType = config.SiteConfig.DoubanImageProxyType;
    doubanImageProxy = config.SiteConfig.DoubanImageProxy;
    disableYellowFilter = config.SiteConfig.DisableYellowFilter;
    customCategories = config.CustomCategories.filter(
      (category) => !category.disabled,
    ).map((category) => ({
      name: category.name || '',
      type: category.type,
      query: category.query,
    }));
    fluidSearch = config.SiteConfig.FluidSearch;
    enableComments = config.SiteConfig.EnableComments;
    danmakuAutoLoadDefault = config.SiteConfig.DanmakuAutoLoadDefault !== false;
    recommendationDataSource =
      config.SiteConfig.RecommendationDataSource || 'Mixed';
    tmdbApiKey = config.SiteConfig.TMDBApiKey || '';
    loginBackgroundImage = config.ThemeConfig?.loginBackgroundImage || '';
    registerBackgroundImage = config.ThemeConfig?.registerBackgroundImage || '';
    progressThumbType = config.ThemeConfig?.progressThumbType || 'default';
    progressThumbPresetId = config.ThemeConfig?.progressThumbPresetId || '';
    progressThumbCustomUrl = config.ThemeConfig?.progressThumbCustomUrl || '';
    enableRegistration = config.SiteConfig.EnableRegistration || false;
    requireRegistrationInviteCode =
      config.SiteConfig.RequireRegistrationInviteCode || false;
    loginRequireTurnstile = config.SiteConfig.LoginRequireTurnstile || false;
    registrationRequireTurnstile =
      config.SiteConfig.RegistrationRequireTurnstile || false;
    turnstileSiteKey = config.SiteConfig.TurnstileSiteKey || '';
    enableOIDCLogin = config.SiteConfig.EnableOIDCLogin || false;
    enableOIDCRegistration = config.SiteConfig.EnableOIDCRegistration || false;
    oidcButtonText = config.SiteConfig.OIDCButtonText || '';
    aiEnabled = config.AIConfig?.Enabled || false;
    aiEnableHomepageEntry = config.AIConfig?.EnableHomepageEntry || false;
    aiEnableVideoCardEntry = config.AIConfig?.EnableVideoCardEntry || false;
    aiEnablePlayPageEntry = config.AIConfig?.EnablePlayPageEntry || false;
    aiEnableComments = config.AIConfig?.EnableAIComments || false;
    aiDefaultMessageNoVideo = config.AIConfig?.DefaultMessageNoVideo || '';
    aiDefaultMessageWithVideo = config.AIConfig?.DefaultMessageWithVideo || '';
    enableMovieRequest = config.SiteConfig.EnableMovieRequest ?? true;
    customAdFilterVersion = config.SiteConfig?.CustomAdFilterVersion || 0;
    tuneHubEnabled = config.MusicConfig?.Enabled || false;
    musicProxyEnabled = config.MusicConfig?.ProxyEnabled ?? true;
    suwayomiEnabled = !!(
      config.SuwayomiConfig?.Enabled && config.SuwayomiConfig?.ServerURL
    );
    advancedRecommendationEnabled =
      (await listEnabledSourceScripts()).length > 0;
    openListEnabled = !!(
      config.OpenListConfig?.Enabled &&
      config.OpenListConfig?.URL &&
      config.OpenListConfig?.Username &&
      config.OpenListConfig?.Password
    );
    embyEnabled = !!(
      config.EmbyConfig?.Sources &&
      config.EmbyConfig.Sources.length > 0 &&
      config.EmbyConfig.Sources.some((s) => s.enabled && s.ServerURL)
    );
    xiaoyaEnabled = !!(
      config.XiaoyaConfig?.Enabled && config.XiaoyaConfig?.ServerURL
    );
  }

  const runtimeStorageType =
    process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const isCloudflare =
    process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare';
  const displayStorageType =
    runtimeStorageType === 'd1' && !isCloudflare
      ? 'sqlite'
      : runtimeStorageType;

  return {
    SITE_NAME: siteName,
    ANNOUNCEMENT: announcement,
    TMDB_API_KEY: tmdbApiKey,
    STORAGE_TYPE: runtimeStorageType,
    DISPLAY_STORAGE_TYPE: displayStorageType,
    DOUBAN_PROXY_TYPE: doubanProxyType,
    DOUBAN_PROXY: doubanProxy,
    DOUBAN_IMAGE_PROXY_TYPE: doubanImageProxyType,
    DOUBAN_IMAGE_PROXY: doubanImageProxy,
    DISABLE_YELLOW_FILTER: disableYellowFilter,
    CUSTOM_CATEGORIES: customCategories,
    FLUID_SEARCH: fluidSearch,
    EnableComments: enableComments,
    DANMAKU_AUTO_LOAD_DEFAULT: danmakuAutoLoadDefault,
    RecommendationDataSource: recommendationDataSource,
    ENABLE_TVBOX_SUBSCRIBE: process.env.ENABLE_TVBOX_SUBSCRIBE === 'true',
    ENABLE_OFFLINE_DOWNLOAD:
      process.env.NEXT_PUBLIC_ENABLE_OFFLINE_DOWNLOAD === 'true',
    VOICE_CHAT_STRATEGY:
      process.env.NEXT_PUBLIC_VOICE_CHAT_STRATEGY || 'webrtc-fallback',
    OPENLIST_ENABLED: openListEnabled,
    EMBY_ENABLED: embyEnabled,
    XIAOYA_ENABLED: xiaoyaEnabled,
    PRIVATE_LIBRARY_ENABLED: openListEnabled || embyEnabled || xiaoyaEnabled,
    LOGIN_BACKGROUND_IMAGE: loginBackgroundImage,
    REGISTER_BACKGROUND_IMAGE: registerBackgroundImage,
    PROGRESS_THUMB_TYPE: progressThumbType,
    PROGRESS_THUMB_PRESET_ID: progressThumbPresetId,
    PROGRESS_THUMB_CUSTOM_URL: progressThumbCustomUrl,
    ENABLE_REGISTRATION: enableRegistration,
    REQUIRE_REGISTRATION_INVITE_CODE: requireRegistrationInviteCode,
    LOGIN_REQUIRE_TURNSTILE: loginRequireTurnstile,
    REGISTRATION_REQUIRE_TURNSTILE: registrationRequireTurnstile,
    TURNSTILE_SITE_KEY: turnstileSiteKey,
    ENABLE_OIDC_LOGIN: enableOIDCLogin,
    ENABLE_OIDC_REGISTRATION: enableOIDCRegistration,
    OIDC_BUTTON_TEXT: oidcButtonText,
    AI_ENABLED: aiEnabled,
    AI_ENABLE_HOMEPAGE_ENTRY: aiEnableHomepageEntry,
    AI_ENABLE_VIDEOCARD_ENTRY: aiEnableVideoCardEntry,
    AI_ENABLE_PLAYPAGE_ENTRY: aiEnablePlayPageEntry,
    AIConfig: {
      EnableAIComments: aiEnableComments,
    },
    AI_DEFAULT_MESSAGE_NO_VIDEO: aiDefaultMessageNoVideo,
    AI_DEFAULT_MESSAGE_WITH_VIDEO: aiDefaultMessageWithVideo,
    ENABLE_MOVIE_REQUEST: enableMovieRequest,
    ADVANCED_RECOMMENDATION_ENABLED: advancedRecommendationEnabled,
    CUSTOM_AD_FILTER_VERSION: customAdFilterVersion,
    MUSIC_ENABLED: tuneHubEnabled,
    MUSIC_PROXY_ENABLED: musicProxyEnabled,
    SUWAYOMI_ENABLED: suwayomiEnabled,
    FESTIVE_EFFECT_ENABLED: process.env.FESTIVE_EFFECT_ENABLED === 'true',
  };
}
