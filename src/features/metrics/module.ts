/**
 * Metrics Feature Module
 *
 * Defines the feature module for the metrics dashboard system.
 * This module can be:
 * - Run as part of the main app
 * - Extracted as a standalone product
 * - Integrated into the CentrexAI platform
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/109
 */

import type { FeatureModule } from '@/features/types';

/**
 * Metrics feature module definition
 */
export const metricsModule: FeatureModule = {
  name: 'metrics',
  version: '1.0.0',
  prefix: 'metrics',

  frontendRoutes: [
    {
      path: '/admin/metrics',
      component: () => import('./pages/DashboardPage'),
      title: 'Metrics Dashboard',
      icon: 'bar-chart-3',
      showInNav: true,
      permissions: ['metrics:read'],
    },
    {
      path: '/admin/metrics/sources',
      component: () => import('./pages/SourcesPage'),
      title: 'Data Sources',
      icon: 'database',
      showInNav: true,
      permissions: ['metrics:read'],
    },
  ],

  migrations: {
    prefix: 'metrics',
    tables: [
      'metrics_sources',
      'metrics_data',
      'metrics_dashboards',
      'metrics_widgets',
      'metrics_snapshots',
      'metrics_alerts',
    ],
    directory: './migrations',
  },

  services: {
    // Will be populated when service is instantiated
  },

  async initialize() {
    console.log('[MetricsModule] Initializing metrics dashboard feature');
  },

  async shutdown() {
    console.log('[MetricsModule] Shutting down metrics dashboard feature');
  },
};
