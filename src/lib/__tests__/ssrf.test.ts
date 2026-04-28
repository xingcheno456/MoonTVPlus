import { isPrivateIP } from '@/lib/server/ssrf';

describe('isPrivateIP', () => {
  describe('IPv4 私有地址', () => {
    it('应识别 10.x.x.x (Class A 私有)', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.255.255.254')).toBe(true);
    });

    it('应识别 127.x.x.x (Loopback)', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.99.99.99')).toBe(true);
    });

    it('应识别 172.16.x.x - 172.31.x.x (Class B 私有)', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.16.255.255')).toBe(true);
      expect(isPrivateIP('172.31.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
    });

    it('应拒绝 172.15.x.x 和 172.32.x.x (边界外)', () => {
      expect(isPrivateIP('172.15.255.255')).toBe(false);
      expect(isPrivateIP('172.32.0.1')).toBe(false);
    });

    it('应识别 192.168.x.x (Class C 私有)', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true);
      expect(isPrivateIP('192.168.255.255')).toBe(true);
    });

    it('应识别 169.254.x.x (Link-local)', () => {
      expect(isPrivateIP('169.254.0.1')).toBe(true);
      expect(isPrivateIP('169.254.255.255')).toBe(true);
    });

    it('应识别 0.x.x.x (This network)', () => {
      expect(isPrivateIP('0.0.0.0')).toBe(true);
      expect(isPrivateIP('0.255.255.255')).toBe(true);
    });
  });

  describe('IPv6 私有地址', () => {
    it('应识别 ::1 (Loopback)', () => {
      expect(isPrivateIP('::1')).toBe(true);
    });

    it('应识别 0:0:0:0:0:0:0:1 (Loopback 全写)', () => {
      expect(isPrivateIP('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('应识别 :: / 0::0 (未指定地址)', () => {
      expect(isPrivateIP('::')).toBe(true);
      expect(isPrivateIP('0:0:0:0:0:0:0:0')).toBe(true);
    });

    it('应识别 fc00::/7 (唯一本地地址)', () => {
      expect(isPrivateIP('fc00::1')).toBe(true);
      expect(isPrivateIP('fd00::1')).toBe(true);
      expect(isPrivateIP('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    });

    it('应识别 fe80::/10 (链路本地地址)', () => {
      expect(isPrivateIP('fe80::1')).toBe(true);
      expect(isPrivateIP('febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    });

    it('应拒绝 fec0::/10 (链路本地边界外)', () => {
      expect(isPrivateIP('fec0::1')).toBe(false);
      expect(isPrivateIP('fe7f::1')).toBe(false);
    });
  });

  describe('IPv4 映射到 IPv6', () => {
    it('应通过 ::ffff: 前缀检测私有 IPv4 映射地址', () => {
      expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIP('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
    });

    it('应通过 ::ffff: 前缀检测公网 IPv4 映射地址为非私有', () => {
      expect(isPrivateIP('::ffff:8.8.8.8')).toBe(false);
      expect(isPrivateIP('::ffff:1.2.3.4')).toBe(false);
    });
  });

  describe('公网 IP', () => {
    it('应接受公网 IPv4 地址', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('114.114.114.114')).toBe(false);
    });

    it('应接受公网 IPv6 地址', () => {
      expect(isPrivateIP('2001:4860:4860::8888')).toBe(false);
      expect(isPrivateIP('2606:4700:4700::1111')).toBe(false);
    });
  });

  describe('异常输入', () => {
    it('应处理非标准格式（3 段）', () => {
      const result = isPrivateIP('1.2.3');
      expect(result).toBe(false);
    });

    it('应处理非标准格式（5 段）', () => {
      const result = isPrivateIP('1.2.3.4.5');
      expect(result).toBe(false);
    });

    it('应处理空字符串', () => {
      const result = isPrivateIP('');
      expect(result).toBe(false);
    });
  });
});
