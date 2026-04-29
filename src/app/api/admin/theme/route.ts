 

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
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const body = await request.json();

    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;
    const username = adminAuth.username;

    const {
      enableBuiltInTheme,
      builtInTheme,
      customCSS,
      enableCache,
      cacheMinutes,
      loginBackgroundImage,
      registerBackgroundImage,
      progressThumbType,
      progressThumbPresetId,
      progressThumbCustomUrl,
    } = body as {
      enableBuiltInTheme: boolean;
      builtInTheme: string;
      customCSS: string;
      enableCache: boolean;
      cacheMinutes: number;
      loginBackgroundImage?: string;
      registerBackgroundImage?: string;
      progressThumbType?: 'default' | 'preset' | 'custom';
      progressThumbPresetId?: string;
      progressThumbCustomUrl?: string;
    };

    // 参数校验
    if (
      typeof enableBuiltInTheme !== 'boolean' ||
      typeof builtInTheme !== 'string' ||
      typeof customCSS !== 'string' ||
      typeof enableCache !== 'boolean' ||
      typeof cacheMinutes !== 'number'
    ) {
      return apiError('参数格式错误', 400);
    }

    // 验证背景图URL格式（支持多行，每行一个URL）
    if (loginBackgroundImage && loginBackgroundImage.trim() !== '') {
      const urls = loginBackgroundImage
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url !== '');

      for (const url of urls) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return apiError(`登录界面背景图URL格式错误：${url}，每个URL必须以http://或https://开头`, 400);
        }
      }
    }

    if (registerBackgroundImage && registerBackgroundImage.trim() !== '') {
      const urls = registerBackgroundImage
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url !== '');

      for (const url of urls) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return apiError(`注册界面背景图URL格式错误：${url}，每个URL必须以http://或https://开头`, 400);
        }
      }
    }

    const adminConfig = await getConfig();

    // 获取当前版本号，如果CSS有变化则递增
    const currentVersion = adminConfig.ThemeConfig?.cacheVersion || 0;
    const currentCSS = enableBuiltInTheme
      ? adminConfig.ThemeConfig?.builtInTheme
      : adminConfig.ThemeConfig?.customCSS;
    const newCSS = enableBuiltInTheme ? builtInTheme : customCSS;
    const cssChanged = currentCSS !== newCSS;

    // 更新主题配置
    adminConfig.ThemeConfig = {
      enableBuiltInTheme,
      builtInTheme,
      customCSS,
      enableCache,
      cacheMinutes,
      cacheVersion: cssChanged ? currentVersion + 1 : currentVersion,
      loginBackgroundImage: loginBackgroundImage?.trim() || undefined,
      registerBackgroundImage: registerBackgroundImage?.trim() || undefined,
      progressThumbType: progressThumbType || 'default',
      progressThumbPresetId: progressThumbPresetId?.trim() || undefined,
      progressThumbCustomUrl: progressThumbCustomUrl?.trim() || undefined,
    };

    // 写入数据库
    await db.saveAdminConfig(adminConfig);

    return apiSuccess({
        ok: true,
        cacheVersion: adminConfig.ThemeConfig.cacheVersion,
      }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
  } catch (error) {
    logger.error('更新主题配置失败:', error);
    return apiError('更新主题配置失败', 500);
  }
}
