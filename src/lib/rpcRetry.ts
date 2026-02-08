/**
 * Exponential-backoff retry wrapper for async RPC calls.
 *
 * Defaults: 3 attempts, 500 ms initial delay, 2× multiplier, ±25 % jitter.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default 3. */
  maxAttempts?: number;
  /** Initial delay in ms before the first retry. Default 500. */
  baseDelayMs?: number;
  /** Multiplier applied after each retry. Default 2. */
  multiplier?: number;
  /** Random jitter factor (0–1). 0.25 = ±25 %. Default 0.25. */
  jitter?: number;
  /** Predicate: return `true` if the error is retryable. Defaults to always retry. */
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  multiplier: 2,
  jitter: 0.25,
  isRetryable: () => true,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addJitter(delay: number, jitter: number): number {
  const range = delay * jitter;
  return delay + (Math.random() * 2 - 1) * range;
}

/**
 * Returns `true` for errors that are typically transient RPC / network failures.
 */
export function isTransientRpcError(error: unknown): boolean {
  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as any).message)
        : String(error);

  const transientPatterns = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'fetch failed',
    'network error',
    'Failed to fetch',
    'could not detect network',
    'missing response',
    'request timeout',
    'bad response',
    'SERVER_ERROR',
    'TIMEOUT',
    'BAD_DATA', // returned when contract address resolves to 0x (testnet flakiness)
    'could not decode result data',
    '502',
    '503',
    '504',
    'rate limit',
    'Too Many Requests',
  ];

  const lower = message.toLowerCase();
  return transientPatterns.some((p) => lower.includes(p.toLowerCase()));
}

/**
 * Execute `fn` with automatic retries using exponential backoff.
 *
 * ```ts
 * const data = await withRetry(() => contract.getSettings(), { maxAttempts: 4 });
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.baseDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const retriable = opts.isRetryable(error);
      if (!retriable || attempt === opts.maxAttempts) {
        throw error;
      }

      const jitteredDelay = Math.round(addJitter(delay, opts.jitter));
      console.warn(
        `[RPC Retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${jitteredDelay}ms…`,
        error instanceof Error ? error.message : error,
      );
      await sleep(jitteredDelay);
      delay *= opts.multiplier;
    }
  }

  throw lastError;
}
