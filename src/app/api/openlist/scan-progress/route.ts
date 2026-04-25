/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getScanTask } from '@/lib/scan-task';

export const runtime = 'nodejs';

/**
 * GET /api/openlist/scan-progress?taskId=xxx
 * 获取扫描任务进度
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return apiError('缺少 taskId', 400);
    }

    const task = getScanTask(taskId);

    if (!task) {
      return apiError('任务不存在', 404);
    }

    return apiSuccess({ task, });
  } catch (error) {
    console.error('获取扫描进度失败:', error);
    return apiError('获取失败: ' + (error as Error).message, 500);
  }
}
