import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic'; // 禁用缓存

export async function GET(request: NextRequest) {
  try {
    const config = await getConfig();
    if (!config?.WebLiveConfig) {
      return apiSuccess([]);
    }

    const sources = config.WebLiveConfig.filter((s) => !s.disabled);
    return apiSuccess(sources);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : '获取失败', 500);
  }
}
