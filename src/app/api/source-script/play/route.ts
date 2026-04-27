import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import {
  parseScriptPlayUrlValue,
  resolveSavedScriptPlayUrl,
} from '@/lib/source-script';

export const runtime = 'nodejs';

/**
 * GET /api/source-script/play?key=xxx&sourceId=xxx&episodeIndex=0&playUrl=base64url&format=json
 * format=json: 返回 JSON 格式（用于 play 页面）
 * 默认: 返回重定向（用于播放器或外部调用）
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未授权', 401);
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const sourceId = searchParams.get('sourceId');
    const episodeIndexRaw = searchParams.get('episodeIndex');
    const playUrlEncoded = searchParams.get('playUrl');
    const format = searchParams.get('format');

    if (!key || !sourceId || !episodeIndexRaw || !playUrlEncoded) {
      return apiError('缺少参数', 400);
    }

    const episodeIndex = Number.parseInt(episodeIndexRaw, 10);
    if (!Number.isInteger(episodeIndex) || episodeIndex < 0) {
      return apiError('无效的 episodeIndex', 400);
    }

    const playUrl = parseScriptPlayUrlValue(playUrlEncoded);
    if (!playUrl) {
      return apiError('无效的播放地址', 400);
    }

    const result = await resolveSavedScriptPlayUrl({
      key,
      sourceId,
      episodeIndex,
      playUrl,
    });

    if (!result.url || result.url.trim() === '') {
      throw new Error('获取到的播放链接为空');
    }

    if (format === 'json') {
      return apiSuccess(result);
    }

    return NextResponse.redirect(result.url);
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
