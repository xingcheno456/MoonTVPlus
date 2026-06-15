/**
 * 统一环境变量访问模块
 * 通过 Proxy + getter 提供类型安全的 env 访问，替代散落的 process.env 直接引用
 */

const envConfig = {
  get PASSWORD() {
    return process.env.PASSWORD || '';
  },
  get NEXT_PUBLIC_STORAGE_TYPE() {
    return process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  },
  get USERNAME() {
    return process.env.USERNAME || '';
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },
  get UPSTASH_URL() {
    return process.env.UPSTASH_URL || '';
  },
  get UPSTASH_TOKEN() {
    return process.env.UPSTASH_TOKEN || '';
  },
  get UPSTASH_TIMEOUT_MS() {
    return process.env.UPSTASH_TIMEOUT_MS || '';
  },
  get UPSTASH_MAX_RETRIES() {
    return process.env.UPSTASH_MAX_RETRIES || '';
  },
  get MAX_PLAY_RECORDS_PER_USER() {
    return process.env.MAX_PLAY_RECORDS_PER_USER || '100';
  },
  get MAX_MANGA_HISTORY_PER_USER() {
    return process.env.MAX_MANGA_HISTORY_PER_USER || '100';
  },
  get MAX_BOOK_HISTORY_PER_USER() {
    return process.env.MAX_BOOK_HISTORY_PER_USER || '100';
  },
} as const;

type EnvKeys = keyof typeof envConfig;

/**
 * 类型安全的环境变量访问代理
 * 已知变量通过 getter 访问，未知变量回退到 process.env
 */
export const env = new Proxy(envConfig as Record<string, string>, {
  get(target, prop: string) {
    if (prop in target) {
      return target[prop as EnvKeys];
    }
    return process.env[prop] || '';
  },
}) as typeof envConfig & Record<string, string>;