import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { API_CONFIG } from '@/lib/config';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_TIMEOUT = 8000;
const CONCURRENT_LIMIT = 5;

interface SourceHealthResult {
  key: string;
  name: string;
  api: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  hasResults: boolean;
  resultCount: number;
  disabled?: boolean;
}

async function testSourceHealth(
  source: { key: string; name: string; api: string; disabled?: boolean },
): Promise<SourceHealthResult> {
  const result: SourceHealthResult = {
    key: source.key,
    name: source.name,
    api: source.api,
    status: 'unhealthy',
    hasResults: false,
    resultCount: 0,
    disabled: source.disabled,
  };

  if (source.disabled) {
    result.status = 'unhealthy';
    result.error = '源已禁用';
    return result;
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SOURCE_TIMEOUT);

  try {
    const searchUrl = `${source.api}?ac=videolist&wd=test`;
    const response = await fetch(searchUrl, {
      headers: API_CONFIG.search.headers,
      signal: controller.signal,
    });

    const responseTime = Date.now() - startTime;
    result.responseTime = responseTime;

    if (!response.ok) {
      result.status = 'unhealthy';
      result.error = `HTTP ${response.status}`;
      return result;
    }

    const data = await response.json();

    if (data && data.list && Array.isArray(data.list)) {
      result.resultCount = data.list.length;
      result.hasResults = data.list.length > 0;

      if (responseTime < 2000) {
        result.status = 'healthy';
      } else if (responseTime < 5000) {
        result.status = 'degraded';
      } else {
        result.status = 'unhealthy';
        result.error = '响应过慢';
      }
    } else {
      result.status = 'degraded';
      result.error = '返回数据格式异常';
    }
  } catch (error) {
    result.status = 'unhealthy';
    result.error =
      error instanceof Error ? error.message : '连接失败';
  } finally {
    clearTimeout(timeoutId);
  }

  return result;
}

export async function GET(request: NextRequest) {
  const adminAuth = validateAdminAuth(request);
  if ('status' in adminAuth) return adminAuth;

  const { searchParams } = new URL(request.url);
  const testAll = searchParams.get('all') === 'true';

  try {
    const config = await getConfig();
    const sources = config.SourceConfig || [];

    const sourcesToTest = testAll
      ? sources
      : sources.filter((s) => !s.disabled);

    const results: SourceHealthResult[] = [];

    for (let i = 0; i < sourcesToTest.length; i += CONCURRENT_LIMIT) {
      const batch = sourcesToTest.slice(i, i + CONCURRENT_LIMIT);
      const batchResults = await Promise.all(
        batch.map((source) => testSourceHealth(source)),
      );
      results.push(...batchResults);
    }

    const healthyCount = results.filter((r) => r.status === 'healthy').length;
    const degradedCount = results.filter((r) => r.status === 'degraded').length;
    const unhealthyCount = results.filter((r) => r.status === 'unhealthy').length;

    const suggestions: string[] = [];
    if (unhealthyCount > 0) {
      suggestions.push(`${unhealthyCount} 个源不可用，建议移除或更换`);
    }
    if (degradedCount > 0) {
      suggestions.push(`${degradedCount} 个源响应较慢，建议寻找替代源`);
    }
    if (healthyCount === 0 && sources.length > 0) {
      suggestions.push('所有源都不可用，请检查网络连接或配置');
    }

    return apiSuccess({
      summary: {
        total: sources.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        tested: results.length,
      },
      results,
      suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('源健康检查失败:', error);
    return apiError('源健康检查失败', 500);
  }
}
