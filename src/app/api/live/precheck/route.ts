/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const source = searchParams.get('moontv-source');

  if (!url) {
    return apiError('Missing url', 400);
  }
  const config = await getConfig();
  const liveSource = config.LiveConfig?.find((s: any) => s.key === source);
  if (!liveSource) {
    return apiError('Source not found', 404);
  }
  const ua = liveSource.ua || 'AptvPlayer/1.4.10';

  try {
    const decodedUrl = decodeURIComponent(url);

    const response = await fetch(decodedUrl, {
      cache: 'no-cache',
      redirect: 'follow',
      credentials: 'same-origin',
      headers: {
        'User-Agent': ua,
      },
    });

    if (!response.ok) {
      return apiError('Failed to fetch: ' + response.statusText, 500);
    }

    const contentType = response.headers.get('Content-Type');
    if (response.body) {
      response.body.cancel();
    }
    if (contentType?.includes('video/mp4')) {
      return apiSuccess({ type: 'mp4' }, { status: 200 });
    }
    if (contentType?.includes('video/x-flv')) {
      return apiSuccess({ type: 'flv' }, { status: 200 });
    }
    return apiSuccess({ type: 'm3u8' }, { status: 200 });
  } catch (error) {
    return apiError('Failed to fetch: ' + (error instanceof Error ? error.message : String(error)), 500);
  }
}
