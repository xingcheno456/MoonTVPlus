import { parseApiResponse } from '../api-response';

describe('parseApiResponse', () => {
  it('should unwrap success response', async () => {
    const response = new Response(
      JSON.stringify({ success: true, data: { results: [1, 2, 3] } }),
    );
    const data = await parseApiResponse<{ results: number[] }>(response);
    expect(data.results).toEqual([1, 2, 3]);
  });

  it('should throw on error response', async () => {
    const response = new Response(
      JSON.stringify({ success: false, error: 'Something wrong' }),
      { status: 500 },
    );
    await expect(parseApiResponse(response)).rejects.toThrow('Something wrong');
  });

  it('should include error code when provided', async () => {
    const response = new Response(
      JSON.stringify({ success: false, error: 'Not found', code: 'NOT_FOUND' }),
      { status: 404 },
    );
    try {
      await parseApiResponse(response);
      throw new Error('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).toBe('Not found');
      expect(error.code).toBe('NOT_FOUND');
    }
  });

  it('should pass through non-wrapped response', async () => {
    const response = new Response(JSON.stringify({ key: 'value' }));
    const data = await parseApiResponse<{ key: string }>(response);
    expect(data.key).toBe('value');
  });

  it('should throw on invalid JSON', async () => {
    const response = new Response('not valid json');
    await expect(parseApiResponse(response)).rejects.toThrow('解析响应失败');
  });

  it('should handle null data in success response', async () => {
    const response = new Response(
      JSON.stringify({ success: true, data: null }),
    );
    const data = await parseApiResponse(response);
    expect(data).toBeNull();
  });

  it('should handle empty object response', async () => {
    const response = new Response(JSON.stringify({}));
    const data = await parseApiResponse<Record<string, never>>(response);
    expect(data).toEqual({});
  });
});
