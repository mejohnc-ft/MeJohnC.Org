/**
 * Tasks Feature Module
 *
 * Defines the feature module for the tasks system.
 * This module can be:
 * - Run as part of the main app
 * - Extracted as a standalone product
 * - Integrated into the CentrexAI platform
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/105
 */

import type { FeatureModule } from '@/features/types';

/**
 * Tasks feature module definition
 */
export const taskModule: FeatureModule = {
  name: 'tasks',
  version: '1.0.0',
  prefix: 'task',

  frontendRoutes: [
    {
      path: '/admin/tasks',
      component: () => import('./pages/TasksPage'),
      title: 'Tasks',
      icon: 'list-todo',
      showInNav: true,
      permissions: ['task:read'],
    },
    {
      path: '/admin/tasks/kanban',
      component: () => import('./pages/TasksKanbanPage'),
      title: 'Kanban Board',
      icon: 'kanban',
      showInNav: true,
      permissions: ['task:read'],
    },
    {
      path: '/admin/tasks/new',
      component: () => import('./pages/TaskEditPage'),
      title: 'New Task',
      permissions: ['task:write'],
    },
    {
      path: '/admin/tasks/:id',
      component: () => import('./pages/TaskEditPage'),
      title: 'Task Details',
      permissions: ['task:read'],
    },
    {
      path: '/admin/tasks/:id/edit',
      component: () => import('./pages/TaskEditPage'),
      title: 'Edit Task',
      permissions: ['task:write'],
    },
  ],

  migrations: {
    prefix: 'task',
    tables: ['task_categories', 'tasks', 'task_comments', 'task_reminders'],
    directory: './migrations',
  },

  services: {
    // Will be populated when service is instantiated
  },

  async initialize() {
    console.log('[TaskModule] Initializing tasks feature');
  },

  async shutdown() {
    console.log('[TaskModule] Shutting down tasks feature');
  },
};
