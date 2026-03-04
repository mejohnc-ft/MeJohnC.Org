/**
 * Hook for AI usage tracking per billing period.
 * Issue: #314
 */

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/tenant";
import { useTenantSupabase } from "@/lib/supabase";
import { useBilling } from "@/hooks/useBilling";

interface AIUsageState {
  used: number;
  limit: number;
  loading: boolean;
}

export function useAIUsage(): AIUsageState {
  const { tenant } = useTenant();
  const { supabase } = useTenantSupabase();
  const { limits } = useBilling();
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant || !supabase) {
      setLoading(false);
      return;
    }

    const settings = tenant.settings as Record<string, unknown> | undefined;
    const periodStart = settings?.current_period_start as string | undefined;

    if (!periodStart) {
      setUsed(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .schema("app")
      .rpc("get_tenant_ai_usage_count", {
        p_tenant_id: tenant.id,
        p_period_start: periodStart,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch AI usage count:", error);
          setUsed(0);
        } else {
          setUsed(typeof data === "number" ? data : 0);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenant, supabase]);

  return {
    used,
    limit: limits.maxAiChats,
    loading,
  };
}
