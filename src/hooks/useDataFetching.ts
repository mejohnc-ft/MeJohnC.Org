import { useState, useEffect, useCallback, useRef } from 'react';
import { captureException } from '@/lib/sentry';

interface UseDataFetchingOptions<T> {
  /** Initial data value before fetch completes */
  initialData?: T;
  /** Whether to fetch immediately on mount */
  fetchOnMount?: boolean;
  /** Dependencies that trigger a refetch when changed */
  deps?: unknown[];
  /** Custom error message for logging */
  errorContext?: string;
  /** Called when fetch succeeds */
  onSuccess?: (data: T) => void;
  /** Called when fetch fails */
  onError?: (error: Error) => void;
}

interface UseDataFetchingResult<T> {
  /** The fetched data */
  data: T | undefined;
  /** Whether the fetch is in progress */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
  /** Update data manually (for optimistic updates) */
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/**
 * Generic hook for data fetching with loading, error, and refetch support.
 * Automatically logs errors to Sentry.
 *
 * @example
 * ```tsx
 * const { data: posts, isLoading, error, refetch } = useDataFetching(
 *   () => getBlogPosts(),
 *   { errorContext: 'BlogPostList' }
 * );
 * ```
 */
export function useDataFetching<T>(
  fetchFn: () => Promise<T>,
  options: UseDataFetchingOptions<T> = {}
): UseDataFetchingResult<T> {
  const {
    initialData,
    fetchOnMount = true,
    deps = [],
    errorContext = 'DataFetch',
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current();

      if (isMountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      if (isMountedRef.current) {
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }

      // Log to Sentry
      captureException(
        err instanceof Error ? err : new Error(errorMessage),
        { context: errorContext }
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [errorContext, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  // Serialize deps for stable comparison
  const depsKey = JSON.stringify(deps);

  // Fetch on mount and when deps change
  useEffect(() => {
    if (fetchOnMount) {
      fetchData();
    }
  }, [fetchOnMount, fetchData, depsKey]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    reset,
    setData,
  };
}

/**
 * Hook for mutations (create, update, delete) with loading and error states.
 *
 * @example
 * ```tsx
 * const { mutate, isLoading } = useMutation(
 *   (id: string) => deletePost(id),
 *   { onSuccess: () => refetch() }
 * );
 * ```
 */
interface UseMutationOptions<TData, TVariables> {
  /** Called when mutation succeeds */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called when mutation fails */
  onError?: (error: Error, variables: TVariables) => void;
  /** Custom error context for logging */
  errorContext?: string;
}

interface UseMutationResult<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  /** Whether mutation is in progress */
  isLoading: boolean;
  /** Error message if mutation failed */
  error: string | null;
  /** Reset error state */
  reset: () => void;
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError, errorContext = 'Mutation' } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage), variables);

      captureException(
        err instanceof Error ? err : new Error(errorMessage),
        { context: errorContext, variables }
      );

      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, errorContext]);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    reset,
  };
}
