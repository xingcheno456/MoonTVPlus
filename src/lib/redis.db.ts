 

import { StandardRedisAdapter } from './redis-adapter';
import {
  BaseRedisStorage,
  createRedisClient,
  createRedisRetryWrapper,
} from './redis-base.db';

export class RedisStorage extends BaseRedisStorage {
  constructor() {
    const config = {
      url: process.env.REDIS_URL!,
      clientName: 'Redis',
    };
    const globalSymbol = Symbol.for('__MOONTV_REDIS_CLIENT__');
    const client = createRedisClient(config, globalSymbol);
    const adapter = new StandardRedisAdapter(client);
    const withRetry = createRedisRetryWrapper(config.clientName, () => client);
    super(adapter, withRetry);
  }
}
