import { logger } from '../logger';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

const BLOCKED_HOSTNAMES = ['localhost', '0.0.0.0', '127.0.0.1', '::1'];

function isServer(): boolean {
  return typeof window === 'undefined';
}

function validateUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error(`Blocked protocol: ${url.protocol}`);
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  return url;
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254) ||
    parts[0] === 0
  );
}

function isPrivateHostname(hostname: string): boolean {
  if (hostname.includes(':')) {
    const lower = hostname.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    return false;
  }
  return isPrivateIPv4(hostname);
}

export interface SafeFetchOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean>;
  body?: BodyInit | Record<string, unknown> | null;
  timeoutMs?: number;
}

export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const url = validateUrl(rawUrl);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, String(value));
    }
  }

  if (isPrivateHostname(url.hostname)) {
    throw new Error(`Blocked internal hostname: ${url.hostname}`);
  }

  if (isServer()) {
    try {
      const { validateProxyUrlServerSide } = await import('../server/ssrf');
      const isSafe = await validateProxyUrlServerSide(url.toString());
      if (!isSafe) {
        throw new Error(`SSRF check failed for: ${url.toString()}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('SSRF check failed')) {
        throw err;
      }
      logger.warn('[safeFetch] Server-side SSRF check skipped:', err);
    }
  }

  const { params, timeoutMs, body, ...fetchOptions } = options;

  const fetchBody: BodyInit | null | undefined =
    body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof ReadableStream) && !(body instanceof Uint8Array)
      ? JSON.stringify(body)
      : (body as BodyInit | null | undefined);

  const headers = new Headers(fetchOptions.headers);
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof ReadableStream) && !(body instanceof Uint8Array)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const controller = timeoutMs ? new AbortController() : undefined;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      body: fetchBody,
      signal: controller?.signal ?? fetchOptions.signal,
    });
    return response;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function buildSafeUrl(baseUrl: string, pathSegments: string[], params?: Record<string, string | number | boolean>): string {
  const url = new URL(baseUrl);
  for (const segment of pathSegments) {
    url.pathname = url.pathname.replace(/\/?$/, `/${encodeURIComponent(segment)}`);
  }
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
