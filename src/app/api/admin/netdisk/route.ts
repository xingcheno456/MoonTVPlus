
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig, setCachedConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';
import {
  assertQuarkCookieHeaderSafe,
  normalizeQuarkCookie,
  validateQuarkCookieReadable,
} from '@/lib/netdisk/quark.client';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;

    const body = await request.json();
    const { action, Quark } = body;
    const adminConfig = await getConfig();

    if (action === 'save') {
      const normalizedCookie = Quark?.Cookie
        ? assertQuarkCookieHeaderSafe(Quark.Cookie)
        : '';

      adminConfig.NetDiskConfig = adminConfig.NetDiskConfig || {};
      adminConfig.NetDiskConfig.Quark = {
        Enabled: Boolean(Quark?.Enabled),
        Cookie: normalizedCookie,
        SavePath: Quark?.SavePath || '/',
        PlayTempSavePath: Quark?.PlayTempSavePath || '/',
        OpenListTempPath: Quark?.OpenListTempPath || '/',
      };

      await db.saveAdminConfig(adminConfig);
      await setCachedConfig(adminConfig);

      return apiSuccess({ message: '保存成功' });
    }

    if (action === 'validate') {
      if (!Quark?.Cookie) {
        return apiError('请先填写夸克 Cookie', 400);
      }

      await validateQuarkCookieReadable(normalizeQuarkCookie(Quark.Cookie));

      return apiSuccess({ message: '夸克cookie正常', });
    }

    return apiError('未知操作', 400);
  } catch (error) {
    logger.error('[Admin NetDisk] 操作失败:', error);
    return apiError(error instanceof Error ? error.message : '操作失败', 500);
  }
}
