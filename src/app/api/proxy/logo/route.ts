/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiError } from '@/lib/api-response';
import { commonSchemas } from '@/lib/api-schemas';
import { parseSearchParams } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { validateProxyUrlServerSide } from '@/lib/server/ssrf';
import { z } from 'zod';

const logoQuerySchema = z.object({
  url: commonSchemas.url,
  'moontv-source': z.string().optional(),
});

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const paramResult = parseSearchParams(request as any, logoQuerySchema);
  if ('error' in paramResult) return paramResult.error;
  const { url: imageUrl, 'moontv-source': source } = paramResult.data;

  const decodedUrl = decodeURIComponent(imageUrl);

  const isSafeUrl = await validateProxyUrlServerSide(decodedUrl);
  if (!isSafeUrl) {
    return apiError('Proxy request to local or invalid network is forbidden', 403);
  }

  const config = await getConfig();
  const liveSource = config.LiveConfig?.find((s: any) => s.key === source);
  const ua = liveSource?.ua || 'AptvPlayer/1.4.10';

  try {
    const imageResponse = await fetch(decodedUrl, {
      cache: 'no-cache',
      redirect: 'follow',
      credentials: 'same-origin',
      headers: {
        'User-Agent': ua,
      },
    });

    if (!imageResponse.ok) {
      return apiError(imageResponse.statusText, imageResponse.status);
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      return apiError('Image response has no body', 500);
    }

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 设置缓存头
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 缓存一天

    // 直接返回图片流
    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return apiError('Error fetching image', 500);
  }
}
