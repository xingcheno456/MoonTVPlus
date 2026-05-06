/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiError } from '@/lib/api-response';
import { commonSchemas } from '@/lib/api-schemas';
import { parseSearchParams } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { buildProxyStreamHeaders } from '@/lib/server/proxy-headers';
import { validateProxyUrlServerSide } from '@/lib/server/ssrf';
import { z } from 'zod';

export const runtime = 'nodejs';

const vodProxyKeySchema = z.object({
  url: commonSchemas.url,
  source: commonSchemas.source,
});

export async function GET(request: Request) {
  const paramResult = parseSearchParams(request, vodProxyKeySchema);
  if ('error' in paramResult) return paramResult.error;
  const { url, source } = paramResult.data;

  const config = await getConfig();
  const videoSource = config.SourceConfig?.find((s: any) => s.key === source);

  if (!videoSource) {
    return apiError('Source not found', 404);
  }

  if (!videoSource.proxyMode) {
    return apiError('Proxy mode not enabled for this source', 403);
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // 安全校验：防 SSRF 拦截请求内网或非法 URL
    const isSafeUrl = await validateProxyUrlServerSide(decodedUrl);
    if (!isSafeUrl) {
      return apiError('Proxy request to local or invalid network is forbidden', 403);
    }

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: decodedUrl,
      },
    });

    if (!response.ok) {
      return apiError('Failed to fetch key', 500);
    }

    const headers = buildProxyStreamHeaders(
      response.headers.get('Content-Type') || 'application/octet-stream',
    );

    return new Response(response.body, { headers });
  } catch (error) {
    return apiError('Failed to fetch key', 500);
  }
}
