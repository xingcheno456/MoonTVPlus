 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiSuccess({
        error: '不支持本地存储进行管理员配置',
      }, { status: 400 });
  }

  try {
    const body = await request.json();

    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;
    const username = adminAuth.username;

    const {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      DoubanProxyType,
      DoubanProxy,
      DoubanImageProxyType,
      DoubanImageProxy,
      DisableYellowFilter,
      FluidSearch,
      DanmakuSourceType,
      DanmakuApiBase,
      DanmakuApiToken,
      DanmakuAutoLoadDefault,
      TMDBApiKey,
      TMDBProxy,
      TMDBReverseProxy,
      BannerDataSource,
      RecommendationDataSource,
      PansouApiUrl,
      PansouUsername,
      PansouPassword,
      PansouKeywordBlocklist,
      MagnetProxy,
      MagnetMikanReverseProxy,
      MagnetDmhyReverseProxy,
      MagnetAcgripReverseProxy,
      EnableComments,
      CustomAdFilterCode,
      CustomAdFilterVersion,
      EnableRegistration,
      RequireRegistrationInviteCode,
      RegistrationInviteCode,
      RegistrationRequireTurnstile,
      LoginRequireTurnstile,
      TurnstileSiteKey,
      TurnstileSecretKey,
      DefaultUserTags,
      EnableOIDCLogin,
      EnableOIDCRegistration,
      OIDCIssuer,
      OIDCAuthorizationEndpoint,
      OIDCTokenEndpoint,
      OIDCUserInfoEndpoint,
      OIDCClientId,
      OIDCClientSecret,
      OIDCButtonText,
      OIDCMinTrustLevel,
    } = body as {
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
    };

    // 参数校验
    if (
      typeof SiteName !== 'string' ||
      typeof Announcement !== 'string' ||
      typeof SearchDownstreamMaxPage !== 'number' ||
      typeof SiteInterfaceCacheTime !== 'number' ||
      typeof DoubanProxyType !== 'string' ||
      typeof DoubanProxy !== 'string' ||
      typeof DoubanImageProxyType !== 'string' ||
      typeof DoubanImageProxy !== 'string' ||
      typeof DisableYellowFilter !== 'boolean' ||
      typeof FluidSearch !== 'boolean' ||
      (DanmakuSourceType !== undefined &&
        DanmakuSourceType !== 'builtin' &&
        DanmakuSourceType !== 'custom') ||
      typeof DanmakuApiBase !== 'string' ||
      typeof DanmakuApiToken !== 'string' ||
      (DanmakuAutoLoadDefault !== undefined &&
        typeof DanmakuAutoLoadDefault !== 'boolean') ||
      (TMDBApiKey !== undefined && typeof TMDBApiKey !== 'string') ||
      (TMDBProxy !== undefined && typeof TMDBProxy !== 'string') ||
      (TMDBReverseProxy !== undefined &&
        typeof TMDBReverseProxy !== 'string') ||
      (BannerDataSource !== undefined &&
        typeof BannerDataSource !== 'string') ||
      (RecommendationDataSource !== undefined &&
        typeof RecommendationDataSource !== 'string') ||
      (PansouKeywordBlocklist !== undefined &&
        typeof PansouKeywordBlocklist !== 'string') ||
      (MagnetProxy !== undefined && typeof MagnetProxy !== 'string') ||
      (MagnetMikanReverseProxy !== undefined &&
        typeof MagnetMikanReverseProxy !== 'string') ||
      (MagnetDmhyReverseProxy !== undefined &&
        typeof MagnetDmhyReverseProxy !== 'string') ||
      (MagnetAcgripReverseProxy !== undefined &&
        typeof MagnetAcgripReverseProxy !== 'string') ||
      typeof EnableComments !== 'boolean' ||
      (CustomAdFilterCode !== undefined &&
        typeof CustomAdFilterCode !== 'string') ||
      (CustomAdFilterVersion !== undefined &&
        typeof CustomAdFilterVersion !== 'number') ||
      (EnableRegistration !== undefined &&
        typeof EnableRegistration !== 'boolean') ||
      (RequireRegistrationInviteCode !== undefined &&
        typeof RequireRegistrationInviteCode !== 'boolean') ||
      (RegistrationInviteCode !== undefined &&
        typeof RegistrationInviteCode !== 'string') ||
      (RegistrationRequireTurnstile !== undefined &&
        typeof RegistrationRequireTurnstile !== 'boolean') ||
      (LoginRequireTurnstile !== undefined &&
        typeof LoginRequireTurnstile !== 'boolean') ||
      (TurnstileSiteKey !== undefined &&
        typeof TurnstileSiteKey !== 'string') ||
      (TurnstileSecretKey !== undefined &&
        typeof TurnstileSecretKey !== 'string') ||
      (DefaultUserTags !== undefined && !Array.isArray(DefaultUserTags)) ||
      (EnableOIDCLogin !== undefined && typeof EnableOIDCLogin !== 'boolean') ||
      (EnableOIDCRegistration !== undefined &&
        typeof EnableOIDCRegistration !== 'boolean') ||
      (OIDCIssuer !== undefined && typeof OIDCIssuer !== 'string') ||
      (OIDCAuthorizationEndpoint !== undefined &&
        typeof OIDCAuthorizationEndpoint !== 'string') ||
      (OIDCTokenEndpoint !== undefined &&
        typeof OIDCTokenEndpoint !== 'string') ||
      (OIDCUserInfoEndpoint !== undefined &&
        typeof OIDCUserInfoEndpoint !== 'string') ||
      (OIDCClientId !== undefined && typeof OIDCClientId !== 'string') ||
      (OIDCClientSecret !== undefined &&
        typeof OIDCClientSecret !== 'string') ||
      (OIDCButtonText !== undefined && typeof OIDCButtonText !== 'string') ||
      (OIDCMinTrustLevel !== undefined && typeof OIDCMinTrustLevel !== 'number')
    ) {
      return apiError('参数格式错误', 400);
    }

    const adminConfig = await getConfig();

    // 更新缓存中的站点设置
    adminConfig.SiteConfig = {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      DoubanProxyType,
      DoubanProxy,
      DoubanImageProxyType,
      DoubanImageProxy,
      DisableYellowFilter,
      FluidSearch,
      DanmakuSourceType,
      DanmakuApiBase,
      DanmakuApiToken,
      DanmakuAutoLoadDefault,
      TMDBApiKey,
      TMDBProxy,
      TMDBReverseProxy,
      BannerDataSource,
      RecommendationDataSource,
      PansouApiUrl,
      PansouUsername,
      PansouPassword,
      PansouKeywordBlocklist,
      MagnetProxy,
      MagnetMikanReverseProxy,
      MagnetDmhyReverseProxy,
      MagnetAcgripReverseProxy,
      EnableComments,
      CustomAdFilterCode,
      CustomAdFilterVersion,
      EnableRegistration,
      RequireRegistrationInviteCode,
      RegistrationInviteCode,
      RegistrationRequireTurnstile,
      LoginRequireTurnstile,
      TurnstileSiteKey,
      TurnstileSecretKey,
      DefaultUserTags,
      EnableOIDCLogin,
      EnableOIDCRegistration,
      OIDCIssuer,
      OIDCAuthorizationEndpoint,
      OIDCTokenEndpoint,
      OIDCUserInfoEndpoint,
      OIDCClientId,
      OIDCClientSecret,
      OIDCButtonText,
      OIDCMinTrustLevel,
    };

    // 写入数据库
    await db.saveAdminConfig(adminConfig);

    return apiSuccess({ ok: true }, {
        headers: {
          'Cache-Control': 'no-store', // 不缓存结果
        },
      });
  } catch (error) {
    logger.error('更新站点配置失败:', error);
    return apiError('更新站点配置失败', 500);
  }
}
