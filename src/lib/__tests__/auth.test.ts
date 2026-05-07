import {
  buildAuthInfoCookieValue,
  clearAuthCookie,
  getAuthInfoFromBrowserCookie,
  parseAuthInfo,
} from '../auth';

describe('parseAuthInfo', () => {
  it('应返回 null 当值为空', () => {
    expect(parseAuthInfo(null)).toBeNull();
    expect(parseAuthInfo(undefined)).toBeNull();
    expect(parseAuthInfo('')).toBeNull();
  });

  it('应正确解析 JSON 字符串', () => {
    const result = parseAuthInfo(JSON.stringify({ username: 'test', role: 'user' }));
    expect(result).toEqual({ username: 'test', role: 'user' });
  });

  it('应正确解析 URL 编码的 JSON', () => {
    const encoded = encodeURIComponent(JSON.stringify({ username: 'test', role: 'admin' }));
    const result = parseAuthInfo(encoded);
    expect(result).toEqual({ username: 'test', role: 'admin' });
  });

  it('应处理双重 URL 编码', () => {
    const doubleEncoded = encodeURIComponent(
      encodeURIComponent(JSON.stringify({ username: 'test' })),
    );
    const result = parseAuthInfo(doubleEncoded);
    expect(result).toEqual({ username: 'test' });
  });

  it('应返回 null 当 JSON 解析失败', () => {
    expect(parseAuthInfo('not-valid-json')).toBeNull();
    expect(parseAuthInfo('{broken')).toBeNull();
  });

  it('应解析包含所有字段的完整 AuthInfo', () => {
    const authInfo = {
      username: 'admin',
      role: 'owner' as const,
      signature: 'abc123',
      timestamp: 1234567890,
      tokenId: 'token-1',
      refreshToken: 'refresh-1',
      refreshExpires: 1234567890 + 3600000,
    };
    const result = parseAuthInfo(JSON.stringify(authInfo));
    expect(result).toEqual(authInfo);
  });

  it('应处理包含百分号但非 URL 编码的字符串', () => {
    const result = parseAuthInfo('%not-encoded');
    expect(result).toBeNull();
  });
});

describe('buildAuthInfoCookieValue', () => {
  it('应返回空字符串当 authToken 无效', () => {
    expect(buildAuthInfoCookieValue('')).toBe('');
    expect(buildAuthInfoCookieValue('invalid')).toBe('');
  });

  it('应构建包含 username 和 role 的 cookie 值', () => {
    const authToken = JSON.stringify({ username: 'test', role: 'user' });
    const result = buildAuthInfoCookieValue(authToken);
    expect(JSON.parse(result)).toEqual({ username: 'test', role: 'user' });
  });

  it('应仅包含 username 和 role 字段', () => {
    const authToken = JSON.stringify({
      username: 'test',
      role: 'admin',
      signature: 'sig',
      timestamp: 123,
    });
    const result = buildAuthInfoCookieValue(authToken);
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)).toEqual(['username', 'role']);
  });
});

describe('getAuthInfoFromBrowserCookie', () => {
  it('应返回 null 在服务端环境', () => {
    const result = getAuthInfoFromBrowserCookie();
    expect(result).toBeNull();
  });
});

describe('clearAuthCookie', () => {
  it('应在服务端环境静默返回', () => {
    expect(() => clearAuthCookie()).not.toThrow();
  });
});
