import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { listEnabledSourceScripts } from '@/lib/source-script';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const scripts = await listEnabledSourceScripts();

    return apiSuccess({
      sources: scripts.map((item) => ({
        key: item.key,
        name: item.name,
        description: item.description,
      })),
    });
  } catch (error) {
    return apiError('获取高级推荐脚本失败', 500);
  }
}
