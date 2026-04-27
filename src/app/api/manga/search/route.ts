import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { suwayomiClient } from '@/lib/suwayomi.client';

import { getAuthorizedUsername } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const sourceId = searchParams.get('sourceId')?.trim() || undefined;
    const page = Number(searchParams.get('page') || '1');

    if (!q) {
      return apiSuccess({ results: [] });
    }

    const results = await suwayomiClient.searchManga(q, sourceId, page);
    return apiSuccess({ results });
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
