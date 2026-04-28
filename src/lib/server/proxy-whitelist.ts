import { logger } from '../logger';

const DEFAULT_ALLOWED_DOMAINS = [
  'doubanio.com',
  'douban.com',
  'tmdb.org',
  'themoviedb.org',
  'image.tmdb.org',
  'api.tmdb.org',
  'pili-qn.hdslb.com',
  'bilivideo.com',
  'akamaized.net',
  'cloudfront.net',
  'imgos.cn',
  'hdslb.com',
  'douyinvod.com',
  'douyinpic.com',
  'byteimg.com',
  'bytedance.com',
];

function getAllowedDomains(): string[] {
  const extraDomains = process.env.PROXY_ALLOWED_DOMAINS;
  if (extraDomains) {
    const extras = extraDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    return [...DEFAULT_ALLOWED_DOMAINS, ...extras];
  }
  return DEFAULT_ALLOWED_DOMAINS;
}

export function isDomainAllowed(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    const allowed = getAllowedDomains();
    const isAllowed = allowed.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!isAllowed) {
      logger.warn(
        `[Proxy Whitelist] 域名不在白名单中: ${hostname}, URL: ${urlStr}`,
      );
    }

    return isAllowed;
  } catch {
    return false;
  }
}

export function validateProxyDomain(urlStr: string): boolean {
  return isDomainAllowed(urlStr);
}
