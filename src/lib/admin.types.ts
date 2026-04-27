import type {
  ConfigSubscription,
  SiteConfig,
  UserConfig,
  SourceConfig,
  CustomCategory,
  ThemeConfig,
  OpenListConfig,
  NetDiskConfig,
  AIConfig,
  EmbyConfig,
  XiaoyaConfig,
  SuwayomiConfig,
  EmailConfig,
  MusicConfig,
  AnimeSubscriptionConfig,
} from './admin.config-types';

export type {
  ConfigSubscription,
  SiteConfig,
  UserConfig,
  SourceConfig,
  CustomCategory,
  ThemeConfig,
  OpenListConfig,
  NetDiskConfig,
  AIConfig,
  EmbyConfig,
  EmbySource,
  XiaoyaConfig,
  SuwayomiConfig,
  EmailConfig,
  MusicConfig,
  AnimeSubscriptionConfig,
  AnimeSubscription,
  UserEntry,
  TagConfig,
} from './admin.config-types';

export interface AdminConfig {
  ConfigSubscribtion: ConfigSubscription;
  ConfigFile: string;
  SiteConfig: SiteConfig;
  UserConfig: UserConfig;
  SourceConfig: SourceConfig[];
  CustomCategories: CustomCategory[];
  ThemeConfig?: ThemeConfig;
  OpenListConfig?: OpenListConfig;
  NetDiskConfig?: NetDiskConfig;
  AIConfig?: AIConfig;
  EmbyConfig?: EmbyConfig;
  XiaoyaConfig?: XiaoyaConfig;
  SuwayomiConfig?: SuwayomiConfig;
  EmailConfig?: EmailConfig;
  MusicConfig?: MusicConfig;
  AnimeSubscriptionConfig?: AnimeSubscriptionConfig;
}

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}
