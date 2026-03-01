/**
 * Feature Flags for Safe Rollouts
 *
 * Provides feature flag management with:
 * - Environment-based flags
 * - User-based targeting
 * - Percentage rollouts
 * - A/B testing support
 */

import { supabase } from "./supabase";

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  /** Unique flag name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Whether flag is enabled globally */
  enabled: boolean;
  /** Percentage of users to enable for (0-100) */
  rolloutPercentage?: number;
  /** Specific user IDs to always enable for */
  enabledUsers?: string[];
  /** Specific user IDs to always disable for */
  disabledUsers?: string[];
  /** Environment restrictions */
  environments?: ("development" | "staging" | "production")[];
  /** Expiration date for temporary flags */
  expiresAt?: string;
  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Feature flag evaluation context
 */
export interface EvaluationContext {
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  environment?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Default feature flags
 * These can be overridden by database values
 */
const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  // UI Features
  "ui.dark-mode": {
    name: "ui.dark-mode",
    description: "Enable dark mode toggle",
    enabled: true,
  },
  "ui.new-dashboard": {
    name: "ui.new-dashboard",
    description: "New admin dashboard design",
    enabled: false,
    rolloutPercentage: 10,
    environments: ["development", "staging"],
  },

  // API Features
  "api.v2": {
    name: "api.v2",
    description: "Enable API v2 endpoints",
    enabled: false,
    environments: ["development"],
  },
  "api.rate-limiting": {
    name: "api.rate-limiting",
    description: "Enable API rate limiting",
    enabled: true,
  },

  // Marketing Features
  "marketing.email-campaigns": {
    name: "marketing.email-campaigns",
    description: "Email campaign functionality",
    enabled: true,
  },
  "marketing.nps-surveys": {
    name: "marketing.nps-surveys",
    description: "NPS survey functionality",
    enabled: true,
  },

  // Site Builder Features
  "site-builder.ai-content": {
    name: "site-builder.ai-content",
    description: "AI-powered content generation",
    enabled: false,
    rolloutPercentage: 25,
  },
  "site-builder.version-history": {
    name: "site-builder.version-history",
    description: "Page version history and rollback",
    enabled: true,
  },

  // Task System Features
  "tasks.kanban-view": {
    name: "tasks.kanban-view",
    description: "Kanban board view for tasks",
    enabled: true,
  },
  "tasks.reminders": {
    name: "tasks.reminders",
    description: "Task reminder notifications",
    enabled: false,
    environments: ["development", "staging"],
  },

  // Infrastructure Features
  "infra.structured-logging": {
    name: "infra.structured-logging",
    description: "Enable structured JSON logging",
    enabled: true,
  },
  "infra.circuit-breaker": {
    name: "infra.circuit-breaker",
    description: "Enable circuit breaker for external calls",
    enabled: true,
  },

  // Desktop OS Mode
  "desktop.os-mode": {
    name: "desktop.os-mode",
    description: "macOS-inspired desktop mode for admin panel",
    enabled: false,
    environments: ["development", "staging"],
  },
};

/**
 * Hash a string to a number (for consistent percentage rollouts)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get percentage bucket for a user (0-99)
 */
function getUserBucket(userId: string, flagName: string): number {
  const hash = hashString(`${flagName}:${userId}`);
  return hash % 100;
}

/**
 * Get current environment
 */
function getCurrentEnvironment(): "development" | "staging" | "production" {
  if (typeof import.meta !== "undefined") {
    if (import.meta.env.DEV) return "development";
    if (import.meta.env.MODE === "staging") return "staging";
  }
  return "production";
}

/**
 * Feature flag manager class
 */
