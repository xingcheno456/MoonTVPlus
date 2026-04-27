 

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { OpenListClient } from '@/lib/openlist.client';

import { logger } from '../../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/openlist/play/{token}?folder=xxx&fileName=xxx
 * 获取单个视频文件的播放链接（懒加载）
 * 返回重定向到真实播放 URL
 *
 * 权限验证：TVBox Token（路径参数） 或 用户登录（满足其一即可）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);

    // 双重验证：TVBox Token（全局或用户） 或 用户登录
    const { token } = await params;
    const requestToken = token;
    const globalToken = process.env.TVBOX_SUBSCRIBE_TOKEN;
    const authInfo = getAuthInfoFromCookie(request);

    // 验证 TVBox Token（全局token或用户token）
    let hasValidToken = false;
    if (globalToken && requestToken === globalToken) {
      // 全局token
      hasValidToken = true;
    } else {
      // 检查是否是用户token
      const { db } = await import('@/lib/db');
      const username = await db.getUsernameByTvboxToken(requestToken);
      if (username) {
        // 检查用户是否被封禁
        const userInfo = await db.getUserInfoV2(username);
        if (userInfo && !userInfo.banned) {
          hasValidToken = true;
        }
      }
    }

    // 验证用户登录
    const hasValidAuth = authInfo && authInfo.username;

    // 两者至少满足其一
    if (!hasValidToken && !hasValidAuth) {
      return apiError('未授权', 401);
    }

    const folderName = searchParams.get('folder');
    const fileName = searchParams.get('fileName');

    if (!folderName || !fileName) {
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

    const rootPath = openListConfig.RootPath || '/';
    const folderPath = `${rootPath}${rootPath.endsWith('/') ? '' : '/'}${folderName}`;
    const filePath = `${folderPath}/${fileName}`;

    const client = new OpenListClient(
      openListConfig.URL,
      openListConfig.Username,
      openListConfig.Password,
    );

    // 获取文件的播放链接
    const fileResponse = await client.getFile(filePath);

    if (fileResponse.code !== 200 || !fileResponse.data.raw_url) {
      logger.error('[OpenList Play] 获取播放URL失败:', {
        fileName,
        code: fileResponse.code,
        message: fileResponse.message,
      });
      return apiError('获取播放链接失败', 500);
    }

    // 返回重定向到真实播放 URL
    return NextResponse.redirect(fileResponse.data.raw_url);
  } catch (error) {
    logger.error('获取播放链接失败:', error);
    return apiError('获取失败: ' + (error as Error).message, 500);
  }
}
