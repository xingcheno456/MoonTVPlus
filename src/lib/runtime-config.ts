import { getConfig } from '@/lib/config';
import { listEnabledSourceScripts } from '@/lib/source-script';

import type { RuntimeConfig } from '@/types/runtime';

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const isCloudflare =
    process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare';
  const displayStorageType =
    storageType === 'd1' && !isCloudflare ? 'sqlite' : storageType;

  let doubanProxyType =
    process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-ali';
  let doubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY || '';
  let doubanImageProxyType =
    process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE || 'cmliussss-cdn-ali';
  let doubanImageProxy = process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '';
  let disableYellowFilter =
    process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true';
  let fluidSearch = process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false';
  let enableComments = false;
  let danmakuAutoLoadDefault = true;
  let recommendationDataSource = 'Mixed';
  let customAdFilterVersion = 0;
  let advancedRecommendationEnabled = false;
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
  let loginBackgroundImage = '';
  let customCategories: RuntimeConfig['CUSTOM_CATEGORIES'] = [];

  if (storageType !== 'localstorage') {
    const config = await getConfig();

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
    customAdFilterVersion = config.SiteConfig?.CustomAdFilterVersion || 0;
    advancedRecommendationEnabled =
      (await listEnabledSourceScripts()).length > 0;
  }

  return {
    STORAGE_TYPE: storageType,
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
    ADVANCED_RECOMMENDATION_ENABLED: advancedRecommendationEnabled,
    CUSTOM_AD_FILTER_VERSION: customAdFilterVersion,
    FESTIVE_EFFECT_ENABLED: process.env.FESTIVE_EFFECT_ENABLED === 'true',
  };
}

export function getSiteNameFromConfig(config: Awaited<ReturnType<typeof getConfig>>): string {
  return config.SiteConfig.SiteName;
}

export function getAnnouncementFromConfig(config: Awaited<ReturnType<typeof getConfig>>): string {
  return config.SiteConfig.Announcement;
}
