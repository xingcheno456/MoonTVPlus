/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { resetConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return apiSuccess({
        error: '不支持本地存储进行管理员配置',
      }, { status: 400 });
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }
  const username = authInfo.username;

  if (username !== process.env.USERNAME) {
    return apiError('仅支持站长重置配置', 401);
  }

  try {
    await resetConfig();

    return apiSuccess({ ok: true }, {
        headers: {
          'Cache-Control': 'no-store', // 管理员配置不缓存
        },
      });
  } catch (error) {
    return apiSuccess({
        error: '重置管理员配置失败',
        details: (error as Error).message,
      }, { status: 500 });
  }
}
