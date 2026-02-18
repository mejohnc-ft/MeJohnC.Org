import { useRef, useEffect, useCallback, useState } from "react";

interface UseInfiniteScrollOptions {
  /** Number of items per page */
  pageSize?: number;
  /** IntersectionObserver threshold */
  threshold?: number;
}

/**
 * Reusable infinite scroll hook using IntersectionObserver.
 *
 * Usage:
 *   const { sentinelRef, items, isLoading, hasMore, reset } = useInfiniteScroll({
 *     pageSize: 50,
 *   });
 *   // Call `loadPage` with your fetch function
 */
export function useInfiniteScroll<T>({
  pageSize = 50,
  threshold = 0.1,
}: UseInfiniteScrollOptions = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchFnRef = useRef<
    ((offset: number, limit: number) => Promise<T[]>) | null
  >(null);

  const loadPage = useCallback(
    async (append: boolean) => {
      if (!fetchFnRef.current || isLoading) return;
      setIsLoading(true);
      try {
        const offset = append ? offsetRef.current : 0;
        const data = await fetchFnRef.current(offset, pageSize);
        if (!append) {
          setItems(data);
          offsetRef.current = data.length;
        } else {
          setItems((prev) => [...prev, ...data]);
          offsetRef.current += data.length;
        }
        setHasMore(data.length >= pageSize);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, isLoading],
  );

  /** Set the fetch function and trigger initial load */
  const setFetchFn = useCallback(
    (fn: (offset: number, limit: number) => Promise<T[]>) => {
      fetchFnRef.current = fn;
      offsetRef.current = 0;
      setHasMore(true);
      setItems([]);
    },
    [],
  );

  /** Reset and reload from scratch */
  const reset = useCallback(() => {
    offsetRef.current = 0;
    setHasMore(true);
    setItems([]);
    loadPage(false);
  }, [loadPage]);

  // IntersectionObserver for auto-loading
  useEffect(() => {
    if (!sentinelRef.current || isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadPage(true);
        }
      },
      { threshold },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isLoading, hasMore, loadPage, threshold]);

  return {
    items,
    setItems,
    isLoading,
    hasMore,
    sentinelRef,
    setFetchFn,
    reset,
    loadPage,
  };
}
