/**
 * FeatureRoutes Component
 *
 * Dynamically renders routes from enabled feature modules.
 * Supports lazy loading and feature flag integration.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/106
 */

/* eslint-disable react-refresh/only-export-components */

import { Suspense, lazy, ComponentType, useMemo } from 'react';
import { Route } from 'react-router-dom';
import { getEnabledModules } from '@/features';
import type { FeatureRoute } from '@/features/types';

// Loading fallback
function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Cache for lazy-loaded components
const componentCache = new Map<string, ComponentType<unknown>>();

/**
 * Get or create a lazy component for a route
 */
function getLazyComponent(route: FeatureRoute): ComponentType<unknown> {
  const cacheKey = route.path;

  if (!componentCache.has(cacheKey)) {
    const LazyComponent = lazy(async () => {
      const module = await route.component();
      return { default: module.default };
    });
    componentCache.set(cacheKey, LazyComponent);
  }

  return componentCache.get(cacheKey)!;
}

/**
 * Render a single feature route with Suspense
 */
function FeatureRouteElement({ route }: { route: FeatureRoute }) {
  const LazyComponent = useMemo(() => getLazyComponent(route), [route]);

  return (
    <Suspense fallback={<RouteLoader />}>
      <LazyComponent />
    </Suspense>
  );
}

/**
 * Generate Route elements from enabled feature modules
 *
 * Usage in App.tsx:
 * ```tsx
 * <Routes>
 *   {renderFeatureRoutes()}
 * </Routes>
 * ```
 */
export function renderFeatureRoutes() {
  const modules = getEnabledModules();

  return modules.flatMap((module) =>
    module.frontendRoutes.map((route) => (
      <Route
        key={route.path}
        path={route.path}
        element={<FeatureRouteElement route={route} />}
      />
    ))
  );
}

/**
 * Get all feature routes as an array (for debugging/inspection)
 */
export function getFeatureRoutesList(): FeatureRoute[] {
  const modules = getEnabledModules();
  return modules.flatMap((module) => module.frontendRoutes);
}

/**
 * Check if a path matches any feature route
 */
export function isFeatureRoute(path: string): boolean {
  const routes = getFeatureRoutesList();
  return routes.some((route) => {
    // Convert route path to regex pattern
    const pattern = route.path
      .replace(/:[^/]+/g, '[^/]+') // :param -> [^/]+
      .replace(/\//g, '\\/'); // escape slashes
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
}

export default renderFeatureRoutes;
