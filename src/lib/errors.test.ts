import { describe, it, expect, vi } from 'vitest';
import { PostgrestError } from '@supabase/supabase-js';
import {
  SupabaseQueryError,
  isNotFoundError,
  formatErrorForLogging,
  handleSupabaseError,
  handleQueryResult,
} from './errors';
import { SUPABASE_ERROR_CODES } from './constants';

// Mock Sentry
vi.mock('./sentry', () => ({
  captureException: vi.fn(),
}));

describe('Error Utilities', () => {
  describe('SupabaseQueryError', () => {
    it('creates error with correct properties', () => {
      const pgError: PostgrestError = {
        message: 'Test error',
        details: 'Some details',
        hint: 'A helpful hint',
        code: '23505',
      };

      const error = new SupabaseQueryError(pgError, 'testOperation');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('23505');
      expect(error.details).toBe('Some details');
      expect(error.hint).toBe('A helpful hint');
      expect(error.operation).toBe('testOperation');
      expect(error.name).toBe('SupabaseQueryError');
    });

    it('toUserMessage returns friendly message for NOT_FOUND', () => {
      const pgError: PostgrestError = {
        message: 'Row not found',
        details: null,
        hint: null,
        code: SUPABASE_ERROR_CODES.NOT_FOUND,
      };

      const error = new SupabaseQueryError(pgError, 'test');
      expect(error.toUserMessage()).toBe('The requested item was not found.');
    });

    it('toUserMessage returns friendly message for UNIQUE_VIOLATION', () => {
      const pgError: PostgrestError = {
        message: 'duplicate key',
        details: null,
        hint: null,
        code: SUPABASE_ERROR_CODES.UNIQUE_VIOLATION,
      };

      const error = new SupabaseQueryError(pgError, 'test');
      expect(error.toUserMessage()).toBe('This item already exists.');
    });

    it('toUserMessage returns generic message for unknown codes', () => {
      const pgError: PostgrestError = {
        message: 'Unknown error',
        details: null,
        hint: null,
        code: 'UNKNOWN',
      };

      const error = new SupabaseQueryError(pgError, 'test');
      expect(error.toUserMessage()).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('isNotFoundError', () => {
    it('returns true for NOT_FOUND error code', () => {
      const error: PostgrestError = {
        message: 'Not found',
        details: null,
        hint: null,
        code: SUPABASE_ERROR_CODES.NOT_FOUND,
      };

      expect(isNotFoundError(error)).toBe(true);
    });

    it('returns false for other error codes', () => {
      const error: PostgrestError = {
        message: 'Error',
        details: null,
        hint: null,
        code: '23505',
      };

      expect(isNotFoundError(error)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isNotFoundError(null)).toBe(false);
    });
  });

  describe('formatErrorForLogging', () => {
    it('formats SupabaseQueryError correctly', () => {
      const pgError: PostgrestError = {
        message: 'Test error',
        details: null,
        hint: null,
        code: '23505',
      };
      const error = new SupabaseQueryError(pgError, 'getItems');

      const formatted = formatErrorForLogging(error, 'TestContext');
      expect(formatted).toBe('[TestContext] getItems: Test error (code: 23505)');
    });

    it('formats regular Error correctly', () => {
      const error = new Error('Something went wrong');

      const formatted = formatErrorForLogging(error, 'TestContext');
      expect(formatted).toBe('[TestContext] Something went wrong');
    });

    it('formats unknown errors correctly', () => {
      const formatted = formatErrorForLogging('string error', 'TestContext');
      expect(formatted).toBe('[TestContext] Unknown error: string error');
    });
  });

  describe('handleSupabaseError', () => {
    it('does nothing for null error', () => {
      expect(() => {
        handleSupabaseError(null, { operation: 'test' });
      }).not.toThrow();
    });

    it('throws for errors when returnFallback is false', () => {
      const error: PostgrestError = {
        message: 'Error',
        details: null,
        hint: null,
        code: '23505',
      };

      expect(() => {
        handleSupabaseError(error, { operation: 'test', returnFallback: false });
      }).toThrow(SupabaseQueryError);
    });

    it('does not throw for NOT_FOUND when allowNotFound is true', () => {
      const error: PostgrestError = {
        message: 'Not found',
        details: null,
        hint: null,
        code: SUPABASE_ERROR_CODES.NOT_FOUND,
      };

      expect(() => {
        handleSupabaseError(error, { operation: 'test', allowNotFound: true });
      }).not.toThrow();
    });
  });

  describe('handleQueryResult', () => {
    it('returns data when no error', () => {
      const data = { id: 1, name: 'Test' };
      const result = handleQueryResult(data, null, { operation: 'test', fallback: null });

      expect(result).toEqual(data);
    });

    it('returns fallback when error and returnFallback is true', () => {
      const error: PostgrestError = {
        message: 'Error',
        details: null,
        hint: null,
        code: '23505',
      };
      const fallback = { default: true };

      const result = handleQueryResult(null, error, {
        operation: 'test',
        returnFallback: true,
        fallback,
      });

      expect(result).toEqual(fallback);
    });

    it('throws when error and returnFallback is false', () => {
      const error: PostgrestError = {
        message: 'Error',
        details: null,
        hint: null,
        code: '23505',
      };

      expect(() => {
        handleQueryResult(null, error, { operation: 'test', fallback: null });
      }).toThrow(SupabaseQueryError);
    });
  });
});
