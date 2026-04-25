import { apiError, apiSuccess } from '@/lib/api-response';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // 禁用缓存

/**
 * GET /api/ad-filter
 * 获取自定义去广告代码配置（公开接口，无需认证）
 * 支持两种模式：
 * - 不带参数：只返回版本号，用于检查更新
 * - ?full=true：返回完整代码和版本号
 */
export async function GET(request: Request) {
  try {
    const config = await getConfig();
    const { searchParams } = new URL(request.url);
    const full = searchParams.get('full') === 'true';

    const version = config.SiteConfig?.CustomAdFilterVersion || 0;

    if (full) {
      // 返回完整代码和版本号
      return apiSuccess({
        code: config.SiteConfig?.CustomAdFilterCode || '',
        version,
      });
    } else {
      // 只返回版本号
      return apiSuccess({
        version,
      });
    }
  } catch (error) {
    console.error('获取去广告代码配置失败:', error);
    return apiError('获取配置失败: ' + (error as Error).message, 500);
  }
}
