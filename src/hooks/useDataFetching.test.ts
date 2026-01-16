import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDataFetching, useMutation } from './useDataFetching';

// Mock Sentry
vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
}));

describe('useDataFetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with loading state when fetchOnMount is true', () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(() => useDataFetching(fetchFn));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('fetches data on mount', async () => {
    const testData = { id: 1, name: 'Test' };
    const fetchFn = vi.fn().mockResolvedValue(testData);

    const { result } = renderHook(() => useDataFetching(fetchFn));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(testData);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not fetch on mount when fetchOnMount is false', () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(() =>
      useDataFetching(fetchFn, { fetchOnMount: false })
    );

    expect(result.current.isLoading).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('uses initialData before fetch completes', () => {
    const initialData = { id: 0, name: 'Initial' };
    const fetchFn = vi.fn().mockResolvedValue({ id: 1, name: 'Fetched' });

    const { result } = renderHook(() =>
      useDataFetching(fetchFn, { initialData })
    );

    expect(result.current.data).toEqual(initialData);
  });

  it('handles fetch errors', async () => {
    const error = new Error('Fetch failed');
    const fetchFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useDataFetching(fetchFn));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Fetch failed');
    expect(result.current.data).toBeUndefined();
  });

  it('calls onSuccess callback on successful fetch', async () => {
    const testData = { id: 1 };
    const fetchFn = vi.fn().mockResolvedValue(testData);
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useDataFetching(fetchFn, { onSuccess })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith(testData);
  });

  it('calls onError callback on fetch error', async () => {
    const error = new Error('Fetch failed');
    const fetchFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useDataFetching(fetchFn, { onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('refetches when refetch is called', async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({ count: callCount });
    });

    const { result } = renderHook(() => useDataFetching(fetchFn));

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 1 });
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual({ count: 2 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('resets state when reset is called', async () => {
    const initialData = { id: 0 };
    const fetchFn = vi.fn().mockResolvedValue({ id: 1 });

    const { result } = renderHook(() =>
      useDataFetching(fetchFn, { initialData })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 1 });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual(initialData);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('allows manual data updates via setData', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ id: 1 });

    const { result } = renderHook(() => useDataFetching(fetchFn));

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 1 });
    });

    act(() => {
      result.current.setData({ id: 999 });
    });

    expect(result.current.data).toEqual({ id: 999 });
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with idle state', () => {
    const mutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMutation(mutationFn));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('executes mutation and returns result', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: 1, created: true });

    const { result } = renderHook(() => useMutation(mutationFn));

    let mutationResult: { id: number; created: boolean } | undefined;
    await act(async () => {
      mutationResult = await result.current.mutate({ name: 'Test' });
    });

    expect(mutationResult).toEqual({ id: 1, created: true });
    expect(mutationFn).toHaveBeenCalledWith({ name: 'Test' });
  });

  it('sets loading state during mutation', async () => {
    let resolvePromise: (value: { success: boolean }) => void;
    const mutationFn = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolvePromise = resolve;
      });
    });

    const { result } = renderHook(() => useMutation(mutationFn));

    act(() => {
      result.current.mutate({});
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({ success: true });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('handles mutation errors', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useMutation(mutationFn));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.error).toBe('Mutation failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('calls onSuccess with data and variables', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ created: true });
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useMutation(mutationFn, { onSuccess })
    );

    await act(async () => {
      await result.current.mutate({ name: 'Test' });
    });

    expect(onSuccess).toHaveBeenCalledWith({ created: true }, { name: 'Test' });
  });

  it('calls onError with error and variables', async () => {
    const error = new Error('Failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useMutation(mutationFn, { onError })
    );

    await act(async () => {
      await result.current.mutate({ id: 1 });
    });

    expect(onError).toHaveBeenCalledWith(error, { id: 1 });
  });

  it('resets error state when reset is called', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useMutation(mutationFn));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.error).toBe('Failed');

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
  });

  it('returns undefined on error', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useMutation(mutationFn));

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutate({});
    });

    expect(mutationResult).toBeUndefined();
  });
});
