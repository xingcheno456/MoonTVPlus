/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { OpenListClient } from '@/lib/openlist.client';

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

    // 获取 OpenList 配置
    const config = await getConfig();
    const openlistConfig = config.OpenListConfig;

    if (!openlistConfig?.Enabled) {
      return apiError('私人影库功能未启用', 400);
    }

    if (
      !openlistConfig.URL ||
      !openlistConfig.Username ||
      !openlistConfig.Password
    ) {
      return apiError('OpenList 配置不完整', 400);
    }

    // 构建下载路径（使用离线下载目录）
    const offlineDownloadPath = openlistConfig.OfflineDownloadPath || '/';
    const downloadPath = `${offlineDownloadPath.replace(/\/$/, '')}/${name}`;

    // 使用 OpenListClient 添加离线下载任务
    const client = new OpenListClient(
      openlistConfig.URL,
      openlistConfig.Username,
      openlistConfig.Password,
    );

    // 获取 Token 并调用 API
    const token = await (client as any).getToken();
    const openlistUrl = `${openlistConfig.URL.replace(/\/$/, '')}/api/fs/add_offline_download`;

    const response = await fetch(openlistUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        path: downloadPath,
        urls: [url],
        tool: 'aria2',
      }),
    });

    const data = await response.json();

    // 检查响应状态
    if (!response.ok || data.code !== 200) {
      throw new Error(data.message || '添加离线下载任务失败');
    }

    return apiSuccess({ message: '已添加到离线下载队列',
      path: downloadPath, });
  } catch (error: any) {
    console.error('添加离线下载任务失败:', error);
    return apiError(error.message || '添加离线下载任务失败', 500);
  }
}
