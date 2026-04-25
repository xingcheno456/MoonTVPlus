import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { suwayomiClient } from '@/lib/suwayomi.client';

import { getAuthorizedUsername } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const chapterId = new URL(request.url).searchParams
      .get('chapterId')
      ?.trim();
    if (!chapterId) {
      return apiError('缺少 chapterId', 400);
    }

    const pages = await suwayomiClient.getChapterPages(chapterId);
    return apiSuccess({ pages });
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
