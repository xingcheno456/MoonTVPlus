import { apiError } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
  return apiError('Live streaming feature has been removed', 410);
}
