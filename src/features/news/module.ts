/**
 * News Feature Module
 *
 * Defines the feature module for the news aggregation system.
 * This module can be:
 * - Run as part of the main app
 * - Extracted as a standalone product
 * - Integrated into the CentrexAI platform
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/112
 */

import type { FeatureModule } from '@/features/types';

/**
 * News feature module definition
 */
export const newsModule: FeatureModule = {
  name: 'news',
  version: '1.0.0',
  prefix: 'news',

  frontendRoutes: [
    {
      path: '/admin/news',
      component: () => import('./pages/FeedPage'),
      title: 'News Feed',
      icon: 'newspaper',
      showInNav: true,
      permissions: ['news:read'],
    },
    {
      path: '/admin/news/sources',
      component: () => import('./pages/SourcesPage'),
      title: 'News Sources',
      icon: 'rss',
      showInNav: false,
      permissions: ['news:read'],
    },
  ],

  migrations: {
    prefix: 'news',
    tables: ['news_categories', 'news_sources', 'news_articles', 'news_filters', 'news_dashboard_tabs'],
    directory: './migrations',
  },

  services: {
    // Will be populated when service is instantiated
  },

  async initialize() {
    console.log('[NewsModule] Initializing news feature');
  },

  async shutdown() {
    console.log('[NewsModule] Shutting down news feature');
  },
};
