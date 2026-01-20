/**
 * Tasks Feature - Schemas
 *
 * Re-exports task-related Zod schemas from the main schemas file.
 * In the future, these will be moved here directly.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/105
 */

// Re-export task schemas from central schemas.ts
// These will eventually be moved here as the primary location
export {
  // Schemas
  TaskCategorySchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskSchema,
  TaskWithCategorySchema,
  TaskCommentSchema,
  TaskReminderTypeSchema,
  TaskReminderSchema,
  TaskStatsSchema,
  // Types
  type TaskCategory,
  type Task,
  type TaskWithCategory,
  type TaskComment,
  type TaskReminder,
  type TaskStats,
} from '@/lib/schemas';
