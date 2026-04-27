import { commonSchemas, detailQuerySchema, searchQuerySchema, paginatedQuerySchema } from '@/lib/api-schemas';

describe('commonSchemas', () => {
  describe('id', () => {
    it('should accept non-empty strings', () => {
      expect(commonSchemas.id.parse('123')).toBe('123');
      expect(commonSchemas.id.parse('abc-def')).toBe('abc-def');
    });

    it('should reject empty string', () => {
      expect(() => commonSchemas.id.parse('')).toThrow();
    });
  });

  describe('source', () => {
    it('should accept non-empty source strings', () => {
      expect(commonSchemas.source.parse('tmdb')).toBe('tmdb');
      expect(commonSchemas.source.parse('openlist')).toBe('openlist');
    });
  });

  describe('page', () => {
    it('should default to 1', () => {
      expect(commonSchemas.page.parse(undefined)).toBe(1);
    });

    it('should coerce string to number', () => {
      expect(commonSchemas.page.parse('5')).toBe(5);
    });

    it('should reject page < 1', () => {
      expect(() => commonSchemas.page.parse('0')).toThrow();
      expect(() => commonSchemas.page.parse('-1')).toThrow();
    });
  });

  describe('url', () => {
    it('should accept valid URLs', () => {
      expect(commonSchemas.url.parse('https://example.com/image.jpg')).toBe(
        'https://example.com/image.jpg',
      );
    });

    it('should reject invalid URLs', () => {
      expect(() => commonSchemas.url.parse('not-a-url')).toThrow();
      expect(() => commonSchemas.url.parse('')).toThrow();
    });
  });
});

describe('detailQuerySchema', () => {
  const validInput = { id: '12345', source: 'tmdb' };

  it('should parse valid input', () => {
    const result = detailQuerySchema.parse(validInput);
    expect(result).toEqual({ id: '12345', source: 'tmdb' });
  });

  it('should reject missing id', () => {
    expect(() =>
      detailQuerySchema.parse({ source: 'tmdb' }),
    ).toThrow();
  });

  it('should reject missing source', () => {
    expect(() =>
      detailQuerySchema.parse({ id: '12345' }),
    ).toThrow();
  });
});

describe('searchQuerySchema', () => {
  it('should parse valid search input', () => {
    const result = searchQuerySchema.parse({
      keyword: 'test',
      page: '2',
    });
    expect(result.keyword).toBe('test');
    expect(result.page).toBe(2);
  });

  it('should require keyword', () => {
    expect(() => searchQuerySchema.parse({})).toThrow();
  });

  it('should allow optional source', () => {
    const result = searchQuerySchema.parse({
      keyword: 'test',
      source: 'custom',
    });
    expect(result.source).toBe('custom');
  });
});

describe('paginatedQuerySchema', () => {
  it('should apply defaults', () => {
    const result = paginatedQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should reject pageSize > 100', () => {
    expect(() =>
      paginatedQuerySchema.parse({ pageSize: '101' }),
    ).toThrow();
  });
});
