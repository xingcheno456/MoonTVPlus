import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { MangaRecommendType } from '@/lib/manga.types';
import { suwayomiClient } from '@/lib/suwayomi.client';

import { getAuthorizedUsername } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId')?.trim();
    const page = Number(searchParams.get('page') || '1');
    const typeParam = searchParams.get('type')?.trim().toUpperCase();
    const type: MangaRecommendType =
      typeParam === 'LATEST' ? 'LATEST' : 'POPULAR';

    if (!sourceId) {
      return apiSuccess({ mangas: [], hasNextPage: false });
    }

    const result = await suwayomiClient.getRecommendedManga(
      sourceId,
      type,
      page,
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
