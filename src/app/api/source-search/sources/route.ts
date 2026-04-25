import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const apiSites = await getAvailableApiSites(authInfo.username);

    return apiSuccess({
      sources: apiSites.map((site) => ({
        key: site.key,
        name: site.name,
        api: site.api,
      })),
    });
  } catch (error) {
    console.error('Failed to get available API sites:', error);
    return apiError('Failed to load sources', 500);
  }
}
