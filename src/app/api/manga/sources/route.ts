import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { suwayomiClient } from '@/lib/suwayomi.client';

import { getAuthorizedUsername } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const lang =
      new URL(request.url).searchParams.get('lang') ||
      process.env.SUWAYOMI_DEFAULT_LANG ||
      'zh';
    const sources = await suwayomiClient.getSources(lang);
    return apiSuccess({ sources });
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
