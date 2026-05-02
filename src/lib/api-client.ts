import { parseApiResponse } from './api-response';

interface ApiClientOptions {
  timeout?: number;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const { timeout = 30000 } = options;

  async function request<T>(
    url: string,
    init?: RequestInit,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await parseApiResponse<{ error?: string }>(response).catch(() => ({} as any));
        throw new Error(
          errorBody.error || `请求失败 (${response.status})`,
        );
      }

      return parseApiResponse<T>(response);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get<T>(url: string): Promise<T> {
      return request<T>(url);
    },
    post<T>(url: string, body: unknown): Promise<T> {
      return request<T>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    put<T>(url: string, body: unknown): Promise<T> {
      return request<T>(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    delete<T>(url: string): Promise<T> {
      return request<T>(url, {
        method: 'DELETE',
      });
    },
  };
}

export const apiClient = createApiClient();
