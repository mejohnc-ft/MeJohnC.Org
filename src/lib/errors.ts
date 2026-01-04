import { PostgrestError } from '@supabase/supabase-js';
import { captureException } from './sentry';
import { SUPABASE_ERROR_CODES } from './constants';

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

  const { operation, allowNotFound, returnFallback, fallback } = options;

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
