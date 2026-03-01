/**
 * React Hooks for Feature Flags
 *
 * Provides hooks to check feature flags in React components
 */

/* eslint-disable react-refresh/only-export-components */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useTenant } from "@/lib/tenant";
import {
  featureFlags,
  isFeatureEnabled,
  getFeatureValue,
  initFeatureFlags,
  EvaluationContext,
  FeatureFlag,
} from "../lib/feature-flags";

/**
 * Hook to initialize feature flags
 * Call once at app root
 */
export function useFeatureFlagsInit(): boolean {
  const [initialized, setInitialized] = useState(false);
  const { tenantId } = useTenant();

  useEffect(() => {
    initFeatureFlags(tenantId).then(() => setInitialized(true));
  }, [tenantId]);

  return initialized;
}

/**
 * Hook to get evaluation context from current user
 */
function useEvaluationContext(): EvaluationContext {
  const { user } = useUser();
  const { tenantId } = useTenant();

  return useMemo(
    () => ({
      userId: user?.id,
      userEmail: user?.primaryEmailAddress?.emailAddress,
      tenantId: tenantId ?? undefined,
      environment: import.meta.env.DEV ? "development" : "production",
    }),
    [user?.id, user?.primaryEmailAddress?.emailAddress, tenantId],
  );
}

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(flagName: string): boolean {
  const context = useEvaluationContext();
  return useMemo(
    () => isFeatureEnabled(flagName, context),
    [flagName, context],
  );
}

/**
 * Hook to check multiple feature flags at once
 */
export function useFeatureFlags(flagNames: string[]): Record<string, boolean> {
  const context = useEvaluationContext();

  return useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const name of flagNames) {
      result[name] = isFeatureEnabled(name, context);
    }
    return result;
  }, [flagNames, context]);
}

/**
 * Hook to get a feature flag value with default
 */
export function useFeatureValue<T>(flagName: string, defaultValue: T): T {
  const context = useEvaluationContext();
  return useMemo(
    () => getFeatureValue(flagName, defaultValue, context),
    [flagName, defaultValue, context],
  );
}

/**
 * Hook to get all feature flags (for admin UI)
 */
export function useAllFeatureFlags(): FeatureFlag[] {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => {
    setFlags(featureFlags.getAllFlags());
  }, []);

  return flags;
}

/**
 * Hook to manage feature flag overrides (development only)
 */
export function useFeatureFlagOverrides() {
  const [, forceUpdate] = useState({});

  const setOverride = useCallback((flagName: string, enabled: boolean) => {
    featureFlags.setOverride(flagName, enabled);
    forceUpdate({});
  }, []);

  const clearOverride = useCallback((flagName: string) => {
    featureFlags.clearOverride(flagName);
    forceUpdate({});
  }, []);

  const clearAllOverrides = useCallback(() => {
    featureFlags.clearAllOverrides();
    forceUpdate({});
  }, []);

  return {
    setOverride,
    clearOverride,
    clearAllOverrides,
  };
}

/**
 * Hook for A/B testing variant assignment
 */
export function useABTestVariant(
  experimentName: string,
  variants: string[],
): string | null {
  const { user } = useUser();
  const context = useEvaluationContext();

  return useMemo(() => {
    // Check if experiment is enabled
    if (!isFeatureEnabled(`experiment.${experimentName}`, context)) {
      return null;
    }

    // Deterministically assign variant based on user ID
    if (!user?.id) {
      return variants[0]; // Default variant for anonymous users
    }

    // Hash user ID + experiment name to get consistent variant
    let hash = 0;
    const key = `${experimentName}:${user.id}`;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const index = Math.abs(hash) % variants.length;
    return variants[index];
  }, [experimentName, variants, user?.id, context]);
}

/**
 * Component wrapper that only renders if feature is enabled
 */
interface FeatureGateProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  flag,
  children,
  fallback = null,
}: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
