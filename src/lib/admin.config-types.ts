export interface ConfigSubscription {
  URL: string;
  AutoUpdate: boolean;
  LastCheck: string;
}

export interface SiteConfig {
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
  DanmakuSourceType?: 'builtin' | 'custom';
  DanmakuApiBase: string;
  DanmakuApiToken: string;
  DanmakuAutoLoadDefault?: boolean;
  TMDBApiKey?: string;
  TMDBProxy?: string;
  TMDBReverseProxy?: string;
  BannerDataSource?: string;
  RecommendationDataSource?: string;
  PansouApiUrl?: string;
  PansouUsername?: string;
  PansouPassword?: string;
  PansouKeywordBlocklist?: string;
  MagnetProxy?: string;
  MagnetMikanReverseProxy?: string;
  MagnetDmhyReverseProxy?: string;
  MagnetAcgripReverseProxy?: string;
  EnableComments: boolean;
  CustomAdFilterCode?: string;
  CustomAdFilterVersion?: number;
  EnableRegistration?: boolean;
  RequireRegistrationInviteCode?: boolean;
  RegistrationInviteCode?: string;
  RegistrationRequireTurnstile?: boolean;
  LoginRequireTurnstile?: boolean;
  TurnstileSiteKey?: string;
  TurnstileSecretKey?: string;
  DefaultUserTags?: string[];
  EnableMovieRequest?: boolean;
  MovieRequestCooldown?: number;
  EnableOIDCLogin?: boolean;
  EnableOIDCRegistration?: boolean;
  OIDCIssuer?: string;
  OIDCAuthorizationEndpoint?: string;
  OIDCTokenEndpoint?: string;
  OIDCUserInfoEndpoint?: string;
  OIDCClientId?: string;
  OIDCClientSecret?: string;
  OIDCButtonText?: string;
  OIDCMinTrustLevel?: number;
}

export interface UserEntry {
  username: string;
  role: 'user' | 'admin' | 'owner';
  banned?: boolean;
  enabledApis?: string[];
  tags?: string[];
  oidcSub?: string;
}

export interface TagConfig {
  name: string;
  enabledApis: string[];
}

export interface UserConfig {
  Users: UserEntry[];
  Tags?: TagConfig[];
}

export interface SourceConfig {
  key: string;
  name: string;
  api: string;
  detail?: string;
  from: 'config' | 'custom';
  disabled?: boolean;
  proxyMode?: boolean;
  weight?: number;
}

export interface CustomCategory {
  name?: string;
  type: 'movie' | 'tv';
  query: string;
  from: 'config' | 'custom';
  disabled?: boolean;
}

export interface ThemeConfig {
  enableBuiltInTheme: boolean;
  builtInTheme: string;
  customCSS: string;
  enableCache: boolean;
  cacheMinutes: number;
  cacheVersion: number;
  loginBackgroundImage?: string;
  registerBackgroundImage?: string;
  progressThumbType?: 'default' | 'preset' | 'custom';
  progressThumbPresetId?: string;
  progressThumbCustomUrl?: string;
}

export interface OpenListConfig {
  Enabled: boolean;
  URL: string;
  Username: string;
  Password: string;
  RootPath?: string;
  RootPaths?: string[];
  OfflineDownloadPath: string;
  LastRefreshTime?: number;
  ResourceCount?: number;
  ScanInterval?: number;
  ScanMode?: 'torrent' | 'name' | 'hybrid';
  DisableVideoPreview?: boolean;
}

export interface NetDiskConfig {
  Quark?: {
    Enabled: boolean;
    Cookie: string;
    SavePath: string;
    PlayTempSavePath: string;
    OpenListTempPath: string;
  };
}

export interface AIConfig {
  Enabled: boolean;
  Provider: 'openai' | 'claude' | 'custom';
  OpenAIApiKey?: string;
  OpenAIBaseURL?: string;
  OpenAIModel?: string;
  ClaudeApiKey?: string;
  ClaudeModel?: string;
  CustomApiKey?: string;
  CustomBaseURL?: string;
  CustomModel?: string;
  EnableDecisionModel: boolean;
  DecisionProvider?: 'openai' | 'claude' | 'custom';
  DecisionOpenAIApiKey?: string;
  DecisionOpenAIBaseURL?: string;
  DecisionOpenAIModel?: string;
  DecisionClaudeApiKey?: string;
  DecisionClaudeModel?: string;
  DecisionCustomApiKey?: string;
  DecisionCustomBaseURL?: string;
  DecisionCustomModel?: string;
  EnableWebSearch: boolean;
  WebSearchProvider?: 'tavily' | 'serper' | 'serpapi';
  TavilyApiKey?: string;
  SerperApiKey?: string;
  SerpApiKey?: string;
  EnableHomepageEntry: boolean;
  EnableVideoCardEntry: boolean;
  EnablePlayPageEntry: boolean;
  EnableAIComments: boolean;
  AllowRegularUsers: boolean;
  Temperature?: number;
  MaxTokens?: number;
  SystemPrompt?: string;
  EnableStreaming?: boolean;
  DefaultMessageNoVideo?: string;
  DefaultMessageWithVideo?: string;
}

export interface EmbySource {
  key: string;
  name: string;
  enabled: boolean;
  ServerURL: string;
  ApiKey?: string;
  Username?: string;
  Password?: string;
  UserId?: string;
  AuthToken?: string;
  Libraries?: string[];
  LastSyncTime?: number;
  ItemCount?: number;
  isDefault?: boolean;
  removeEmbyPrefix?: boolean;
  appendMediaSourceId?: boolean;
  transcodeMp4?: boolean;
  proxyPlay?: boolean;
  customUserAgent?: string;
}

export interface EmbyConfig {
  Sources?: EmbySource[];
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
}

export interface XiaoyaConfig {
  Enabled: boolean;
  ServerURL: string;
  Token?: string;
  Username?: string;
  Password?: string;
  DisableVideoPreview?: boolean;
}

export interface SuwayomiConfig {
  Enabled: boolean;
  ServerURL: string;
  AuthMode?: 'none' | 'basic_auth' | 'simple_login';
  Username?: string;
  Password?: string;
  DefaultLang?: string;
  SourceIds?: string[];
  MaxSources?: number;
}

export interface EmailConfig {
  enabled: boolean;
  provider: 'smtp' | 'resend';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
  resend?: {
    apiKey: string;
    from: string;
  };
}

export interface MusicConfig {
  Enabled?: boolean;
  BaseUrl?: string;
  Token?: string;
  ProxyEnabled?: boolean;
  TuneHubEnabled?: boolean;
  TuneHubBaseUrl?: string;
  TuneHubApiKey?: string;
  OpenListCacheEnabled?: boolean;
  OpenListCacheURL?: string;
  OpenListCacheUsername?: string;
  OpenListCachePassword?: string;
  OpenListCachePath?: string;
  OpenListCacheProxyEnabled?: boolean;
}

export interface AnimeSubscription {
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
}

export interface AnimeSubscriptionConfig {
  Enabled: boolean;
  Subscriptions: AnimeSubscription[];
}
