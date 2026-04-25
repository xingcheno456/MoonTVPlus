/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { OpenListClient } from '@/lib/openlist.client';
import { invalidateVideoInfoCache } from '@/lib/openlist-cache';

export const runtime = 'nodejs';

/**
 * POST /api/openlist/refresh-video
 * 刷新单个视频的 videoinfo.json
 */
export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    const body = await request.json();
    const { folder } = body;

    if (!folder) {
      return apiError('缺少参数', 400);
    }

    const config = await getConfig();
    const openListConfig = config.OpenListConfig;

    if (
      !openListConfig ||
      !openListConfig.Enabled ||
      !openListConfig.URL ||
      !openListConfig.Username ||
      !openListConfig.Password
    ) {
      return apiError('OpenList 未配置或未启用', 400);
    }

    // folder 已经是完整路径，直接使用
    const folderPath = folder;
    const client = new OpenListClient(
      openListConfig.URL,
      openListConfig.Username,
      openListConfig.Password,
    );

    // 清除缓存
    invalidateVideoInfoCache(folderPath);

    return apiSuccess({ message: '刷新成功', });
  } catch (error) {
    console.error('刷新视频失败:', error);
    return apiError('刷新失败: ' + (error as Error).message, 500);
  }
}
