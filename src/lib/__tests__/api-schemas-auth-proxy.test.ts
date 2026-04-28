import {
  proxyUrlSchema,
  loginBodySchema,
  registerBodySchema,
  changePasswordBodySchema,
} from '@/lib/api-schemas';

describe('proxyUrlSchema', () => {
  it('应接受有效的 url', () => {
    expect(proxyUrlSchema.parse({ url: 'https://example.com/video.mp4' })).toEqual({
      url: 'https://example.com/video.mp4',
    });
  });

  it('source 为可选字段', () => {
    const result = proxyUrlSchema.parse({ url: 'https://example.com' });
    expect(result.url).toBe('https://example.com');
    expect(result.source).toBeUndefined();
  });

  it('应接受带 source 的输入', () => {
    const result = proxyUrlSchema.parse({ url: 'https://example.com', source: 'test-source' });
    expect(result.source).toBe('test-source');
  });

  it('url 为空时应拒绝', () => {
    expect(() => proxyUrlSchema.parse({ url: '' })).toThrow(/不能为空/);
  });

  it('缺少 url 字段时应拒绝', () => {
    expect(() => proxyUrlSchema.parse({ source: 'x' })).toThrow();
  });
});

describe('loginBodySchema', () => {
  it('应接受仅 password 的最小合法输入', () => {
    const result = loginBodySchema.parse({ password: 'secret123' });
    expect(result.password).toBe('secret123');
    expect(result.username).toBeUndefined();
    expect(result.turnstileToken).toBeUndefined();
  });

  it('username 和 turnstileToken 均为可选', () => {
    const result = loginBodySchema.parse({
      username: 'admin',
      password: 'pass',
      turnstileToken: 'token-xxx',
    });
    expect(result.username).toBe('admin');
    expect(result.turnstileToken).toBe('token-xxx');
  });

  it('password 缺失时应拒绝（Zod Required 错误）', () => {
    expect(() => loginBodySchema.parse({})).toThrow(/Required/);
  });

  it('password 为空字符串时应拒绝', () => {
    expect(() => loginBodySchema.parse({ password: '' })).toThrow(/password 不能为空/);
  });
});

describe('registerBodySchema', () => {
  it('应接受合法注册数据', () => {
    const result = registerBodySchema.parse({
      username: 'newuser',
      password: 'securePass123',
      turnstileToken: 'token-abc',
    });
    expect(result.username).toBe('newuser');
    expect(result.password).toBe('securePass123');
  });

  describe('username 校验', () => {
    it('用户名至少 3 个字符', () => {
      expect(() =>
        registerBodySchema.parse({ username: 'ab', password: '123456' }),
      ).toThrow(/3-20位/);
    });

    it('用户名最多 20 个字符', () => {
      expect(() =>
        registerBodySchema.parse({ username: 'a'.repeat(21), password: '123456' }),
      ).toThrow(/3-20位/);
    });

    it('用户名只能包含字母、数字、下划线', () => {
      expect(() =>
        registerBodySchema.parse({ username: 'user@name', password: '123456' }),
      ).toThrow(/字母、数字、下划线/);
    });

    it('边界值：3 个字符和 20 个字符均通过', () => {
      expect(
        registerBodySchema.parse({ username: 'abc', password: '123456' }),
      ).toBeDefined();
      expect(
        registerBodySchema.parse({ username: 'x'.repeat(20), password: '123456' }),
      ).toBeDefined();
    });
  });

  describe('password 校验', () => {
    it('密码至少 6 个字符', () => {
      expect(() =>
        registerBodySchema.parse({ username: 'test', password: '12345' }),
      ).toThrow(/至少6个字符/);
    });

    it('密码最多 100 个字符', () => {
      expect(() =>
        registerBodySchema.parse({ username: 'test', password: 'x'.repeat(101) }),
      ).toThrow(/最多100个字符/);
    });

    it('边界值：6 个字符和 100 个字符均通过', () => {
      expect(
        registerBodySchema.parse({ username: 'test', password: '123456' }),
      ).toBeDefined();
      expect(
        registerBodySchema.parse({ username: 'test', password: 'p'.repeat(100) }),
      ).toBeDefined();
    });
  });
});

describe('changePasswordBodySchema', () => {
  it('应接受合法的新密码', () => {
    const result = changePasswordBodySchema.parse({ newPassword: 'NewPass2024!' });
    expect(result.newPassword).toBe('NewPass2024!');
  });

  it('新密码少于 6 个字符时应拒绝', () => {
    expect(() =>
      changePasswordBodySchema.parse({ newPassword: '12345' }),
    ).toThrow(/至少6个字符/);
  });

  it('新密码超过 100 个字符时应拒绝', () => {
    expect(() =>
      changePasswordBodySchema.parse({ newPassword: 'x'.repeat(101) }),
    ).toThrow(/最多100个字符/);
  });

  it('缺少 newPassword 字段时应拒绝', () => {
    expect(() => changePasswordBodySchema.parse({})).toThrow();
  });
});
