 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig, refineConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  const adminAuth = validateAdminAuth(request);
  if ('status' in adminAuth) return adminAuth;

  if (adminAuth.auth.role !== 'owner') {
    return apiError('权限不足，只有站长可以修改配置文件', 401);
  }

  try {
    let adminConfig = await getConfig();

    const body = await request.json();
    const { configFile, subscriptionUrl, autoUpdate, lastCheckTime } = body;

    if (!configFile || typeof configFile !== 'string') {
      return apiError('配置文件内容不能为空', 400);
    }

    try {
      JSON.parse(configFile);
    } catch (e) {
      return apiError('配置文件格式错误，请检查 JSON 语法', 400);
    }

    adminConfig.ConfigFile = configFile;
    if (!adminConfig.ConfigSubscribtion) {
      adminConfig.ConfigSubscribtion = {
        URL: '',
        AutoUpdate: false,
        LastCheck: '',
      };
    }

    if (subscriptionUrl !== undefined) {
      adminConfig.ConfigSubscribtion.URL = subscriptionUrl;
    }
    if (autoUpdate !== undefined) {
      adminConfig.ConfigSubscribtion.AutoUpdate = autoUpdate;
    }
    adminConfig.ConfigSubscribtion.LastCheck = lastCheckTime || '';

    adminConfig = refineConfig(adminConfig);
    await db.saveAdminConfig(adminConfig);

    try {
      await db.deleteGlobalValue('duanju');
      logger.info('已清除短剧视频源缓存');
    } catch (error) {
      logger.error('清除短剧视频源缓存失败:', error);
    }

    return apiSuccess({ message: '配置文件更新成功', });
  } catch (error) {
    logger.error('更新配置文件失败:', error);
    return apiError('更新配置文件失败', 500);
  }
}
