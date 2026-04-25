/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

import { apiError, apiSuccess } from '@/lib/api-response';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: Request) {
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
    console.log(decodedUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': ua,
      },
    });
    if (!response.ok) {
      return apiError('Failed to fetch key', 500);
    }
    const keyData = await response.arrayBuffer();
    return new Response(keyData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return apiError('Failed to fetch key', 500);
  }
}
