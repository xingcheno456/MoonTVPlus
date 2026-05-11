export interface AdminConfig {
  ConfigSubscribtion: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  };
  ConfigFile: string;
  SiteConfig: {
    SiteName: string;
    Announcement: string;
    SearchDownstreamMaxPage: number;
    SiteInterfaceCacheTime: number;
    DoubanProxyType: string;
    DoubanProxy: string;
    DoubanImageProxyType: string;
    DoubanImageProxy: string;
    DisableYellowFilter: boolean;
    FluidSearch: boolean;
    // 弹幕配置
    DanmakuSourceType?: 'builtin' | 'custom';
    DanmakuApiBase: string;
    DanmakuApiToken: string;
    DanmakuAutoLoadDefault?: boolean; // 是否默认自动加载弹幕（用户可在本地覆盖）
    BannerDataSource?: string; // 轮播图数据源：TX 或 Douban
    RecommendationDataSource?: string; // 更多推荐数据源：Douban、Mixed、MixedSmart
    // 磁链配置
    MagnetProxy?: string;
    MagnetMikanReverseProxy?: string;
    MagnetDmhyReverseProxy?: string;
    MagnetAcgripReverseProxy?: string;
    // 评论功能开关
    EnableComments: boolean;
    // 自定义去广告代码
    CustomAdFilterCode?: string;
    CustomAdFilterVersion?: number; // 代码版本号（时间戳）
    // 注册相关配置
    EnableRegistration?: boolean; // 开启注册
    RequireRegistrationInviteCode?: boolean; // 注册时要求邀请码
    RegistrationInviteCode?: string; // 通用注册邀请码
    RegistrationRequireTurnstile?: boolean; // 注册启用Cloudflare Turnstile
    LoginRequireTurnstile?: boolean; // 登录启用Cloudflare Turnstile
    TurnstileSiteKey?: string; // Cloudflare Turnstile Site Key
    TurnstileSecretKey?: string; // Cloudflare Turnstile Secret Key
    DefaultUserTags?: string[]; // 新注册用户的默认用户组
    // OIDC配置
    EnableOIDCLogin?: boolean; // 启用OIDC登录
    EnableOIDCRegistration?: boolean; // 启用OIDC注册
    OIDCIssuer?: string; // OIDC Issuer URL (用于自动发现)
    OIDCAuthorizationEndpoint?: string; // 授权端点
    OIDCTokenEndpoint?: string; // Token端点
    OIDCUserInfoEndpoint?: string; // 用户信息端点
    OIDCClientId?: string; // OIDC Client ID
    OIDCClientSecret?: string; // OIDC Client Secret
    OIDCButtonText?: string; // OIDC登录按钮文字
    OIDCMinTrustLevel?: number; // 最低信任等级（仅LinuxDo网站有效，为0时不判断）
  };
  UserConfig: {
    Users: {
      username: string;
      role: 'user' | 'admin' | 'owner';
      banned?: boolean;
      enabledApis?: string[]; // 优先级高于tags限制
      tags?: string[]; // 多 tags 取并集限制
      oidcSub?: string; // OIDC 用户标识
    }[];
    Tags?: {
      name: string;
      enabledApis: string[];
    }[];
  };
  SourceConfig: {
    key: string;
    name: string;
    api: string;
    detail?: string;
    from: 'config' | 'custom';
    disabled?: boolean;
    proxyMode?: boolean; // 代理模式开关：启用后由服务器代理m3u8和ts分片
    weight?: number; // 权重：用于排序和优选评分，默认0，范围0-100
  }[];
  CustomCategories: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];

  ThemeConfig?: {
    enableBuiltInTheme: boolean; // 是否启用内置主题
    builtInTheme: string; // 内置主题名称
    customCSS: string; // 自定义CSS
    enableCache: boolean; // 是否启用浏览器缓存
    cacheMinutes: number; // 缓存时间（分钟）
    cacheVersion: number; // CSS版本号（用于缓存控制）
    loginBackgroundImage?: string; // 登录界面背景图
    registerBackgroundImage?: string; // 注册界面背景图
    // 进度条图标配置
    progressThumbType?: 'default' | 'preset' | 'custom'; // 图标类型
    progressThumbPresetId?: string; // 预制图标ID
    progressThumbCustomUrl?: string; // 自定义图标URL
  };

  AnimeSubscriptionConfig?: {
    Enabled: boolean; // 是否启用追番功能
    Subscriptions: Array<{
      id: string;
      title: string;
      filterText: string;
      source: 'acgrip' | 'mikan' | 'dmhy';
      enabled: boolean;
      lastCheckTime: number;
      lastEpisode: number;
      createdAt: number;
      updatedAt: number;
      createdBy: string;
    }>;
  };
};

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}
