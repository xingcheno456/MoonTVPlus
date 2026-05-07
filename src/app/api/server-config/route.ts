
import { NextRequest } from 'next/server';

import { apiSuccess } from '@/lib/api-response';
import { getConfig } from '@/lib/config';
import { STORAGE_TYPE } from '@/lib/db';
import { CURRENT_VERSION } from '@/lib/version';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  logger.info('server-config called: ', request.url);

  const storageType = STORAGE_TYPE;

  const isLiteMode = process.env.MOONTV_LITE === 'true';

  const watchRoomConfig = isLiteMode
    ? {
        enabled: false,
        serverType: 'external' as const,
        externalServerUrl: undefined,
      }
    : {
        enabled: process.env.WATCH_ROOM_ENABLED === 'true',
        serverType:
          (process.env.WATCH_ROOM_SERVER_TYPE as 'internal' | 'external') ||
          'internal',
        externalServerUrl: process.env.WATCH_ROOM_EXTERNAL_SERVER_URL,
      };

  if (storageType === 'localstorage') {
    return apiSuccess({
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus',
      StorageType: 'localstorage',
      Version: CURRENT_VERSION,
      WatchRoom: watchRoomConfig,
      EnableOfflineDownload:
        process.env.NEXT_PUBLIC_ENABLE_OFFLINE_DOWNLOAD === 'true',
      DanmakuAutoLoadDefault: true,
    });
  }

  const config = await getConfig();
  return apiSuccess({
    SiteName: config.SiteConfig.SiteName,
    StorageType: storageType,
    Version: CURRENT_VERSION,
    WatchRoom: watchRoomConfig,
    EnableOfflineDownload:
      process.env.NEXT_PUBLIC_ENABLE_OFFLINE_DOWNLOAD === 'true',
    EnableRegistration: config.SiteConfig.EnableRegistration || false,
    RequireRegistrationInviteCode:
      config.SiteConfig.RequireRegistrationInviteCode || false,
    RegistrationRequireTurnstile:
      config.SiteConfig.RegistrationRequireTurnstile || false,
    LoginRequireTurnstile: config.SiteConfig.LoginRequireTurnstile || false,
    TurnstileSiteKey: config.SiteConfig.TurnstileSiteKey || '',
    EnableOIDCLogin: config.SiteConfig.EnableOIDCLogin || false,
    EnableOIDCRegistration: config.SiteConfig.EnableOIDCRegistration || false,
    OIDCButtonText: config.SiteConfig.OIDCButtonText || '',
    DanmakuAutoLoadDefault: config.SiteConfig.DanmakuAutoLoadDefault !== false,
    loginBackgroundImage: config.ThemeConfig?.loginBackgroundImage || '',
    registerBackgroundImage: config.ThemeConfig?.registerBackgroundImage || '',
    progressThumbType: config.ThemeConfig?.progressThumbType || 'default',
    progressThumbPresetId: config.ThemeConfig?.progressThumbPresetId || '',
    progressThumbCustomUrl: config.ThemeConfig?.progressThumbCustomUrl || '',

  });
}
