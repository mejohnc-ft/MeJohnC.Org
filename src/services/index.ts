/**
 * Service Layer - Main Entry Point
 *
 * This module provides a unified interface to all application services.
 * Services abstract the data access layer, enabling:
 * - Clean separation between UI components and data operations
 * - Future extraction of features as standalone products
 * - Easy switching between Supabase (current) and API (future) modes
 *
 * Usage:
 * ```typescript
 * import { getTaskService } from '@/services';
 *
 * const taskService = getTaskService();
 * const tasks = await taskService.getTasks({ client: supabase }, { status: 'todo' });
 * ```
 */

import { ServiceMode } from './types';

// Service implementations
import { ITaskService, taskServiceSupabase } from './task';
import { ICrmService, crmServiceSupabase } from './crm';

// ============================================
// SERVICE MODE CONFIGURATION
// ============================================

let currentMode: ServiceMode = 'supabase';

/**
 * Set the service mode for all services.
 * This affects which implementation is returned by service getters.
 */
export function setServiceMode(mode: ServiceMode): void {
  currentMode = mode;
}

/**
 * Get the current service mode.
 */
export function getServiceMode(): ServiceMode {
  return currentMode;
}

// ============================================
// SERVICE GETTERS
// ============================================

/**
 * Get the task service instance.
 */
export function getTaskService(): ITaskService {
  switch (currentMode) {
    case 'supabase':
      return taskServiceSupabase;
    case 'api':
      throw new Error('API mode not yet implemented for TaskService');
    default:
      return taskServiceSupabase;
  }
}

/**
 * Get the CRM service instance.
 */
export function getCrmService(): ICrmService {
  switch (currentMode) {
    case 'supabase':
      return crmServiceSupabase;
    case 'api':
      throw new Error('API mode not yet implemented for CrmService');
    default:
      return crmServiceSupabase;
  }
}

// ============================================
// RE-EXPORTS
// ============================================

// Core types
export * from './types';

// Service interfaces (for type annotations)
export type { ITaskService } from './task';
export type { ICrmService } from './crm';

// Direct access to implementations (for advanced use cases)
export { taskServiceSupabase } from './task';
export { crmServiceSupabase } from './crm';
