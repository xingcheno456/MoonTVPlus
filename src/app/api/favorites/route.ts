/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import {
  deleteFavorite,
  getAllFavorites,
  getFavorite,
  saveFavorite,
} from '@/services/playrecord.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const favorite = await getFavorite(username, key);
      return apiSuccess(favorite);
    }

    const favorites = await getAllFavorites(username);
    return apiSuccess(favorites);
  } catch (err) {
    console.error('获取收藏失败', err);
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const body = await request.json();
    const { key, favorite } = body;

    if (!key || !favorite) {
      return apiError('Missing key or favorite', 400);
    }

    await saveFavorite(username, key, favorite);
    return apiSuccess(null);
  } catch (err) {
    if (err instanceof Error && (err.message === 'Invalid key format' || err.message === 'Invalid favorite data')) {
      return apiError(err.message, 400);
    }
    console.error('保存收藏失败', err);
    return handleServiceError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    await deleteFavorite(username, key || undefined);
    return apiSuccess(null);
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid key format') {
      return apiError(err.message, 400);
    }
    console.error('删除收藏失败', err);
    return handleServiceError(err);
  }
}
