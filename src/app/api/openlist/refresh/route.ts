 

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { startOpenListRefresh } from '@/lib/openlist-refresh';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/openlist/refresh
 * 刷新私人影库元数据（后台任务模式）
 */
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    // 检查 TMDB API Key 是否配置
    const config = await getConfig();
    if (
      !config.SiteConfig.TMDBApiKey ||
      config.SiteConfig.TMDBApiKey.trim() === ''
    ) {
      return apiError('请先在站点配置中配置 TMDB API Key', 400);
    }

    // 获取请求参数
    const body = await request.json().catch(() => ({}));
    const clearMetaInfo = body.clearMetaInfo === true;

    // 启动扫描任务
    const { taskId } = await startOpenListRefresh(clearMetaInfo);

    return apiSuccess({ taskId,
      message: '扫描任务已启动', });
  } catch (error) {
    logger.error('启动刷新任务失败:', error);
    return apiError('启动失败: ' + (error as Error).message, 500);
  }
}
