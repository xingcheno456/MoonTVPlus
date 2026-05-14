function isCloudflareEnvironment(): boolean {
  return (
    process.env.CF_PAGES === '1' || process.env.BUILD_TARGET === 'cloudflare'
  );
}

export function getMagnetBaseUrl(
  defaultBaseUrl: string,
  reverseProxyBaseUrl?: string,
): string {
  return (reverseProxyBaseUrl || defaultBaseUrl).replace(/\/+$/, '');
}

export async function universalMagnetFetch(
  url: string,
  proxy?: string,
  init?: RequestInit,
): Promise<Response> {
  if (isCloudflareEnvironment()) {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15000),
    });
    return response;
  }

  if (proxy) {
    // 使用 undici 的 ProxyAgent 进行代理
    // 注意：undici 的 dispatcher 是 Node.js fetch 的扩展选项
    try {
      const { ProxyAgent, setGlobalDispatcher } = await import('undici');
      const dispatcher = new ProxyAgent({
        uri: proxy,
        requestTls: { rejectUnauthorized: false },
      });
      setGlobalDispatcher(dispatcher);
      return fetch(url, {
        ...init,
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      // 如果 undici 不可用，回退到无代理模式
      console.warn('[Magnet] undici not available, fetching without proxy');
      return fetch(url, {
        ...init,
        signal: AbortSignal.timeout(30000),
      });
    }
  }

  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
}
