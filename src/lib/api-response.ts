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
  const json = await response.json();

  if (json && typeof json.success === 'boolean') {
    if (json.success) {
      return json.data as T;
    }
    const error = new Error(json.error || '请求失败');
    if (json.code) (error as Error & { code?: string }).code = json.code;
    throw error;
  }

  return json as T;
}
