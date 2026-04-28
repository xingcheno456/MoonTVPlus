
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import {
  addSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
} from '@/services/playrecord.service';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const history = await getSearchHistory(username);
    return apiSuccess(history);
  } catch (err) {
    logger.error('获取搜索历史失败', err);
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const body = await request.json();
    const keyword: string = body.keyword?.trim();

    if (!keyword) {
      return apiError('Keyword is required', 400);
    }

    const history = await addSearchHistory(username, keyword);
    return apiSuccess(history);
  } catch (err) {
    logger.error('添加搜索历史失败', err);
    return handleServiceError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const kw = searchParams.get('keyword')?.trim();

    await deleteSearchHistory(username, kw || undefined);
    return apiSuccess(null);
  } catch (err) {
    logger.error('删除搜索历史失败', err);
    return handleServiceError(err);
  }
}
