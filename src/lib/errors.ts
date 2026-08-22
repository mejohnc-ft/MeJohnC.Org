import { PostgrestError } from '@supabase/supabase-js';
import { captureException } from './sentry';
import { SUPABASE_ERROR_CODES } from './constants';

const POSTGREST_ERROR_FIELDS = ['code', 'details', 'hint', 'status'] as const;

function formatErrorField(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

/**
 * Convert any thrown value into an `Error` with a useful `.message`.
 *
 * PostgREST / Supabase errors are plain objects (`{ message, code, details, hint }`),
 * not `instanceof Error`. `new Error(String(obj))` becomes `"Error: [object Object]"`
 * in Sentry — this helper never does that.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  if (value === null || value === undefined) {
    return new Error(String(value));
  }

  const valueType = typeof value;
  if (valueType === 'string') {
    return new Error(value);
  }
  if (
    valueType === 'number' ||
    valueType === 'boolean' ||
    valueType === 'bigint' ||
    valueType === 'symbol'
  ) {
    return new Error(String(value));
  }

  if (valueType === 'object') {
    const obj = value as Record<string, unknown>;
    const message = typeof obj.message === 'string' ? obj.message.trim() : '';
    const extras: string[] = [];

    for (const field of POSTGREST_ERROR_FIELDS) {
      const fieldValue = obj[field];
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        continue;
      }
      extras.push(`${field}: ${formatErrorField(fieldValue)}`);
    }

    if (message || extras.length > 0) {
      const extraSuffix = extras.length > 0 ? ` (${extras.join(', ')})` : '';
      return new Error(`${message || 'Unknown error'}${extraSuffix}`);
    }

    try {
      return new Error(JSON.stringify(obj));
    } catch {
      return new Error('Unserializable error object');
    }
  }

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error('Unknown error');
  }
}

/**
 * Error Handling Strategy
 *
 * This module provides standardized error handling for Supabase operations:
 *
 * **Read Operations (fetching data):**
 * - Use `handleQueryResult` with `returnFallback: true` for graceful degradation
 * - This allows the UI to render with empty/default data if fetch fails
 * - Errors are still logged to Sentry for investigation
 *
 * **Write Operations (create/update/delete):**
 * - Throw errors directly so callers know the operation failed
 * - UI should catch these and show error messages to users
 *
 * **Example usage:**
 *
 * // Read operation - returns fallback on error
 * const data = handleQueryResult(result, error, {
 *   operation: 'getItems',
 *   returnFallback: true,
 *   fallback: [],
 * });
 *
 * // Write operation - throws on error
 * if (error) throw error;
 * return data;
 */

/**
 * Custom error class for Supabase operations
 */
export class SupabaseQueryError extends Error {
  public readonly code: string | null;
  public readonly details: string | null;
  public readonly hint: string | null;
  public readonly operation: string;

  constructor(error: PostgrestError, operation: string) {
    super(error.message);
    this.name = 'SupabaseQueryError';
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
    this.operation = operation;
  }

  /**
   * Returns a user-friendly error message
   */
  toUserMessage(): string {
    switch (this.code) {
      case SUPABASE_ERROR_CODES.NOT_FOUND:
        return 'The requested item was not found.';
      case SUPABASE_ERROR_CODES.UNIQUE_VIOLATION:
        return 'This item already exists.';
      case SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        return 'This item is referenced by other data and cannot be modified.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Check if an error is a "not found" error
 */
export function isNotFoundError(error: PostgrestError | null): boolean {
  return error?.code === SUPABASE_ERROR_CODES.NOT_FOUND;
}

/**
 * Create a standardized error message for logging
 */
export function formatErrorForLogging(error: unknown, context: string): string {
  if (error instanceof SupabaseQueryError) {
    return `[${context}] ${error.operation}: ${error.message} (code: ${error.code})`;
  }
  if (error instanceof Error) {
    return `[${context}] ${error.message}`;
  }
  return `[${context}] Unknown error: ${toError(error).message}`;
}

/**
 * Options for error handling behavior
 */
interface HandleErrorOptions {
  /** The operation being performed (for context in error messages) */
  operation: string;
  /** If true, returns null instead of throwing on not-found errors */
  allowNotFound?: boolean;
  /** If true, returns the fallback value instead of throwing */
  returnFallback?: boolean;
  /** Fallback value to return when returnFallback is true */
  fallback?: unknown;
}

/**
 * Standardized error handler for Supabase operations.
 * Logs to Sentry and either throws or returns a fallback based on options.
 */
export function handleSupabaseError(
  error: PostgrestError | null,
  options: HandleErrorOptions
): void {
  if (!error) return;

  const { operation, allowNotFound, returnFallback } = options;

  // Handle "not found" errors gracefully if allowed
  if (allowNotFound && error.code === SUPABASE_ERROR_CODES.NOT_FOUND) {
    return;
  }

  const queryError = new SupabaseQueryError(error, operation);

  // Log to Sentry with context
  captureException(queryError, {
    operation,
    errorCode: error.code,
    errorDetails: error.details,
    errorHint: error.hint,
  });

  // If we should return a fallback, don't throw
  if (returnFallback) {
    return;
  }

  throw queryError;
}

/**
 * Type-safe error handler that returns data or handles error
 */
export function handleQueryResult<T>(
  data: T | null,
  error: PostgrestError | null,
  options: HandleErrorOptions & { fallback: T }
): T;
export function handleQueryResult<T>(
  data: T | null,
  error: PostgrestError | null,
  options: HandleErrorOptions
): T;
export function handleQueryResult<T>(
  data: T | null,
  error: PostgrestError | null,
  options: HandleErrorOptions
): T {
  if (error) {
    handleSupabaseError(error, options);

    // If we reach here with returnFallback, return the fallback
    if (options.returnFallback && 'fallback' in options) {
      return options.fallback as T;
    }
  }

  return data as T;
}
