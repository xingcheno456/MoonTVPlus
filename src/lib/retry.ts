export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
  logPrefix?: string;
  onRetry?: (attempt: number, error: any, delay: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    shouldRetry = () => true,
    logPrefix = 'withRetry',
    onRetry,
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const canRetry = shouldRetry(error);

      if (isLastAttempt || !canRetry) {
        console.error(
          `[${logPrefix}] 最终失败 (尝试 ${attempt}/${maxRetries}):`,
          error instanceof Error ? error.message : error,
        );
        throw error;
      }

      const delay = baseDelayMs * attempt;
      console.warn(
        `[${logPrefix}] 尝试 ${attempt}/${maxRetries} 失败，${delay}ms 后重试...`,
      );
      console.error(`[${logPrefix}] Error:`, error instanceof Error ? error.message : error);

      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`[${logPrefix}] 所有重试均失败`);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  return (
    error.message?.includes('Connection') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('ENOTFOUND') ||
    error.code === 'ECONNRESET' ||
    error.code === 'EPIPE'
  );
}

export function isUpstashError(error: any): boolean {
  return isNetworkError(error) || error.name === 'UpstashError';
}