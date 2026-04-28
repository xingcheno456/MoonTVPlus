 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import {
  invalidateMetaInfoCache,
  MetaInfo,
  setCachedMetaInfo,
} from '@/lib/openlist-cache';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/openlist/delete
 * 删除私人影库中的视频记录
 */
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    // 获取请求参数
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return apiError('缺少 key 参数', 400);
    }

    // 获取配置
    const config = await getConfig();
    const openListConfig = config.OpenListConfig;

    if (!openListConfig || !openListConfig.Enabled || !openListConfig.URL) {
      return apiError('OpenList 未配置或未启用', 400);
    }

    // 从数据库读取 metainfo
    const metainfoContent = await db.getGlobalValue('video.metainfo');
    if (!metainfoContent) {
      return apiError('未找到视频元数据', 404);
    }

    const metaInfo: MetaInfo = JSON.parse(metainfoContent);

    // 检查 key 是否存在
    if (!metaInfo.folders[key]) {
      return apiError('未找到该视频记录', 404);
    }

    // 删除记录
    delete metaInfo.folders[key];

    // 保存到数据库
    const updatedMetainfoContent = JSON.stringify(metaInfo);
    await db.setGlobalValue('video.metainfo', updatedMetainfoContent);

    // 更新缓存
    invalidateMetaInfoCache();
    setCachedMetaInfo(metaInfo);

    // 更新配置中的资源数量
    if (config.OpenListConfig) {
      config.OpenListConfig.ResourceCount = Object.keys(
        metaInfo.folders,
      ).length;
      await db.saveAdminConfig(config);
    }

    return apiSuccess({ message: '删除成功', });
  } catch (error) {
    logger.error('删除视频记录失败:', error);
    return apiError('删除失败: ' + (error as Error).message, 500);
  }
}
