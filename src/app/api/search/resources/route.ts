/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import { getSearchResources } from '@/services/search.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const resources = await getSearchResources(username);
    return apiSuccess(resources);
  } catch (error) {
    return handleServiceError(error);
  }
}
