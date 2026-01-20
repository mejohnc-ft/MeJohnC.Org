/**
 * Retry Logic with Exponential Backoff
 *
 * Provides utilities for retrying failed operations with:
 * - Exponential backoff with jitter
 * - Configurable retry counts and delays
 * - Circuit breaker pattern
 * - Abort controller support
 */

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  /** AbortController signal to cancel retries */
  signal?: AbortSignal;
}

/**
 * Default retry configuration
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'signal' | 'onRetry' | 'isRetryable'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Default function to determine if error is retryable
 */
function defaultIsRetryable(error: Error): boolean {
  // Retry on network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // Retry on timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return true;
  }

  // Check for HTTP status codes in error message
  const statusMatch = error.message.match(/\b(5\d{2}|408|429)\b/);
  if (statusMatch) {
    return true; // Retry on 5xx, 408 (timeout), 429 (rate limit)
  }

  return false;
}

/**
 * Calculate delay for the given attempt with exponential backoff
 */
export function calculateDelay(
  attempt: number,
  options: Pick<RetryOptions, 'initialDelay' | 'maxDelay' | 'backoffMultiplier' | 'jitter'>
): number {
  const { initialDelay = 1000, maxDelay = 30000, backoffMultiplier = 2, jitter = true } = options;

  // Calculate base delay with exponential backoff
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

  // Cap at maximum delay
  delay = Math.min(delay, maxDelay);

  // Add jitter (randomize between 50% and 100% of delay)
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.round(delay);
}

/**
 * Sleep for the specified duration
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Retry aborted'));
      });
    }
  });
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const isRetryable = options?.isRetryable || defaultIsRetryable;

  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      // Check if aborted
      if (opts.signal?.aborted) {
        throw new Error('Retry aborted');
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const isLastAttempt = attempt > opts.maxRetries;
      const shouldRetry = !isLastAttempt && isRetryable(lastError);

      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, opts);

      // Call onRetry callback
      options?.onRetry?.(lastError, attempt, delay);

      // Wait before retrying
      await sleep(delay, opts.signal);
    }
  }

  throw lastError!;
}

/**
 * Retry fetch requests specifically
 */
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { retryOptions?: RetryOptions }
): Promise<Response> {
  const { retryOptions, ...fetchInit } = init || {};

  return retry(
    async () => {
      const response = await fetch(input, fetchInit);

      // Throw on retryable status codes
      if (!response.ok) {
        const status = response.status;
        if (status === 429 || status === 408 || status >= 500) {
          throw new Error(`HTTP ${status}: ${response.statusText}`);
        }
      }

      return response;
    },
    {
      ...retryOptions,
      isRetryable: (error) => {
        // Check for rate limit header
        if (error.message.includes('429')) {
          return true;
        }
        return defaultIsRetryable(error);
      },
    }
  );
}

/**
 * Circuit breaker state
 */
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting recovery (default: 60000) */
  recoveryTimeout?: number;
  /** Number of successes needed to close circuit (default: 2) */
  successThreshold?: number;
}

/**
 * Create a circuit breaker wrapper
 */
export function createCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: CircuitBreakerOptions
): T & { getState: () => CircuitState; reset: () => void } {
  const failureThreshold = options?.failureThreshold ?? 5;
  const recoveryTimeout = options?.recoveryTimeout ?? 60000;
  const successThreshold = options?.successThreshold ?? 2;

  const state: CircuitState = {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  };

  let successCount = 0;

  const wrapped = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Check circuit state
    if (state.state === 'open') {
      const timeSinceFailure = Date.now() - state.lastFailure;
      if (timeSinceFailure >= recoveryTimeout) {
        state.state = 'half-open';
        successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn(...args);

      // Success - handle state transitions
      if (state.state === 'half-open') {
        successCount++;
        if (successCount >= successThreshold) {
          state.state = 'closed';
          state.failures = 0;
        }
      } else {
        state.failures = 0;
      }

      return result as ReturnType<T>;
    } catch (error) {
      // Failure - increment counter and potentially open circuit
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= failureThreshold) {
        state.state = 'open';
      }

      throw error;
    }
  };

  // Add utility methods
  wrapped.getState = () => ({ ...state });
  wrapped.reset = () => {
    state.failures = 0;
    state.lastFailure = 0;
    state.state = 'closed';
    successCount = 0;
  };

  return wrapped as T & { getState: () => CircuitState; reset: () => void };
}

/**
 * Retry decorator for class methods
 */
export function Retry(options?: RetryOptions) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return retry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Create a retryable version of any async function
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: RetryOptions
): T {
  return ((...args: Parameters<T>) => retry(() => fn(...args), options)) as T;
}
