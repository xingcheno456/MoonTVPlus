import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/acg/download
 * 添加 ACG 资源到 OpenList 离线下载（仅管理员和站长可用）
 */
export async function POST(req: NextRequest) {
  try {
    // 检查权限
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || (authInfo.role !== 'admin' && authInfo.role !== 'owner')) {
      return apiError('无权限访问', 403);
    }

    const { url, name } = await req.json();

    if (!url || typeof url !== 'string') {
      return apiError('下载链接不能为空', 400);
    }

    if (!name || typeof name !== 'string') {
      return apiError('资源名称不能为空', 400);
    }

    // 私人影库功能已删除
    return apiError('私人影库功能已不可用', 400);
  } catch (error: unknown) {
    logger.error('添加离线下载任务失败:', error);
    return apiError((error as Error).message || '添加离线下载任务失败', 500);
  }
}
