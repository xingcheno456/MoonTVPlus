import dns from 'dns';

import { logger } from '../logger';

/**
 * 判断 IP 地址是否为内网/本地私有地址
 * 覆盖 IPv4 和 IPv6，彻底杜绝所有变体绕过。
 */
export function isPrivateIP(ip: string): boolean {
  // IPv6 地址（含 IPv4-mapped 格式 ::ffff:x.x.x.x）
  if (ip.includes(':')) {
    const lowerIp = ip.toLowerCase();

    // ::1 环回地址 (Loopback)
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

    // 0::0 / :: 未指定地址
    if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;

    // IPv4 映射到 IPv6 的地址 (例如 ::ffff:127.0.0.1)
    if (lowerIp.startsWith('::ffff:')) {
      return isPrivateIP(lowerIp.substring(7));
    }

    // 唯一本地地址 (Unique Local Addresses, fc00::/7)
    if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;

    // 链路本地地址 (Link-Local Addresses, fe80::/10)
    if (
      lowerIp.startsWith('fe8') ||
      lowerIp.startsWith('fe9') ||
      lowerIp.startsWith('fea') ||
      lowerIp.startsWith('feb')
    )
      return true;

    return false;
  }

  // IPv4 私有地址和环回地址
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    return (
      parts[0] === 10 || // 10.x.x.x
      parts[0] === 127 || // 127.x.x.x (Loopback)
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.x.x - 172.31.x.x
      (parts[0] === 192 && parts[1] === 168) || // 192.168.x.x
      (parts[0] === 169 && parts[1] === 254) || // 169.254.x.x (Link-local)
      parts[0] === 0 // 0.x.x.x ("This network")
    );
  }

  return false;
}

/**
 * 校验代理 URL 是否安全 (防止 SSRF / DNS 重绑定漏洞)
 * 只在 Node.js 服务端运行。
 */
export async function validateProxyUrlServerSide(
  urlStr: string,
): Promise<boolean> {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      logger.warn(`[SSRF 防护] 非法协议: ${parsed.protocol}, URL: ${urlStr}`);
      return false;
    }

    if (parsed.username || parsed.password) {
      logger.warn(`[SSRF 防护] URL 包含认证信息, 拒绝代理请求: ${urlStr}`);
      return false;
    }

    let { hostname } = parsed;

    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.substring(1, hostname.length - 1);
    }

    if (isPrivateIP(hostname)) {
      logger.warn(`[SSRF 防护] hostname 直接是内网 IP: ${hostname}, URL: ${urlStr}`);
      return false;
    }

    const lookupResult = await dns.promises.lookup(hostname);

    if (!lookupResult || !lookupResult.address) {
      logger.warn(`[SSRF 防护] DNS 解析无结果: ${hostname}, URL: ${urlStr}`);
      return false;
    }

    if (isPrivateIP(lookupResult.address)) {
      logger.warn(
        `[SSRF 防护] 拦截到尝试访问内部网络的请求 URL: ${urlStr} (解析出的底层 IP: ${lookupResult.address})`,
      );
      return false;
    }

    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`[SSRF 防护] URL校验失败, 拒绝代理请求: ${urlStr}, 原因: ${msg}`);
    return false;
  }
}
