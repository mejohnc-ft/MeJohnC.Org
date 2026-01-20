/**
 * CRM Feature Module
 *
 * Defines the feature module for the CRM system.
 * This module can be:
 * - Run as part of the main app
 * - Extracted as a standalone product
 * - Integrated into the CentrexAI platform
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/108
 */

import type { FeatureModule } from '@/features/types';

/**
 * CRM feature module definition
 */
export const crmModule: FeatureModule = {
  name: 'crm',
  version: '1.0.0',
  prefix: 'crm',

  frontendRoutes: [
    {
      path: '/admin/crm',
      component: () => import('./pages/ContactsPage'),
      title: 'CRM',
      icon: 'users',
      showInNav: true,
      permissions: ['crm:read'],
    },
    {
      path: '/admin/crm/contacts',
      component: () => import('./pages/ContactsPage'),
      title: 'Contacts',
      icon: 'user',
      showInNav: true,
      permissions: ['crm:read'],
    },
    {
      path: '/admin/crm/contacts/:id',
      component: () => import('./pages/ContactDetailPage'),
      title: 'Contact Details',
      permissions: ['crm:read'],
    },
    {
      path: '/admin/crm/deals',
      component: () => import('./pages/DealsPage'),
      title: 'Deals',
      icon: 'dollar-sign',
      showInNav: true,
      permissions: ['crm:read'],
    },
    {
      path: '/admin/crm/pipeline',
      component: () => import('./pages/PipelinePage'),
      title: 'Pipeline',
      icon: 'git-branch',
      showInNav: true,
      permissions: ['crm:read'],
    },
  ],

  migrations: {
    prefix: 'crm',
    tables: [
      'contacts',
      'interactions',
      'follow_ups',
      'contact_lists',
      'contact_list_members',
      'pipelines',
      'pipeline_stages',
      'deals',
    ],
    directory: './migrations',
  },

  services: {
    // Will be populated when service is instantiated
  },

  async initialize() {
    console.log('[CrmModule] Initializing CRM feature');
  },

  async shutdown() {
    console.log('[CrmModule] Shutting down CRM feature');
  },
};
