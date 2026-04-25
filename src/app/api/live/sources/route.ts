/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log(request.url);
  try {
    const config = await getConfig();

    if (!config) {
      return apiError('配置未找到', 404);
    }

    // 过滤出所有非 disabled 的直播源
    const liveSources = (config.LiveConfig || []).filter(
      (source) => !source.disabled,
    );

    return apiSuccess({ data: liveSources, });
  } catch (error) {
    console.error('获取直播源失败:', error);
    return apiError('获取直播源失败', 500);
  }
}
