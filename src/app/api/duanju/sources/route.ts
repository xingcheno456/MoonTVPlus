/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { apiError, apiSuccess } from '@/lib/api-response';

import { getCacheTime } from '@/lib/config';
import { getDuanjuSources } from '@/lib/duanju';

export const runtime = 'nodejs';

/**
 * 获取包含短剧分类的视频源列表
 */
export async function GET() {
  try {
    const sources = await getDuanjuSources();
    const cacheTime = await getCacheTime();

    return apiSuccess({
        code: 200,
        message: '获取成功',
        data: sources,
      }, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        },
      });
  } catch (error) {
    console.error('获取短剧视频源失败:', error);
    return apiSuccess({
        code: 500,
        message: '获取短剧视频源失败',
        error: (error as Error).message,
      }, { status: 500 });
  }
}
