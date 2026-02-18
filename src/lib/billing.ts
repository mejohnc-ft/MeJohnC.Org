/**
 * Billing plan definitions, limits, and helpers.
 * Issue: #301
 */

export type PlanTier =
  | "free"
  | "starter"
  | "business"
  | "professional"
  | "enterprise";

export interface PlanLimits {
  maxUsers: number;
  maxApps: number;
  maxAiChats: number;
  customSubdomain: boolean;
  customDomain: boolean;
  domainProcurement: boolean;
  dedicatedDb: boolean;
  sla: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxUsers: 1,
    maxApps: 5,
    maxAiChats: 10,
    customSubdomain: false,
    customDomain: false,
    domainProcurement: false,
    dedicatedDb: false,
    sla: false,
  },
  starter: {
    maxUsers: 3,
    maxApps: 10,
    maxAiChats: 100,
    customSubdomain: true,
    customDomain: false,
    domainProcurement: false,
    dedicatedDb: false,
    sla: false,
  },
  business: {
    maxUsers: 10,
    maxApps: 25,
    maxAiChats: 500,
    customSubdomain: true,
    customDomain: true,
    domainProcurement: false,
    dedicatedDb: false,
    sla: false,
  },
  professional: {
    maxUsers: 25,
    maxApps: 27,
    maxAiChats: 2000,
    customSubdomain: true,
    customDomain: true,
    domainProcurement: true,
    dedicatedDb: false,
    sla: false,
  },
  enterprise: {
    maxUsers: Infinity,
    maxApps: Infinity,
    maxAiChats: Infinity,
    customSubdomain: true,
    customDomain: true,
    domainProcurement: true,
    dedicatedDb: true,
    sla: true,
  },
};

/** Ordered from lowest to highest tier */
const PLAN_ORDER: PlanTier[] = [
  "free",
  "starter",
  "business",
  "professional",
  "enterprise",
];

/** Returns true if `current` plan meets or exceeds `minimum` */
export function planMeetsMinimum(
  current: PlanTier,
  minimum: PlanTier,
): boolean {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(minimum);
}

/** Get limits for a plan tier */
export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** Safely parse the plan from tenant settings, defaulting to "free" */
export function parsePlanFromSettings(
  settings: Record<string, unknown> | null | undefined,
): PlanTier {
  const plan = settings?.plan;
  if (typeof plan === "string" && PLAN_ORDER.includes(plan as PlanTier)) {
    return plan as PlanTier;
  }
  return "free";
}

/** Check if subscription is past due from tenant settings */
export function isSubscriptionPastDue(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  return settings?.subscription_status === "past_due";
}
