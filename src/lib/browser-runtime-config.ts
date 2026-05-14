import type { RuntimeConfig } from '@/types/runtime';

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return {} as RuntimeConfig;
  }
  return window.RUNTIME_CONFIG || ({} as RuntimeConfig);
}

export function getRuntimeConfigValue<K extends keyof RuntimeConfig>(
  key: K,
): RuntimeConfig[K] | undefined {
  return getRuntimeConfig()[key];
}