class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private overrides: Map<string, boolean> = new Map();
  private initialized = false;
  private tenantId: string | null = null;

  constructor() {
    // Load default flags
    for (const [name, flag] of Object.entries(DEFAULT_FLAGS)) {
      this.flags.set(name, flag);
    }
  }

  /** Storage key namespaced by tenant */
  private get overrideStorageKey(): string {
    return this.tenantId
      ? `${this.tenantId}_feature_flag_overrides`
      : "feature_flag_overrides";
  }

  /**
   * Initialize flags from database, scoped to a tenant.
   * @param tenantId - If provided, only loads flags for this tenant (plus global flags).
   */
  async initialize(tenantId?: string | null): Promise<void> {
    if (this.initialized && this.tenantId === (tenantId ?? null)) return;

    this.tenantId = tenantId ?? null;

    try {
      let query = supabase
        .from("feature_flags")
        .select("*")
        .eq("is_active", true);

      // Scope to tenant: load global flags (no tenant_id) + tenant-specific flags
      if (this.tenantId) {
        query = query.or(`tenant_id.is.null,tenant_id.eq.${this.tenantId}`);
      }

      const { data, error } = await query;

      if (!error && data) {
        for (const row of data) {
          this.flags.set(row.name, {
            name: row.name,
            description: row.description,
            enabled: row.enabled,
            rolloutPercentage: row.rollout_percentage,
            enabledUsers: row.enabled_users,
            disabledUsers: row.disabled_users,
            environments: row.environments,
            expiresAt: row.expires_at,
            metadata: row.metadata,
          });
        }
      }
    } catch {
      // Silently fail - use default flags
      console.warn(
        "[FeatureFlags] Failed to load from database, using defaults",
      );
    }

    // Load local overrides from localStorage (development only)
    if (
      typeof localStorage !== "undefined" &&
      getCurrentEnvironment() === "development"
    ) {
      const stored = localStorage.getItem(this.overrideStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          for (const [name, value] of Object.entries(parsed)) {
            this.overrides.set(name, value as boolean);
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagName: string, context?: EvaluationContext): boolean {
    // Check local overrides first
    if (this.overrides.has(flagName)) {
      return this.overrides.get(flagName)!;
    }

    const flag = this.flags.get(flagName);
    if (!flag) {
      return false; // Unknown flag = disabled
    }

    // Check expiration
    if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
      return false;
    }

    // Check environment
    if (flag.environments && flag.environments.length > 0) {
      const currentEnv = context?.environment || getCurrentEnvironment();
      if (
        !flag.environments.includes(
          currentEnv as "development" | "staging" | "production",
        )
      ) {
        return false;
      }
    }

    // Check user-specific disabling
    if (context?.userId && flag.disabledUsers?.includes(context.userId)) {
      return false;
    }

    // Check user-specific enabling
    if (context?.userId && flag.enabledUsers?.includes(context.userId)) {
      return true;
    }

    // Check percentage rollout
    if (flag.rolloutPercentage !== undefined && context?.userId) {
      const bucket = getUserBucket(context.userId, flagName);
      if (bucket >= flag.rolloutPercentage) {
        return false;
      }
    }

    return flag.enabled;
  }

  /**
   * Get all flags (for admin UI)
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flag by name
   */
  getFlag(name: string): FeatureFlag | undefined {
    return this.flags.get(name);
  }

  /**
   * Set a local override (development only)
   */
  setOverride(flagName: string, enabled: boolean): void {
    this.overrides.set(flagName, enabled);
    this.persistOverrides();
  }

  /**
   * Clear a local override
   */
  clearOverride(flagName: string): void {
    this.overrides.delete(flagName);
    this.persistOverrides();
  }

  /**
   * Clear all local overrides
   */
  clearAllOverrides(): void {
    this.overrides.clear();
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.overrideStorageKey);
    }
  }

  private persistOverrides(): void {
    if (typeof localStorage !== "undefined") {
      const overrides: Record<string, boolean> = {};
      this.overrides.forEach((value, key) => {
        overrides[key] = value;
      });
      localStorage.setItem(this.overrideStorageKey, JSON.stringify(overrides));
    }
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagManager();

/**
 * Hook-like function to check feature flag
 * (Can be used in React components or regular functions)
 */
export function isFeatureEnabled(
  flagName: string,
  context?: EvaluationContext,
): boolean {
  return featureFlags.isEnabled(flagName, context);
}

/**
 * Initialize feature flags (call at app startup)
 */
export async function initFeatureFlags(
  tenantId?: string | null,
): Promise<void> {
  await featureFlags.initialize(tenantId);
}

/**
 * Get feature flag value with default
 */
export function getFeatureValue<T>(
  flagName: string,
  defaultValue: T,
  context?: EvaluationContext,
): T {
  const flag = featureFlags.getFlag(flagName);
  if (!flag) return defaultValue;

  if (!featureFlags.isEnabled(flagName, context)) {
    return defaultValue;
  }

  // Return metadata value if available, otherwise default
  return (flag.metadata?.value as T) ?? defaultValue;
}
