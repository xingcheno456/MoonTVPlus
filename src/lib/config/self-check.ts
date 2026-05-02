/* eslint-disable @typescript-eslint/no-explicit-any */

import { AdminConfig } from '../admin.types';
import { BUILTIN_DANMAKU_API_BASE } from './types';

import { logger } from '../logger';

export function configSelfCheck(adminConfig: AdminConfig): AdminConfig {
  if (!adminConfig.SiteConfig) {
    adminConfig.SiteConfig = {
      SiteName: 'MoonTVPlus',
      Announcement: '',
      SearchDownstreamMaxPage: 5,
      SiteInterfaceCacheTime: 7200,
      DoubanProxyType: 'cmliussss-cdn-tencent',
      DoubanProxy: '',
      DoubanImageProxyType: 'cmliussss-cdn-tencent',
      DoubanImageProxy: '',
      DisableYellowFilter: false,
      FluidSearch: true,
      DanmakuSourceType: 'builtin',
      DanmakuApiBase: BUILTIN_DANMAKU_API_BASE,
      DanmakuApiToken: '87654321',
      DanmakuAutoLoadDefault: true,
      PansouApiUrl: '',
      PansouUsername: '',
      PansouPassword: '',
      PansouKeywordBlocklist: '',
      MagnetProxy: '',
      MagnetMikanReverseProxy: '',
      MagnetDmhyReverseProxy: '',
      MagnetAcgripReverseProxy: '',
      EnableComments: false,
      EnableRegistration: false,
      RequireRegistrationInviteCode: false,
      RegistrationInviteCode: '',
      RegistrationRequireTurnstile: false,
      LoginRequireTurnstile: false,
      TurnstileSiteKey: '',
      TurnstileSecretKey: '',
      DefaultUserTags: [],
    };
  }

  if (adminConfig.SiteConfig.DanmakuSourceType === undefined) {
    adminConfig.SiteConfig.DanmakuSourceType = 'custom';
  }
  if (!adminConfig.SiteConfig.DanmakuApiBase) {
    adminConfig.SiteConfig.DanmakuApiBase =
      adminConfig.SiteConfig.DanmakuSourceType === 'builtin'
        ? BUILTIN_DANMAKU_API_BASE
        : 'http://localhost:9321';
  }
  if (!adminConfig.SiteConfig.DanmakuApiToken) {
    adminConfig.SiteConfig.DanmakuApiToken = '87654321';
  }
  if (adminConfig.SiteConfig.DanmakuAutoLoadDefault === undefined) {
    adminConfig.SiteConfig.DanmakuAutoLoadDefault = true;
  }
  if (adminConfig.SiteConfig.EnableComments === undefined) {
    adminConfig.SiteConfig.EnableComments = false;
  }
  if (adminConfig.SiteConfig.EnableRegistration === undefined) {
    adminConfig.SiteConfig.EnableRegistration = false;
  }
  if (adminConfig.SiteConfig.RequireRegistrationInviteCode === undefined) {
    adminConfig.SiteConfig.RequireRegistrationInviteCode = false;
  }
  if (adminConfig.SiteConfig.RegistrationInviteCode === undefined) {
    adminConfig.SiteConfig.RegistrationInviteCode = '';
  }
  if (adminConfig.SiteConfig.RegistrationRequireTurnstile === undefined) {
    adminConfig.SiteConfig.RegistrationRequireTurnstile = false;
  }
  if (adminConfig.SiteConfig.LoginRequireTurnstile === undefined) {
    adminConfig.SiteConfig.LoginRequireTurnstile = false;
  }
  if (adminConfig.SiteConfig.TurnstileSiteKey === undefined) {
    adminConfig.SiteConfig.TurnstileSiteKey = '';
  }
  if (adminConfig.SiteConfig.TurnstileSecretKey === undefined) {
    adminConfig.SiteConfig.TurnstileSecretKey = '';
  }
  if (adminConfig.SiteConfig.DefaultUserTags === undefined) {
    adminConfig.SiteConfig.DefaultUserTags = [];
  }
  if (adminConfig.SiteConfig.PansouKeywordBlocklist === undefined) {
    adminConfig.SiteConfig.PansouKeywordBlocklist = '';
  }
  if (adminConfig.SiteConfig.MagnetProxy === undefined) {
    adminConfig.SiteConfig.MagnetProxy = '';
  }
  if (adminConfig.SiteConfig.MagnetMikanReverseProxy === undefined) {
    adminConfig.SiteConfig.MagnetMikanReverseProxy = '';
  }
  if (adminConfig.SiteConfig.MagnetDmhyReverseProxy === undefined) {
    adminConfig.SiteConfig.MagnetDmhyReverseProxy = '';
  }
  if (adminConfig.SiteConfig.MagnetAcgripReverseProxy === undefined) {
    adminConfig.SiteConfig.MagnetAcgripReverseProxy = '';
  }

  if (!adminConfig.UserConfig) {
    adminConfig.UserConfig = { Users: [] };
  }
  if (
    !adminConfig.UserConfig.Users ||
    !Array.isArray(adminConfig.UserConfig.Users)
  ) {
    adminConfig.UserConfig.Users = [];
  }
  if (!adminConfig.SourceConfig || !Array.isArray(adminConfig.SourceConfig)) {
    adminConfig.SourceConfig = [];
  }
  if (
    !adminConfig.CustomCategories ||
    !Array.isArray(adminConfig.CustomCategories)
  ) {
    adminConfig.CustomCategories = [];
  }


  const seenCustomCategoryKeys = new Set<string>();
  adminConfig.CustomCategories = adminConfig.CustomCategories.filter(
    (category) => {
      if (seenCustomCategoryKeys.has(category.query + category.type)) return false;
      seenCustomCategoryKeys.add(category.query + category.type);
      return true;
    },
  );

  if (adminConfig.EmbyConfig) {
    if (
      adminConfig.EmbyConfig.ServerURL &&
      !adminConfig.EmbyConfig.Sources
    ) {
      logger.info('[Config] 检测到旧格式Emby配置，自动迁移到新格式');
      const oldConfig = adminConfig.EmbyConfig;
      adminConfig.EmbyConfig = {
        Sources: [
          {
            key: 'default',
            name: 'Emby',
            enabled: oldConfig.Enabled ?? false,
            ServerURL: oldConfig.ServerURL || '',
            ApiKey: oldConfig.ApiKey,
            Username: oldConfig.Username,
            Password: oldConfig.Password,
            UserId: oldConfig.UserId,
            AuthToken: oldConfig.AuthToken,
            Libraries: oldConfig.Libraries,
            LastSyncTime: oldConfig.LastSyncTime,
            ItemCount: oldConfig.ItemCount,
            isDefault: true,
          },
        ],
      };
    }

    if (adminConfig.EmbyConfig?.Sources) {
      const seenEmbyKeys = new Set<string>();
      adminConfig.EmbyConfig.Sources =
        adminConfig.EmbyConfig.Sources.filter((source) => {
          if (seenEmbyKeys.has(source.key)) return false;
          seenEmbyKeys.add(source.key);
          return true;
        });
    }
  }

  if (!adminConfig.NetDiskConfig) {
    adminConfig.NetDiskConfig = {
      Quark: {
        Enabled: false,
        Cookie: '',
        SavePath: '/',
        PlayTempSavePath: '/',
        OpenListTempPath: '/',
      },
    };
  }
  if (!adminConfig.NetDiskConfig.Quark) {
    adminConfig.NetDiskConfig.Quark = {
      Enabled: false,
      Cookie: '',
      SavePath: '/',
      PlayTempSavePath: '/',
      OpenListTempPath: '/',
    };
  }

  if (!adminConfig.MusicConfig) {
    adminConfig.MusicConfig = {
      Enabled: false,
      BaseUrl: '',
      Token: '',
      ProxyEnabled: true,
    };
  } else if (adminConfig.MusicConfig.ProxyEnabled === undefined) {
    adminConfig.MusicConfig.ProxyEnabled = true;
  }

  return adminConfig;
}
