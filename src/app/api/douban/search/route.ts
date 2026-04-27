import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { fetchDoubanData } from '@/lib/douban';

export const runtime = 'nodejs';

interface DoubanSearchResult {
  id: string;
  title: string;
  year: string;
  type?: string;
  sub_title?: string;
  episode?: string;
  img?: string;
}

interface DoubanSearchResponse {
  code: number;
  data?: DoubanSearchResult[];
}

/**
 * GET /api/douban/search?q=<query>
 * 搜索豆瓣影视作品
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return apiError('缺少搜索关键词', 400);
  }

  try {
    const target = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;
    const data = await fetchDoubanData<DoubanSearchResult[]>(target);

    const response: DoubanSearchResponse = {
      code: 200,
      data: data,
    };

    return apiSuccess(response);
  } catch (error) {
    return apiError('搜索豆瓣数据失败: ' + (error as Error).message, 500);
  }
}
