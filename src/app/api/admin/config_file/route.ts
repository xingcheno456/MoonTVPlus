 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig, refineConfig } from '@/lib/config';
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

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }
  const username = authInfo.username;

  try {
    // 检查用户权限
    let adminConfig = await getConfig();

    // 仅站长可以修改配置文件
    if (username !== process.env.USERNAME) {
      return apiError('权限不足，只有站长可以修改配置文件', 401);
    }

    // 获取请求体
    const body = await request.json();
    const { configFile, subscriptionUrl, autoUpdate, lastCheckTime } = body;

    if (!configFile || typeof configFile !== 'string') {
      return apiError('配置文件内容不能为空', 400);
    }

    // 验证 JSON 格式
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

    // 更新订阅配置
    if (subscriptionUrl !== undefined) {
      adminConfig.ConfigSubscribtion.URL = subscriptionUrl;
    }
    if (autoUpdate !== undefined) {
      adminConfig.ConfigSubscribtion.AutoUpdate = autoUpdate;
    }
    adminConfig.ConfigSubscribtion.LastCheck = lastCheckTime || '';

    adminConfig = refineConfig(adminConfig);
    // 更新配置文件
    await db.saveAdminConfig(adminConfig);

    // 清除短剧视频源缓存（因为配置文件可能包含新的视频源）
    try {
      await db.deleteGlobalValue('duanju');
      logger.info('已清除短剧视频源缓存');
    } catch (error) {
      logger.error('清除短剧视频源缓存失败:', error);
      // 不影响主流程，继续执行
    }

    return apiSuccess({ message: '配置文件更新成功', });
  } catch (error) {
    logger.error('更新配置文件失败:', error);
    return apiSuccess({
        error: '更新配置文件失败',
        details: (error as Error).message,
      }, { status: 500 });
  }
}
