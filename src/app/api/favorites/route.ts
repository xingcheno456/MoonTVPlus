/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { Favorite } from '@/lib/types';

export const runtime = 'nodejs';

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

      if (!userInfoV2.favorite_migrated) {
        console.log(`用户 ${authInfo.username} 收藏未迁移，开始执行迁移...`);
        await db.migrateFavorites(authInfo.username);
      }
    } else {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2 || !userInfoV2.favorite_migrated) {
        console.log(`站长 ${authInfo.username} 收藏未迁移，开始执行迁移...`);
        await db.migrateFavorites(authInfo.username);
      }
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const [source, id] = key.split('+');
      if (!source || !id) {
        return apiError('Invalid key format', 400);
      }
      const fav = await db.getFavorite(authInfo.username, source, id);
      return apiSuccess(fav);
    }

    const favorites = await db.getAllFavorites(authInfo.username);
    return apiSuccess(favorites);
  } catch (err) {
    console.error('获取收藏失败', err);
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
    const { key, favorite }: { key: string; favorite: Favorite } = body;

    if (!key || !favorite) {
      return apiError('Missing key or favorite', 400);
    }

    if (!favorite.title || !favorite.source_name) {
      return apiError('Invalid favorite data', 400);
    }

    const [source, id] = key.split('+');
    if (!source || !id) {
      return apiError('Invalid key format', 400);
    }

    const finalFavorite = {
      ...favorite,
      save_time: favorite.save_time ?? Date.now(),
    } as Favorite;

    await db.saveFavorite(authInfo.username, source, id, finalFavorite);

    return apiSuccess(null);
  } catch (err) {
    console.error('保存收藏失败', err);
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

    const username = authInfo.username;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const [source, id] = key.split('+');
      if (!source || !id) {
        return apiError('Invalid key format', 400);
      }
      await db.deleteFavorite(username, source, id);
    } else {
      const all = await db.getAllFavorites(username);
      await Promise.all(
        Object.keys(all).map(async (k) => {
          const [s, i] = k.split('+');
          if (s && i) await db.deleteFavorite(username, s, i);
        }),
      );
    }

    return apiSuccess(null);
  } catch (err) {
    console.error('删除收藏失败', err);
    return apiError('Internal Server Error', 500);
  }
}
