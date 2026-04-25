import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getCachedLiveChannels } from '@/lib/live';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceKey = searchParams.get('source');
    const tvgId = searchParams.get('tvgId');

    if (!sourceKey) {
      return apiError('缺少直播源参数', 400);
    }

    if (!tvgId) {
      return apiError('缺少频道tvg-id参数', 400);
    }

    const channelData = await getCachedLiveChannels(sourceKey);

    if (!channelData) {
      // 频道信息未找到时返回空的节目单数据
      return apiSuccess({ data: {
          tvgId,
          source: sourceKey,
          epgUrl: '',
          programs: [],
        }, });
    }

    // 从epgs字段中获取对应tvgId的节目单信息
    const epgData = channelData.epgs[tvgId] || [];

    return apiSuccess({ data: {
        tvgId,
        source: sourceKey,
        epgUrl: channelData.epgUrl,
        programs: epgData,
      }, });
  } catch (error) {
    return apiError('获取节目单信息失败', 500);
  }
}
