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
 */

// Export types
export type {
  FeatureModule,
  FeatureRoute,
  FeatureMigrations,
  FeatureRegistry,
} from './types';

// Export registry
export { featureRegistry, createFeatureRegistry } from './types';

// Feature modules
export { taskModule } from './tasks';
// Future modules will be exported here as they are migrated:
// export { crmModule } from './crm';
// export { bookmarksModule } from './bookmarks';
