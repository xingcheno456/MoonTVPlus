import { apiError } from '@/lib/api-response';
import { commonSchemas } from '@/lib/api-schemas';
import { parseSearchParams } from '@/lib/api-validation';
import { isDomainAllowed } from '@/lib/server/proxy-whitelist';
import { validateProxyUrlServerSide } from '@/lib/server/ssrf';
import { z } from 'zod';

export const runtime = 'nodejs';

const imageProxyQuerySchema = z.object({
  url: commonSchemas.url,
});

export async function GET(request: Request) {
  const paramResult = parseSearchParams(request, imageProxyQuerySchema);
  if ('error' in paramResult) return paramResult.error;
  const { url: imageUrl } = paramResult.data;

  const decodedUrl = decodeURIComponent(imageUrl);

  const isSafeUrl = await validateProxyUrlServerSide(decodedUrl);
  if (!isSafeUrl) {
    return apiError('Proxy request to local or invalid network is forbidden', 403);
  }

  if (!isDomainAllowed(decodedUrl)) {
    return apiError('Domain not in proxy whitelist', 403);
  }

  try {
    const imageResponse = await fetch(decodedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'image/jpeg,image/png,image/gif */*;q=0.8',
        Referer: 'https://movie.douban.com/',
      },
    });

    if (!imageResponse.ok) {
      return apiError(imageResponse.statusText, imageResponse.status);
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      return apiError('Image response has no body', 500);
    }

    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000');
    headers.set('CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Netlify-Vary', 'query');

    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return apiError('Error fetching image', 500);
  }
}
