/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 权限检查：仅站长可以拉取配置订阅
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      return apiError('权限不足，只有站长可以拉取配置订阅', 401);
    }

    const { url } = await request.json();

    if (!url) {
      return apiError('缺少URL参数', 400);
    }

    // 直接 fetch URL 获取配置内容
    const response = await fetch(url);

    if (!response.ok) {
      return apiError(`请求失败: ${response.status} ${response.statusText}`, 400);
    }

    const configContent = await response.text();

    // 对 configContent 进行 base58 解码
    let decodedContent;
    try {
      const bs58 = (await import('bs58')).default;
      const decodedBytes = bs58.decode(configContent);
      decodedContent = new TextDecoder().decode(decodedBytes);
    } catch (decodeError) {
      console.warn('Base58 解码失败', decodeError);
      throw decodeError;
    }

    return apiSuccess({ configContent: decodedContent,
      message: '配置拉取成功', });
  } catch (error) {
    console.error('拉取配置失败:', error);
    return apiError('拉取配置失败', 500);
  }
}
