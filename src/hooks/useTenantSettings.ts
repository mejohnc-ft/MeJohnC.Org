/**
 * Hook for reading and writing tenant settings.
 * Issue: #302
 */

import { useCallback, useMemo } from "react";
import { useTenant } from "@/lib/tenant";
import { useTenantSupabase } from "@/lib/supabase";
import { useMutation } from "@/hooks/useDataFetching";
import {
  parseTenantSettings,
  type TenantBranding,
  type TenantDomain,
  type TenantEmail,
  type TenantSettings,
} from "@/lib/tenant-settings";

interface UseTenantSettingsResult {
  settings: TenantSettings;
  saveBranding: (branding: TenantBranding) => Promise<void>;
  saveEnabledApps: (apps: string[]) => Promise<void>;
  saveDockPinned: (pinned: string[]) => Promise<void>;
  saveDomain: (domain: TenantDomain) => Promise<void>;
  saveEmail: (email: TenantEmail) => Promise<void>;
  saveOnboardingComplete: (complete: boolean) => Promise<void>;
  saveOnboardingStep: (step: number) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
}

export function useTenantSettings(): UseTenantSettingsResult {
  const { tenant, refreshTenant } = useTenant();
  const { supabase } = useTenantSupabase();

  const settings = useMemo(
    () => parseTenantSettings(tenant?.settings),
    [tenant?.settings],
  );

  const {
    mutate: callRpc,
    isLoading: isSaving,
    error: saveError,
  } = useMutation(
    async (params: Record<string, unknown>) => {
      if (!supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("update_tenant_settings", params);
      if (error) throw error;
    },
    {
      onSuccess: () => refreshTenant(),
      errorContext: "TenantSettings.save",
    },
  );

  const saveBranding = useCallback(
    async (branding: TenantBranding) => {
      await callRpc({ p_branding: branding });
    },
    [callRpc],
  );

  const saveEnabledApps = useCallback(
    async (apps: string[]) => {
      await callRpc({ p_enabled_apps: apps });
    },
    [callRpc],
  );

  const saveDockPinned = useCallback(
    async (pinned: string[]) => {
      await callRpc({ p_dock_pinned: pinned });
    },
    [callRpc],
  );

  const saveDomain = useCallback(
    async (domain: TenantDomain) => {
      await callRpc({ p_domain: domain });
    },
    [callRpc],
  );

  const saveEmail = useCallback(
    async (email: TenantEmail) => {
      await callRpc({ p_email: email });
    },
    [callRpc],
  );

  const saveOnboardingComplete = useCallback(
    async (complete: boolean) => {
      await callRpc({ p_onboarding_complete: complete });
    },
    [callRpc],
  );

  const saveOnboardingStep = useCallback(
    async (step: number) => {
      await callRpc({ p_onboarding_step: step });
    },
    [callRpc],
  );

  return {
    settings,
    saveBranding,
    saveEnabledApps,
    saveDockPinned,
    saveDomain,
    saveEmail,
    saveOnboardingComplete,
    saveOnboardingStep,
    isSaving,
    saveError,
  };
}
