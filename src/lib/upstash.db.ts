/* eslint-disable @typescript-eslint/no-explicit-any */

import { Redis } from '@upstash/redis';

import { logger } from './logger';
import { UpstashRedisAdapter } from './redis-adapter';
import { BaseRedisStorage } from './redis-base.db';
import { isUpstashError, withRetry } from './retry';

const createUpstashRetry = () => {
  return <T>(fn: () => Promise<T>, maxRetries?: number) => {
    return withRetry(fn, {
      maxRetries,
      shouldRetry: isUpstashError,
      logPrefix: 'Upstash',
    });
  };
};

const upstashRetry = createUpstashRetry();

export class UpstashRedisStorage extends BaseRedisStorage {
  constructor() {
    const client = getUpstashRedisClient();
    const adapter = new UpstashRedisAdapter(client);
    super(adapter, upstashRetry);
  }
}

// 单例 Upstash Redis 客户端
function getUpstashRedisClient(): Redis {
  const globalKey = Symbol.for('__MOONTV_UPSTASH_REDIS_CLIENT__');
  let client: Redis | undefined = (global as any)[globalKey];

  if (!client) {
    const upstashUrl = process.env.UPSTASH_URL;
    const upstashToken = process.env.UPSTASH_TOKEN;

    if (!upstashUrl || !upstashToken) {
      throw new Error(
        'UPSTASH_URL and UPSTASH_TOKEN env variables must be set',
      );
    }

    // 创建 Upstash Redis 客户端
    client = new Redis({
      url: upstashUrl,
      token: upstashToken,
      // 可选配置
      retry: {
        retries: 3,
        backoff: (retryCount: number) =>
          Math.min(1000 * Math.pow(2, retryCount), 30000),
      },
    });

    logger.info('Upstash Redis client created successfully');

    (global as any)[globalKey] = client;
  }

  return client;
}
