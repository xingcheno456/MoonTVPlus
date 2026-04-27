import { HttpsProxyAgent } from 'https-proxy-agent';

function isCloudflareEnvironment(): boolean {
  return (
    process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare'
  );
}

export interface UniversalFetchOptions {
  proxy?: string;
  timeout?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  retries?: number;
  retryDelay?: number;
}

export class FetchTimeoutError extends Error {
  constructor(url: string, timeout: number) {
    super(`请求超时 (${timeout}ms): ${url}`);
    this.name = 'FetchTimeoutError';
  }
}

export class FetchNetworkError extends Error {
  constructor(url: string, cause: unknown) {
    super(`网络请求失败: ${url}`);
    this.name = 'FetchNetworkError';
    this.cause = cause;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeFetch(
  url: string,
  fetchOptions: RequestInit & { agent?: unknown },
  timeout: number,
): Promise<Response> {
  try {
    return await fetch(url, fetchOptions);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeout);
    }
    throw new FetchNetworkError(url, error);
  }
}

export async function universalFetch(
  url: string,
  options?: UniversalFetchOptions,
): Promise<Response> {
  const {
    proxy,
    timeout = 15000,
    headers,
    method,
    body,
    retries = 0,
    retryDelay = 1000,
  } = options || {};

  const effectiveTimeout = proxy ? 30000 : timeout;

  if (isCloudflareEnvironment()) {
    const fetchOptions: RequestInit = {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(timeout),
    };

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await executeFetch(url, fetchOptions, timeout);
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1));
        }
      }
    }
    throw lastError;
  }

  const fetchOptions: RequestInit & { agent?: unknown } = {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(effectiveTimeout),
  };

  if (proxy) {
    fetchOptions.agent = new HttpsProxyAgent(proxy, {
      timeout: 30000,
      keepAlive: false,
    });
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await executeFetch(url, fetchOptions, effectiveTimeout);
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await sleep(retryDelay * (attempt + 1));
      }
    }
  }
  throw lastError;
}
