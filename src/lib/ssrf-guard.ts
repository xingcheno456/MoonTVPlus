/**
 * SSRF 防护 — URL 验证工具
 * 阻止对内部网络地址的请求，防止服务端请求伪造
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '[::]',
]);

const PRIVATE_IP_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

function isPrivateIP(hostname: string): boolean {
  if (BLOCKED_HOSTS.has(hostname.toLowerCase())) {
    return true;
  }
  return PRIVATE_IP_RANGES.some((range) => range.test(hostname));
}

/**
 * 验证 URL 是否安全（仅允许公网 http/https）
 * @returns 安全则返回 URL 对象，否则返回 null
 */
export function validateUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl);

    // 仅允许 http/https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    // 阻止内网地址
    if (isPrivateIP(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}