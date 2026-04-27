
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import {
  getDanmakuFilterConfig,
  saveDanmakuFilterConfig,
} from '@/services/playrecord.service';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const filterConfig = await getDanmakuFilterConfig(username);

    if (!filterConfig) {
      return apiSuccess({ rules: [] });
    }

    return apiSuccess(filterConfig);
  } catch (error) {
    logger.error('获取弹幕过滤配置失败:', error);
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const body = await request.json();

    await saveDanmakuFilterConfig(username, body);
    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === '配置格式错误') {
      return apiError(error.message, 400);
    }
    logger.error('保存弹幕过滤配置失败:', error);
    return handleServiceError(error);
  }
}
