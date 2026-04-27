
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import {
  deleteSkipConfig,
  getAllSkipConfigs,
  getSkipConfig,
  saveSkipConfig,
} from '@/services/playrecord.service';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const id = searchParams.get('id');

    if (source && id) {
      const config = await getSkipConfig(username, source, id);
      return apiSuccess(config);
    }

    const configs = await getAllSkipConfigs(username);
    return apiSuccess(configs);
  } catch (error) {
    logger.error('获取跳过片头片尾配置失败:', error);
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const body = await request.json();
    const { key, config } = body;

    if (!key || !config) {
      return apiError('缺少必要参数', 400);
    }

    await saveSkipConfig(username, key, config);
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Invalid key format')) {
      return apiError(error.message, 400);
    }
    logger.error('保存跳过片头片尾配置失败:', error);
    return handleServiceError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return apiError('缺少必要参数', 400);
    }

    await deleteSkipConfig(username, key);
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid key format') {
      return apiError(error.message, 400);
    }
    logger.error('删除跳过片头片尾配置失败:', error);
    return handleServiceError(error);
  }
}
