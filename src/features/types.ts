/**
 * Feature Module Types
 *
 * Defines the interface for feature modules that can be extracted
 * as standalone products or integrated into the platform.
 *
 * @see docs/modular-app-design-spec.md Section 4.1
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/105
 */

import type { ComponentType } from 'react';

/**
 * Route definition for a feature module
 */
export interface FeatureRoute {
  /** Route path (relative to feature prefix) */
  path: string;
  /** Lazy-loaded component */
  component: () => Promise<{ default: ComponentType }>;
  /** Route title for navigation/breadcrumbs */
  title?: string;
  /** Icon name for navigation */
  icon?: string;
  /** Whether this route should appear in navigation */
  showInNav?: boolean;
  /** Required permissions to access this route */
  permissions?: string[];
}

/**
 * Migration configuration for a feature module
 */
export interface FeatureMigrations {
  /** Table name prefix (e.g., 'task' for task_tasks, task_categories) */
  prefix: string;
  /** List of tables managed by this feature */
  tables: string[];
  /** Directory containing migration files (relative to feature) */
  directory?: string;
}

/**
 * Feature module interface
 *
 * Each feature exports a module definition that describes:
 * - Metadata (name, version)
 * - Routes for the frontend
 * - Database migration configuration
 * - Optional hooks for initialization/shutdown
 */
export interface FeatureModule {
  /** Unique feature name (kebab-case) */
  name: string;

  /** SemVer version for API compatibility */
  version: string;

  /** Table/API prefix (lowercase, no hyphens) */
  prefix: string;

  /** Frontend routes for this feature */
  frontendRoutes: FeatureRoute[];

  /** Database migration configuration */
  migrations: FeatureMigrations;

  /** Optional: Services provided by this feature */
  services?: Record<string, unknown>;

  /** Optional: Async initialization hook */
  initialize?: () => Promise<void>;

  /** Optional: Graceful shutdown hook */
  shutdown?: () => Promise<void>;
}

/**
 * Feature registry for managing loaded features
 */
export interface FeatureRegistry {
  /** Get all registered features */
  getFeatures(): FeatureModule[];

  /** Get a feature by name */
  getFeature(name: string): FeatureModule | undefined;

  /** Register a new feature */
  register(module: FeatureModule): void;

  /** Get all routes from all features */
  getAllRoutes(): FeatureRoute[];
}

/**
 * Create a feature registry
 */
export function createFeatureRegistry(): FeatureRegistry {
  const features = new Map<string, FeatureModule>();

  return {
    getFeatures() {
      return Array.from(features.values());
    },

    getFeature(name) {
      return features.get(name);
    },

    register(module) {
      if (features.has(module.name)) {
        console.warn(`Feature "${module.name}" is already registered, overwriting`);
      }
      features.set(module.name, module);
    },

    getAllRoutes() {
      return Array.from(features.values()).flatMap((f) => f.frontendRoutes);
    },
  };
}

/**
 * Global feature registry instance
 */
export const featureRegistry = createFeatureRegistry();
