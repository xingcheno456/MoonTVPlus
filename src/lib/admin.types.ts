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
    // Pansou配置
    PansouApiUrl?: string;
    PansouUsername?: string;
    PansouPassword?: string;
    PansouKeywordBlocklist?: string;
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
    // 求片功能配置
    EnableMovieRequest?: boolean; // 启用求片功能
    MovieRequestCooldown?: number; // 求片冷却时间（秒），默认3600
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
  OpenListConfig?: {
    Enabled: boolean; // 是否启用私人影库功能
    URL: string; // OpenList 服务器地址
    Username: string; // 账号（用于登录获取Token）
    Password: string; // 密码（用于登录获取Token）
    RootPath?: string; // 旧字段：根目录路径（向后兼容，迁移后删除）
    RootPaths?: string[]; // 新字段：多根目录路径列表
    OfflineDownloadPath: string; // 离线下载目录，默认 "/"
    LastRefreshTime?: number; // 上次刷新时间戳
    ResourceCount?: number; // 资源数量
    ScanInterval?: number; // 定时扫描间隔（分钟），0表示关闭，最低60分钟
    ScanMode?: 'torrent' | 'name' | 'hybrid'; // 扫描模式：torrent=种子库匹配，name=名字匹配，hybrid=混合模式（默认）
    DisableVideoPreview?: boolean; // 禁用预览视频，直接返回直连链接
  };
  NetDiskConfig?: {
    Quark?: {
      Enabled: boolean;
      Cookie: string;
      SavePath: string;
      PlayTempSavePath: string;
      OpenListTempPath: string;
    };
  };

  EmbyConfig?: {
    // 新格式：多源配置（推荐）
    Sources?: Array<{
      key: string; // 唯一标识，如 'emby1', 'emby2'
      name: string; // 显示名称，如 '家庭Emby', '公司Emby'
      enabled: boolean; // 是否启用
      ServerURL: string; // Emby服务器地址
      ApiKey?: string; // API Key（推荐方式）
      Username?: string; // 用户名（或使用API Key）
      Password?: string; // 密码
      UserId?: string; // 用户ID（登录后获取）
      AuthToken?: string; // 认证令牌（用户名密码登录后获取）
      Libraries?: string[]; // 要显示的媒体库ID（可选，默认全部）
      LastSyncTime?: number; // 最后同步时间戳
      ItemCount?: number; // 媒体项数量
      isDefault?: boolean; // 是否为默认源（用于向后兼容）
      // 高级流媒体选项
      removeEmbyPrefix?: boolean; // 播放链接移除/emby前缀
      appendMediaSourceId?: boolean; // 拼接MediaSourceId参数
      transcodeMp4?: boolean; // 转码mp4
      proxyPlay?: boolean; // 视频播放代理开关
      customUserAgent?: string; // 自定义User-Agent
    }>;
    // 旧格式：单源配置（向后兼容）
    Enabled?: boolean;
    ServerURL?: string;
    ApiKey?: string;
    Username?: string;
    Password?: string;
    UserId?: string;
    AuthToken?: string;
    Libraries?: string[];
    LastSyncTime?: number;
    ItemCount?: number;
  };
  XiaoyaConfig?: {
    Enabled: boolean; // 是否启用
    ServerURL: string; // Alist 服务器地址
    Token?: string; // Token 认证（推荐）
    Username?: string; // 用户名认证（备选）
    Password?: string; // 密码认证（备选）
    DisableVideoPreview?: boolean; // 禁用预览视频，直接返回直连链接
  };
  EmailConfig?: {
    enabled: boolean; // 是否启用邮件通知
    provider: 'smtp' | 'resend'; // 邮件发送方式
    // SMTP配置
    smtp?: {
      host: string; // SMTP服务器地址
      port: number; // SMTP端口（25/465/587）
      secure: boolean; // 是否使用SSL/TLS
      user: string; // SMTP用户名
      password: string; // SMTP密码
      from: string; // 发件人邮箱
    };
    // Resend配置
    resend?: {
      apiKey: string; // Resend API Key
      from: string; // 发件人邮箱
    };
  };
  MusicConfig?: {
    Enabled?: boolean; // 启用音乐功能
    BaseUrl?: string; // lxserver 地址
    Token?: string; // lxserver x-user-token
    ProxyEnabled?: boolean; // 是否走 stream 代理
    // 兼容旧代码的遗留字段（待删除）
    TuneHubEnabled?: boolean;
    TuneHubBaseUrl?: string;
    TuneHubApiKey?: string;
    OpenListCacheEnabled?: boolean;
    OpenListCacheURL?: string;
    OpenListCacheUsername?: string;
    OpenListCachePassword?: string;
    OpenListCachePath?: string;
    OpenListCacheProxyEnabled?: boolean;
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
}

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}
