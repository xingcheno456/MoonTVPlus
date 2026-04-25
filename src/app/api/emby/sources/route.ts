import { apiError, apiSuccess } from '@/lib/api-response';

import { embyManager } from '@/lib/emby-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // 禁用缓存

/**
 * 获取所有启用的Emby源列表
 */
export async function GET() {
  try {
    const sources = await embyManager.getEnabledSources();

    return apiSuccess({
      sources: sources.map((s) => ({
        key: s.key,
        name: s.name,
      })),
    });
  } catch (error) {
    console.error('[Emby Sources] 获取Emby源列表失败:', error);
    return apiError('获取Emby源列表失败', 500);
  }
}
