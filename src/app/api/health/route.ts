import { NextRequest } from 'next/server';

import { apiSuccess } from '@/lib/api-response';
import { getConfig } from '@/lib/config';
import { STORAGE_TYPE } from '@/lib/db';
import { CURRENT_VERSION } from '@/lib/version';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  logger.info('Health check requested');

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: CURRENT_VERSION,
    uptime: process.uptime(),
    checks: {} as Record<string, { status: string; message?: string }>,
  };

  // 检查存储连接
  try {
    if (STORAGE_TYPE === 'localstorage') {
      healthStatus.checks.storage = {
        status: 'healthy',
        message: 'LocalStorage',
      };
    } else {
      const config = await getConfig();
      if (config) {
        healthStatus.checks.storage = {
          status: 'healthy',
          message: STORAGE_TYPE,
        };
      } else {
        healthStatus.checks.storage = {
          status: 'unhealthy',
          message: 'Failed to connect to storage',
        };
        healthStatus.status = 'degraded';
      }
    }
  } catch (error) {
    healthStatus.checks.storage = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    healthStatus.status = 'degraded';
  }

  // 检查内存使用
  const memUsage = process.memoryUsage();
  const memoryLimitMB = parseInt(process.env.HEALTH_MEMORY_LIMIT_MB || '512', 10);
  const usedMemoryMB = memUsage.heapUsed / 1024 / 1024;

  healthStatus.checks.memory = {
    status: usedMemoryMB > memoryLimitMB ? 'warning' : 'healthy',
    message: `${usedMemoryMB.toFixed(2)}MB / ${memoryLimitMB}MB`,
  };

  if (usedMemoryMB > memoryLimitMB) {
    healthStatus.status = 'degraded';
  }

  // 返回健康检查结果
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

  return apiSuccess(healthStatus, { status: statusCode });
}
