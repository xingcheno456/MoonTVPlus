import { apiError, apiSuccess } from '@/lib/api-response';

export const runtime = 'nodejs';

// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return apiError('Missing image URL', 400);
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'image/jpeg,image/png,image/gif,*/*;q=0.8',
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

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 设置缓存头（可选）
    headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000'); // 缓存半年
    headers.set('CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15720000');
    headers.set('Netlify-Vary', 'query');

    // 直接返回图片流
    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return apiError('Error fetching image', 500);
  }
}
