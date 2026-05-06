const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of ipRequestCounts) {
    if (now > entry.resetTime) {
      ipRequestCounts.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  search: { maxRequests: 60, windowMs: 60 * 1000 },
  api: { maxRequests: 120, windowMs: 60 * 1000 },
  login: { maxRequests: 10, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  ip: string,
  route: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanup();

  const key = `${ip}:${route}`;
  const now = Date.now();
  const entry = ipRequestCounts.get(key);

  if (!entry || now > entry.resetTime) {
    ipRequestCounts.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

export function getRateLimitConfig(pathname: string): RateLimitConfig | null {
  if (pathname.startsWith('/api/search')) {
    return RATE_LIMITS.search;
  }
  if (pathname.startsWith('/api/login') || pathname.startsWith('/api/register')) {
    return RATE_LIMITS.login;
  }
  if (pathname.startsWith('/api/')) {
    return RATE_LIMITS.api;
  }
  return null;
}
