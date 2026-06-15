export interface RuntimeConfig {
  STORAGE_TYPE: string;
  DISPLAY_STORAGE_TYPE: string;
  DOUBAN_PROXY_TYPE: string;
  DOUBAN_PROXY: string;
  DOUBAN_IMAGE_PROXY_TYPE: string;
  DOUBAN_IMAGE_PROXY: string;
  DISABLE_YELLOW_FILTER: boolean;
  CUSTOM_CATEGORIES: {
    name: string;
    type: 'movie' | 'tv';
    query: string;
    href?: string;
  }[];
  FLUID_SEARCH: boolean;
  EnableComments: boolean;
  DANMAKU_AUTO_LOAD_DEFAULT: boolean;
  RecommendationDataSource: string;
  ENABLE_TVBOX_SUBSCRIBE: boolean;
  ENABLE_OFFLINE_DOWNLOAD: boolean;
  VOICE_CHAT_STRATEGY: string;
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
  ADVANCED_RECOMMENDATION_ENABLED: boolean;
  CUSTOM_AD_FILTER_VERSION: number;
  FESTIVE_EFFECT_ENABLED: boolean;
  ENABLE_SOURCE_SEARCH?: boolean;
  SITE_BASE?: string;
}

declare global {
  interface Window {
    RUNTIME_CONFIG: RuntimeConfig;
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => number;
      reset: (widgetId: number) => void;
    };
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }

  /**
   * 全局单例缓存接口 — 用于替代 (global as any)[symbol] 模式
   *
   * 用途: user-cache.ts 的缓存实例、redis-base.db.ts 的 Redis 客户端、
   *       upstash.db.ts 的 Upstash 客户端，通过 Symbol.for() 挂载到 global 上
   *       实现模块级单例，避免热更新重复初始化
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface MoonTVGlobal {
    [key: symbol]: unknown;
  }
}

export {};
