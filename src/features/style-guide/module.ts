/**
 * Style Guide Feature Module
 *
 * Defines the feature module for the style guide system.
 * This module can be:
 * - Run as part of the main app
 * - Extracted as a standalone product for MSPs/agencies
 * - Integrated into the CentrexAI platform
 *
 * Provides brand management, design token extraction, asset library,
 * and style guideline documentation.
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import type { FeatureModule } from '@/features/types';

/**
 * Style Guide feature module definition
 */
export const styleGuideModule: FeatureModule = {
  name: 'style-guide',
  version: '1.0.0',
  prefix: 'style',

  frontendRoutes: [
    {
      path: '/admin/style',
      component: () => import('./pages/BrandPage'),
      title: 'Style Guide',
      icon: 'palette',
      showInNav: true,
      permissions: ['style:read'],
    },
    {
      path: '/admin/style/colors',
      component: () => import('./pages/ColorsPage'),
      title: 'Colors',
      icon: 'palette',
      showInNav: true,
      permissions: ['style:read'],
    },
    {
      path: '/admin/style/typography',
      component: () => import('./pages/TypographyPage'),
      title: 'Typography',
      icon: 'type',
      showInNav: true,
      permissions: ['style:read'],
    },
    {
      path: '/admin/style/components',
      component: () => import('./pages/ComponentsPage'),
      title: 'Components',
      icon: 'layers',
      showInNav: true,
      permissions: ['style:read'],
    },
  ],

  migrations: {
    prefix: 'style',
    tables: [
      'style_brands',
      'style_colors',
      'style_typography',
      'style_assets',
      'style_guidelines',
    ],
    directory: './migrations',
  },

  services: {
    // Will be populated when service is instantiated
  },

  async initialize() {
    console.log('[StyleGuideModule] Initializing style guide feature');
  },

  async shutdown() {
    console.log('[StyleGuideModule] Shutting down style guide feature');
  },
};
