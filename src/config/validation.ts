import { AdminConfig } from '@/lib/admin.types';

import { BUILTIN_DANMAKU_API_BASE } from './defaults';
import { logger } from '../lib/logger';

export function configSelfCheck(adminConfig: AdminConfig): AdminConfig {
  if (!adminConfig.SiteConfig) {
    adminConfig.SiteConfig = {
      SiteName: 'MoonTVPlus',
      Announcement: '',
      SearchDownstreamMaxPage: 5,
      SiteInterfaceCacheTime: 7200,
      DoubanProxyType: 'cmliussss-cdn-ali',
      DoubanProxy: '',
      DoubanImageProxyType: 'cmliussss-cdn-ali',
      DoubanImageProxy: '',
      DisableYellowFilter: false,
      FluidSearch: true,
      DanmakuSourceType: 'builtin',
      DanmakuApiBase: BUILTIN_DANMAKU_API_BASE,
      DanmakuApiToken: '87654321',
      DanmakuAutoLoadDefault: true,
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

  const ownerUser = process.env.USERNAME;
  adminConfig.UserConfig.Users = [
    {
      username: ownerUser!,
      role: 'owner',
      banned: false,
    },
  ];

  const seenSourceKeys = new Set<string>();
  adminConfig.SourceConfig = adminConfig.SourceConfig.filter((source) => {
    if (seenSourceKeys.has(source.key)) {
      return false;
    }
    seenSourceKeys.add(source.key);
    return true;
  });

  const seenCustomCategoryKeys = new Set<string>();
  adminConfig.CustomCategories = adminConfig.CustomCategories.filter(
    (category) => {
      if (seenCustomCategoryKeys.has(category.query + category.type)) {
        return false;
      }
      seenCustomCategoryKeys.add(category.query + category.type);
      return true;
    },
  );

  return adminConfig;
}
