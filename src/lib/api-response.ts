import { NextResponse } from 'next/server';

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true, data } as ApiResponse<T>, init);
}

export function apiError(
  error: string,
  status = 400,
  code?: string,
): NextResponse {
  const body: ApiResponse<never> = { success: false, error };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error(
      '解析响应失败: ' + (error instanceof Error ? error.message : '未知错误'),
    );
  }

  if (json && typeof json === 'object' && 'success' in json && typeof (json as Record<string, unknown>).success === 'boolean') {
    const result = json as { success: boolean; data?: T; error?: string; code?: string };
    if (result.success) {
      return result.data as T;
    }
    const error = new Error(result.error || '请求失败');
    if (result.code) (error as Error & { code?: string }).code = result.code;
    throw error;
  }

  return json as T;
}
