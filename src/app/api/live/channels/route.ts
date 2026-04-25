import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getCachedLiveChannels } from '@/lib/live';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceKey = searchParams.get('source');

    if (!sourceKey) {
      return apiError('缺少直播源参数', 400);
    }

    const channelData = await getCachedLiveChannels(sourceKey);

    if (!channelData) {
      return apiError('频道信息未找到', 404);
    }

    return apiSuccess({ data: channelData.channels, });
  } catch (error) {
    return apiError('获取频道信息失败', 500);
  }
}
