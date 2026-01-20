/**
 * Tasks Feature Module
 *
 * Public API for the tasks feature.
 * This module provides task management functionality including:
 * - Task CRUD operations
 * - Categories
 * - Comments
 * - Reminders
 * - Kanban board visualization
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/105
 */

// Module definition
export { taskModule } from './module';

// Components
export {
  TaskCard,
  TaskForm,
  SortableTaskCard,
  KanbanColumn,
  KanbanBoard,
} from './components';

// Pages (lazy-loaded, so also available via module.frontendRoutes)
export {
  TasksPage,
  TasksKanbanPage,
  TaskEditPage,
} from './pages';

// Schemas (re-exported from central schemas for convenience)
export {
  TaskCategorySchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskSchema,
  TaskWithCategorySchema,
  TaskCommentSchema,
  TaskReminderTypeSchema,
  TaskReminderSchema,
  TaskStatsSchema,
  type TaskCategory,
  type Task,
  type TaskWithCategory,
  type TaskComment,
  type TaskReminder,
  type TaskStats,
} from './schemas';
