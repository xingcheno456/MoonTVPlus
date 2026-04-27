import { universalFetch } from './universal-fetch';

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
  return universalFetch(url, {
    proxy,
    headers: init?.headers as Record<string, string> | undefined,
    method: init?.method,
    body: init?.body as string | undefined,
  });
}
