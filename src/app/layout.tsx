 

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { getConfig } from '@/lib/config';
import { listEnabledSourceScripts } from '@/lib/source-script';

import { StartupCacheCleanup } from '../components/danmaku/DanmakuCacheCleanup';
import { DownloadBubble } from '../components/player/DownloadBubble';
import { DownloadPanel } from '../components/player/DownloadPanel';
import { GlobalErrorIndicator } from '../components/common/GlobalErrorIndicator';
import RouteScrollReset from '../components/layout/RouteScrollReset';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import { TokenRefreshManager } from '../components/TokenRefreshManager';
import TopProgressBar from '../components/layout/TopProgressBar';
import { DownloadProvider } from '../contexts/DownloadContext';

const inter = Inter({ subsets: ['latin'] });
export const dynamic = 'force-dynamic';

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const config = await getConfig();
  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus';
  if (storageType !== 'localstorage') {
    siteName = config.SiteConfig.SiteName;
  }

  return {
    title: siteName,
    description: '影视聚合',
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus';
  let announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';

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

    // 自定义去广告代码版本号
    customAdFilterVersion = config.SiteConfig?.CustomAdFilterVersion || 0;
    // 高级推荐功能配置：存在已启用视频源脚本时显示
    advancedRecommendationEnabled =
      (await listEnabledSourceScripts()).length > 0;
  }

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeStorageType =
    process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const isCloudflare =
    process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare';
  const displayStorageType =
    runtimeStorageType === 'd1' && !isCloudflare
      ? 'sqlite'
      : runtimeStorageType;

  const runtimeConfig = {
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

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        {/* 主题CSS */}
        <link rel='stylesheet' href='/api/theme/css' />
        <meta
          name='runtime-config'
          content={Buffer.from(JSON.stringify(runtimeConfig)).toString('base64')}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig).replace(
              /</g, '\\u003c'
            ).replace(
              />/g, '\\u003e'
            ).replace(
              /\//g, '\\u002f'
            )};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-black dark:text-gray-200`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <TopProgressBar />
          <RouteScrollReset />
          <TokenRefreshManager />
          <SiteProvider
            siteName={siteName}
            announcement={announcement}
          >
            <DownloadProvider>
              <StartupCacheCleanup />
              {children}
              <GlobalErrorIndicator />
              <DownloadBubble />
              <DownloadPanel />
            </DownloadProvider>
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
