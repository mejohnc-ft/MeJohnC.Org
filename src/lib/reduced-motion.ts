import { useState, useEffect } from 'react';

/**
 * Hook to detect user's reduced motion preference
 * Returns true if the user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') return false;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Get motion-safe animation variants
 * Returns empty/instant animations when reduced motion is preferred
 */
export function getMotionSafeVariants<T extends Record<string, unknown>>(
  variants: T,
  prefersReducedMotion: boolean
): T {
  if (!prefersReducedMotion) return variants;

  // Create instant/no-motion versions of variants
  const safeVariants = {} as T;

  for (const key in variants) {
    const variant = variants[key] as Record<string, unknown>;
    safeVariants[key] = {
      ...variant,
      // Remove motion properties
      x: undefined,
      y: undefined,
      scale: 1,
      rotate: 0,
      opacity: variant.opacity ?? 1,
      // Make transitions instant
      transition: { duration: 0 },
    } as T[Extract<keyof T, string>];
  }

  return safeVariants;
}
