/* eslint-disable react-refresh/only-export-components */
import { useCallback, useState, ReactNode } from 'react';
import { Link, LinkProps } from 'react-router-dom';

// Map of routes to their chunk imports
const routeImports: Record<string, () => Promise<unknown>> = {
  '/portfolio': () => import('@/pages/Portfolio'),
  '/about': () => import('@/pages/About'),
  '/blog': () => import('@/pages/BlogPost'),
  '/apps': () => import('@/pages/AppDetail'),
};

// Track what's already been prefetched
const prefetchedRoutes = new Set<string>();

interface PrefetchLinkProps extends LinkProps {
  children: ReactNode;
  prefetchOnHover?: boolean;
}

/**
 * Enhanced Link component that prefetches route chunks on hover
 * This reduces perceived load time when navigating
 */
export function PrefetchLink({
  to,
  children,
  prefetchOnHover = true,
  ...props
}: PrefetchLinkProps) {
  const [hasPrefetched, setHasPrefetched] = useState(false);

  const prefetch = useCallback(() => {
    if (hasPrefetched) return;

    const path = typeof to === 'string' ? to : to.pathname || '';

    // Find matching route pattern
    const matchingRoute = Object.keys(routeImports).find((route) => {
      if (route === path) return true;
      if (path.startsWith(route + '/')) return true;
      return false;
    });

    if (matchingRoute && !prefetchedRoutes.has(matchingRoute)) {
      prefetchedRoutes.add(matchingRoute);

      // Prefetch the chunk
      routeImports[matchingRoute]().catch(() => {
        // Remove from set if prefetch fails so it can be retried
        prefetchedRoutes.delete(matchingRoute);
      });

      setHasPrefetched(true);
    }
  }, [to, hasPrefetched]);

  const handleMouseEnter = useCallback(() => {
    if (prefetchOnHover) {
      // Small delay to avoid prefetching on accidental hovers
      const timer = setTimeout(prefetch, 100);
      return () => clearTimeout(timer);
    }
  }, [prefetch, prefetchOnHover]);

  const handleFocus = useCallback(() => {
    if (prefetchOnHover) {
      prefetch();
    }
  }, [prefetch, prefetchOnHover]);

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * Prefetch multiple routes programmatically
 * Useful for prefetching likely next pages on idle
 */
export function prefetchRoutes(routes: string[]) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      routes.forEach((route) => {
        const matchingRoute = Object.keys(routeImports).find(
          (r) => route === r || route.startsWith(r + '/')
        );

        if (matchingRoute && !prefetchedRoutes.has(matchingRoute)) {
          prefetchedRoutes.add(matchingRoute);
          routeImports[matchingRoute]().catch(() => {
            prefetchedRoutes.delete(matchingRoute);
          });
        }
      });
    });
  }
}

/**
 * Hook to prefetch common routes on page load
 */
export function usePrefetchOnIdle(routes: string[]) {
  // Prefetch after initial render settles
  if (typeof window !== 'undefined') {
    requestIdleCallback?.(() => {
      prefetchRoutes(routes);
    });
  }
}
