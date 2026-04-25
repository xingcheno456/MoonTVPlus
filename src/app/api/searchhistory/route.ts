/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const HISTORY_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const history = await db.getSearchHistory(authInfo.username);
    return apiSuccess(history);
  } catch (err) {
    console.error('获取搜索历史失败', err);
    return apiError('Internal Server Error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const body = await request.json();
    const keyword: string = body.keyword?.trim();

    if (!keyword) {
      return apiError('Keyword is required', 400);
    }

    await db.addSearchHistory(authInfo.username, keyword);

    const history = await db.getSearchHistory(authInfo.username);
    return apiSuccess(history.slice(0, HISTORY_LIMIT));
  } catch (err) {
    console.error('添加搜索历史失败', err);
    return apiError('Internal Server Error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const { searchParams } = new URL(request.url);
    const kw = searchParams.get('keyword')?.trim();

    await db.deleteSearchHistory(authInfo.username, kw || undefined);

    return apiSuccess(null);
  } catch (err) {
    console.error('删除搜索历史失败', err);
    return apiError('Internal Server Error', 500);
  }
}
