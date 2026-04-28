
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';
import { OpenListClient } from '@/lib/openlist.client';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * 清理字符串中的 BOM 和其他不可见字符
 */
function cleanPath(path: string): string {
  // 移除 UTF-8 BOM (U+FEFF) 和其他零宽度字符
  let cleaned = path
    .replace(/^\uFEFF/, '') // 移除开头的 BOM
    .replace(/\uFEFF/g, '') // 移除所有 BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 移除零宽度字符
    .trim(); // 移除首尾空白

  // 移除末尾的 /（除非路径就是 /）
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
}

/**
 * POST /api/admin/openlist
 * 保存 OpenList 配置
 */
export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiSuccess({
        error: '不支持本地存储进行管理员配置',
      }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      action,
      Enabled,
      URL,
      Username,
      Password,
      RootPaths,
      OfflineDownloadPath,
      ScanInterval,
      ScanMode,
      DisableVideoPreview,
    } = body;

    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;
    const username = adminAuth.username;

    // 获取配置
    const adminConfig = await getConfig();

    if (action === 'save') {
      // 如果功能未启用，允许保存空配置
      if (!Enabled) {
        adminConfig.OpenListConfig = {
          Enabled: false,
          URL: URL || '',
          Username: Username || '',
          Password: Password || '',
          RootPaths: RootPaths || ['/'],
          OfflineDownloadPath: OfflineDownloadPath || '/',
          LastRefreshTime: adminConfig.OpenListConfig?.LastRefreshTime,
          ResourceCount: adminConfig.OpenListConfig?.ResourceCount,
          ScanInterval: 0,
          ScanMode: ScanMode || 'hybrid',
          DisableVideoPreview: DisableVideoPreview || false,
        };

        await db.saveAdminConfig(adminConfig);

        return apiSuccess({ message: '保存成功', });
      }

      // 功能启用时，验证必填字段
      if (!URL || !Username || !Password) {
        return apiError('请提供 URL、账号和密码', 400);
      }

      // 验证 RootPaths
      if (!Array.isArray(RootPaths) || RootPaths.length === 0) {
        return apiError('请至少提供一个根目录', 400);
      }

      // 清理 RootPaths 中的 BOM 和不可见字符
      const cleanedRootPaths = RootPaths.map(cleanPath);

      // 验证扫描间隔
      const scanInterval = parseInt(ScanInterval) || 0;
      if (scanInterval > 0 && scanInterval < 60) {
        return apiError('定时扫描间隔最低为 60 分钟', 400);
      }

      // 验证账号密码是否正确
      try {
        logger.info('[OpenList Config] 验证账号密码');
        await OpenListClient.login(URL, Username, Password);
        logger.info('[OpenList Config] 账号密码验证成功');
      } catch (error) {
        logger.error('[OpenList Config] 账号密码验证失败:', error);
        return apiError('账号密码验证失败: ' + (error as Error).message, 400);
      }

      adminConfig.OpenListConfig = {
        Enabled: true,
        URL,
        Username,
        Password,
        RootPaths: cleanedRootPaths,
        OfflineDownloadPath: OfflineDownloadPath || '/',
        LastRefreshTime: adminConfig.OpenListConfig?.LastRefreshTime,
        ResourceCount: adminConfig.OpenListConfig?.ResourceCount,
        ScanInterval: scanInterval,
        ScanMode: ScanMode || 'hybrid',
        DisableVideoPreview: DisableVideoPreview || false,
      };

      await db.saveAdminConfig(adminConfig);

      return apiSuccess({ message: '保存成功', });
    }

    return apiError('未知操作', 400);
  } catch (error) {
    logger.error('OpenList 配置操作失败:', error);
    return apiError('操作失败: ' + (error as Error).message, 500);
  }
}
