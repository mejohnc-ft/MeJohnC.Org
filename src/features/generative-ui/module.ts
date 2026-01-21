/**
 * Generative UI Feature Module
 *
 * Defines the feature module for AI-powered UI generation.
 * Combines json-render patterns with CentrexStyle components
 * to enable natural language UI creation.
 *
 * @see https://json-render.dev/
 * @see docs/centrexstyle-demo.html
 */

import type { FeatureModule } from '@/features/types';

/**
 * Generative UI feature module definition
 */
export const generativeUIModule: FeatureModule = {
  name: 'generative-ui',
  version: '1.0.0',
  prefix: 'genui',

  frontendRoutes: [
    {
      path: '/admin/generative',
      component: () => import('./pages/GenerativePage'),
      title: 'Generative UI',
      icon: 'sparkles',
      showInNav: true,
      permissions: ['genui:read'],
    },
    {
      path: '/admin/generative/library',
      component: () => import('./pages/ComponentLibraryPage'),
      title: 'Component Library',
      icon: 'layers',
      showInNav: true,
      permissions: ['genui:read'],
    },
    {
      path: '/admin/generative/saved',
      component: () => import('./pages/SavedPanelsPage'),
      title: 'Saved Panels',
      icon: 'bookmark',
      showInNav: true,
      permissions: ['genui:read'],
    },
  ],

  migrations: {
    prefix: 'genui',
    tables: [
      'genui_panels',
      'genui_templates',
      'genui_generations',
    ],
    directory: './migrations',
  },

  services: {
    // Will be populated when service is instantiated
  },

  async initialize() {
    console.log('[GenerativeUIModule] Initializing generative UI feature');
  },

  async shutdown() {
    console.log('[GenerativeUIModule] Shutting down generative UI feature');
  },
};
