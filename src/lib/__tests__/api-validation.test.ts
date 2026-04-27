import { z } from 'zod';

import { detailQuerySchema } from '@/lib/api-schemas';
import { parseSearchParams, validateAuth, validateAdminAuth } from '@/lib/api-validation';

describe('parseSearchParams', () => {
  function createMockRequest(url: string): any {
    return { url };
  }

  it('should parse valid query params', () => {
    const request = createMockRequest('http://localhost/api/detail?id=123&source=tmdb');
    const result = parseSearchParams(request as any, detailQuerySchema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data).toEqual({ id: '123', source: 'tmdb' });
    }
  });

  it('should return error for invalid params', () => {
    const request = createMockRequest('http://localhost/api/detail?id=&source=tmdb');
    const result = parseSearchParams(request as any, detailQuerySchema);
    expect('error' in result).toBe(true);
  });

  it('should handle URL-encoded values', () => {
    const request = createMockRequest(
      'http://localhost/api/detail?id=abc%20def&source=tmdb',
    );
    const result = parseSearchParams(request as any, detailQuerySchema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.id).toBe('abc def');
    }
  });

  it('should coerce numeric params', () => {
    const schema = z.object({ page: z.coerce.number().int().min(1) });
    const request = createMockRequest('http://localhost/test?page=5');
    const result = parseSearchParams(request as any, schema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.page).toBe(5);
    }
  });

  it('should return error for completely missing required fields', () => {
    const request = createMockRequest('http://localhost/api/detail');
    const result = parseSearchParams(request as any, detailQuerySchema);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(400);
    }
  });
});

describe('validateAuth', () => {
  function createAuthRequest(authValue?: string): any {
    return {
      headers: new Headers(),
      cookies: {
        get: (name: string) =>
          name === 'auth'
            ? authValue
              ? { value: decodeURIComponent(authValue) }
              : undefined
            : undefined,
      },
    };
  }

  it('should return error when no auth cookie', () => {
    const request = createAuthRequest();
    const result = validateAuth(request as any);
    expect('status' in result).toBe(true);
    if ('status' in result) {
      expect(result.status).toBe(401);
    }
  });

  it('should accept valid auth with username', () => {
    const authValue = JSON.stringify({ username: 'testuser' });
    const request = createAuthRequest(encodeURIComponent(authValue));
    const result = validateAuth(request as any);
    if (!('status' in result)) {
      expect(result.username).toBe('testuser');
    } else {
      throw new Error('Should not return error');
    }
  });
});

describe('validateAdminAuth', () => {
  function createAuthRequest(authValue?: string): any {
    return {
      headers: new Headers(),
      cookies: {
        get: (name: string) =>
          name === 'auth'
            ? authValue
              ? { value: decodeURIComponent(authValue) }
              : undefined
            : undefined,
      },
    };
  }

  it('should reject non-admin users with 403', () => {
    const authValue = JSON.stringify({ username: 'regular', role: 'user' });
    const request = createAuthRequest(encodeURIComponent(authValue));
    const result = validateAdminAuth(request as any);
    expect('status' in result).toBe(true);
    if ('status' in result) {
      expect(result.status).toBe(403);
    }
  });

  it('should accept admin role', () => {
    const authValue = JSON.stringify({ username: 'admin', role: 'admin' });
    const request = createAuthRequest(encodeURIComponent(authValue));
    const result = validateAdminAuth(request as any);
    if (!('status' in result)) {
      expect(result.username).toBe('admin');
    } else {
      throw new Error('Should not return error');
    }
  });

  it('should accept owner role', () => {
    const authValue = JSON.stringify({ username: 'owner', role: 'owner' });
    const request = createAuthRequest(encodeURIComponent(authValue));
    const result = validateAdminAuth(request as any);
    if (!('status' in result)) {
      expect(result.username).toBe('owner');
    } else {
      throw new Error('Should not return error');
    }
  });
});
