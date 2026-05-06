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
    const { ProxyAgent } = await import('undici');
    const dispatcher = new ProxyAgent({
      uri: proxy,
      requestTls: { rejectUnauthorized: false },
    });
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(30000),
      dispatcher: dispatcher as RequestInit['dispatcher'],
    } as RequestInit);
  }

  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
}
