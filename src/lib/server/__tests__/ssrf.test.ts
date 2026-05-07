import dns from 'dns';

import { isPrivateIP, validateProxyUrlServerSide } from '../ssrf';

jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe('isPrivateIP', () => {
  describe('IPv4 私有地址', () => {
    it('应识别 10.x.x.x 为私有', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.255.255.255')).toBe(true);
    });

    it('应识别 127.x.x.x 为环回', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.255.255.255')).toBe(true);
    });

    it('应识别 172.16-31.x.x 为私有', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
    });

    it('应识别 192.168.x.x 为私有', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true);
      expect(isPrivateIP('192.168.255.255')).toBe(true);
    });

    it('应识别 169.254.x.x 为链路本地', () => {
      expect(isPrivateIP('169.254.0.1')).toBe(true);
    });

    it('应识别 0.x.x.x 为私有', () => {
      expect(isPrivateIP('0.0.0.0')).toBe(true);
    });

    it('应允许公网 IPv4', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('93.184.216.34')).toBe(false);
    });

    it('应拒绝非法的 IPv4 格式', () => {
      expect(isPrivateIP('not.an.ip')).toBe(false);
      expect(isPrivateIP('1.2.3')).toBe(false);
    });
  });

  describe('IPv6 私有地址', () => {
    it('应识别 ::1 为环回', () => {
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('应识别 :: 为未指定地址', () => {
      expect(isPrivateIP('::')).toBe(true);
      expect(isPrivateIP('0:0:0:0:0:0:0:0')).toBe(true);
    });

    it('应识别 IPv4-mapped IPv6 地址', () => {
      expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIP('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
    });

    it('应允许 IPv4-mapped 公网地址', () => {
      expect(isPrivateIP('::ffff:8.8.8.8')).toBe(false);
    });

    it('应识别 fc00::/7 唯一本地地址', () => {
      expect(isPrivateIP('fc00::1')).toBe(true);
      expect(isPrivateIP('fd00::1')).toBe(true);
    });

    it('应识别 fe80::/10 链路本地地址', () => {
      expect(isPrivateIP('fe80::1')).toBe(true);
      expect(isPrivateIP('fe90::1')).toBe(true);
      expect(isPrivateIP('fea0::1')).toBe(true);
      expect(isPrivateIP('feb0::1')).toBe(true);
    });

    it('应允许公网 IPv6', () => {
      expect(isPrivateIP('2001:4860:4860::8888')).toBe(false);
      expect(isPrivateIP('2606:4700:4700::1111')).toBe(false);
    });
  });
});

describe('validateProxyUrlServerSide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应拒绝空 URL', async () => {
    const result = await validateProxyUrlServerSide('');
    expect(result).toBe(false);
  });

  it('应拒绝非 http/https 协议', async () => {
    const result = await validateProxyUrlServerSide('ftp://example.com/file');
    expect(result).toBe(false);
  });

  it('应拒绝包含认证信息的 URL', async () => {
    const result = await validateProxyUrlServerSide('http://user:pass@example.com');
    expect(result).toBe(false);
  });

  it('应拒绝解析到内网 IP 的域名', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue({ address: '127.0.0.1' });
    const result = await validateProxyUrlServerSide('http://evil.internal');
    expect(result).toBe(false);
  });

  it('应拒绝解析到 10.x.x.x 的域名', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue({ address: '10.0.0.5' });
    const result = await validateProxyUrlServerSide('http://internal.service');
    expect(result).toBe(false);
  });

  it('应允许解析到公网 IP 的域名', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue({ address: '93.184.216.34' });
    const result = await validateProxyUrlServerSide('http://example.com');
    expect(result).toBe(true);
  });

  it('应拒绝 DNS 解析失败的域名', async () => {
    (dns.promises.lookup as jest.Mock).mockRejectedValue(new Error('ENOTFOUND'));
    const result = await validateProxyUrlServerSide('http://nonexistent.example');
    expect(result).toBe(false);
  });

  it('应拒绝 DNS 返回空结果的域名', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue(null);
    const result = await validateProxyUrlServerSide('http://no-address.example');
    expect(result).toBe(false);
  });

  it('应拒绝 DNS 返回无 address 字段的结果', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue({});
    const result = await validateProxyUrlServerSide('http://no-address.example');
    expect(result).toBe(false);
  });

  it('应拒绝无效 URL 格式', async () => {
    const result = await validateProxyUrlServerSide('not-a-valid-url');
    expect(result).toBe(false);
  });

  it('应处理 IPv6 括号格式的 hostname', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue({ address: '2001:4860:4860::8888' });
    const result = await validateProxyUrlServerSide('https://[2001:4860:4860::8888]/path');
    expect(result).toBe(true);
  });

  it('应拒绝解析到 IPv6 环回地址', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue({ address: '::1' });
    const result = await validateProxyUrlServerSide('http://ipv6-localhost');
    expect(result).toBe(false);
  });
});
