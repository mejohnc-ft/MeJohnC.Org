/**
 * React hook for accessing tenant billing state.
 * Issue: #301
 */

import { useMemo } from "react";
import { useTenant } from "@/lib/tenant";
import {
  parsePlanFromSettings,
  getPlanLimits,
  isSubscriptionPastDue,
  type PlanTier,
  type PlanLimits,
} from "@/lib/billing";

interface BillingState {
  plan: PlanTier;
  limits: PlanLimits;
  isPastDue: boolean;
  isFreePlan: boolean;
}

export function useBilling(): BillingState {
  const { tenant } = useTenant();

  return useMemo(() => {
    const plan = parsePlanFromSettings(tenant?.settings);
    return {
      plan,
      limits: getPlanLimits(plan),
      isPastDue: isSubscriptionPastDue(tenant?.settings),
      isFreePlan: plan === "free",
    };
  }, [tenant?.settings]);
}
