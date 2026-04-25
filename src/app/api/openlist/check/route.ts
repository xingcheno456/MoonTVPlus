/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { OpenListClient } from '@/lib/openlist.client';

export const runtime = 'nodejs';

/**
 * POST /api/openlist/check
 * 检查 OpenList 连通性
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
    const { url, username, password } = body;

    if (!url || !username || !password) {
      return apiError('缺少必要参数', 400);
    }

    // 创建客户端并检查连通性
    const client = new OpenListClient(url, username, password);
    const result = await client.checkConnectivity();

    if (result.success) {
      return apiSuccess({ message: result.message, });
    } else {
      return apiSuccess({
          success: false,
          error: result.message,
        }, { status: 400 });
    }
  } catch (error) {
    console.error('检查 OpenList 连通性失败:', error);
    return apiSuccess({
        success: false,
        error: error instanceof Error ? error.message : '检查失败',
      }, { status: 500 });
  }
}
