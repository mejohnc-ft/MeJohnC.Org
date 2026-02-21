/**
 * Features Module
 *
 * Central registry and exports for all feature modules.
 * Features are self-contained units that can be:
 * - Run standalone
 * - Integrated into the platform
 * - Extracted as separate products
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/105
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/106
 */

// Export types
export type {
  FeatureModule,
  FeatureRoute,
  FeatureMigrations,
  FeatureRegistry,
} from "./types";

// Export registry utilities
export { featureRegistry, createFeatureRegistry } from "./types";

// ============================================
// FEATURE MODULES
// ============================================

// Import all feature modules
import { taskModule } from "./tasks";
import { calendarModule } from "./calendar/module";
import { crmModule } from "./crm/module";
import { npsModule } from "./nps/module";
import { newsModule } from "./news/module";
import { metricsModule } from "./metrics/module";
import { styleGuideModule } from "./style-guide/module";
import { generativeUIModule } from "./generative-ui/module";

// Re-export modules for direct access
export { taskModule } from "./tasks";
export { calendarModule } from "./calendar/module";
export { crmModule } from "./crm/module";
export { npsModule } from "./nps/module";
export { newsModule } from "./news/module";
export { metricsModule } from "./metrics/module";
export { styleGuideModule } from "./style-guide/module";
export { generativeUIModule } from "./generative-ui/module";

// ============================================
// FEATURE REGISTRY
// ============================================

import type { FeatureModule } from "./types";

/**
 * All available feature modules
 *
 * Order matters for navigation display
 */
export const allFeatureModules: FeatureModule[] = [
  taskModule,
  calendarModule,
  crmModule,
  npsModule,
  metricsModule,
  styleGuideModule,
  generativeUIModule,
  newsModule,
];

// ============================================
// FEATURE FLAGS
// ============================================

/**
 * Feature flag storage key
 */
const FEATURE_FLAGS_KEY = "bos_feature_flags";

/**
 * Default feature flag states
 */
const DEFAULT_FLAGS: Record<string, boolean> = {
  tasks: true,
  calendar: true,
  crm: true,
  nps: true,
  metrics: true,
  "style-guide": true,
  "generative-ui": true,
  news: true,
};

/**
 * Get current feature flags from localStorage
 */
export function getFeatureFlags(): Record<string, boolean> {
  if (typeof window === "undefined") return DEFAULT_FLAGS;

  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (stored) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_FLAGS;
}

/**
 * Set a feature flag
 */
export function setFeatureFlag(featureName: string, enabled: boolean): void {
  if (typeof window === "undefined") return;

  const flags = getFeatureFlags();
  flags[featureName] = enabled;

  try {
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName: string): boolean {
  const flags = getFeatureFlags();
  return flags[featureName] ?? true;
}

/**
 * Get only enabled feature modules
 */
export function getEnabledModules(): FeatureModule[] {
  return allFeatureModules.filter((module) => isFeatureEnabled(module.name));
}

// ============================================
// ROUTE HELPERS
// ============================================

import type { FeatureRoute } from "./types";

/**
 * Get all routes from enabled feature modules
 */
export function getAllEnabledRoutes(): FeatureRoute[] {
  return getEnabledModules().flatMap((module) => module.frontendRoutes);
}

/**
 * Get navigation items (routes with showInNav: true)
 */
export function getNavigationItems(): FeatureRoute[] {
  return getAllEnabledRoutes().filter((route) => route.showInNav);
}

/**
 * Get routes grouped by module
 */
export function getRoutesByModule(): Map<string, FeatureRoute[]> {
  const routeMap = new Map<string, FeatureRoute[]>();

  for (const module of getEnabledModules()) {
    routeMap.set(module.name, module.frontendRoutes);
  }

  return routeMap;
}

// ============================================
// MODULE LIFECYCLE
// ============================================

/**
 * Initialize all enabled modules
 */
export async function initializeModules(): Promise<void> {
  const modules = getEnabledModules();

  for (const module of modules) {
    if (module.initialize) {
      try {
        await module.initialize();
      } catch (error) {
        console.error(`[Features] Failed to initialize ${module.name}:`, error);
      }
    }
  }

  console.log(
    `[Features] Initialized ${modules.length} modules:`,
    modules.map((m) => m.name).join(", "),
  );
}

/**
 * Shutdown all enabled modules
 */
export async function shutdownModules(): Promise<void> {
  const modules = getEnabledModules();

  for (const module of modules) {
    if (module.shutdown) {
      try {
        await module.shutdown();
      } catch (error) {
        console.error(`[Features] Failed to shutdown ${module.name}:`, error);
      }
    }
  }
}
