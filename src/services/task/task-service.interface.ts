/**
 * Task Service Interface
 *
 * Defines the contract for task management operations.
 * Implementations can use Supabase directly or call a REST API.
 */

import {
  type TaskCategory,
  type Task,
  type TaskWithCategory,
  type TaskComment,
  type TaskReminder,
  type TaskStats,
} from '@/lib/schemas';
import { type TaskQueryOptions } from '@/lib/task-queries';
import { BaseService, ServiceContext } from '../types';

export interface ITaskService extends BaseService {
  // ============================================
  // TASK CATEGORIES
  // ============================================

  /** Get all task categories, ordered by sort_order */
  getCategories(ctx: ServiceContext): Promise<TaskCategory[]>;

  /** Get a single category by ID */
  getCategoryById(ctx: ServiceContext, id: string): Promise<TaskCategory>;

  /** Get a single category by slug */
  getCategoryBySlug(ctx: ServiceContext, slug: string): Promise<TaskCategory>;

  /** Create a new task category */
  createCategory(
    ctx: ServiceContext,
    data: Omit<TaskCategory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaskCategory>;

  /** Update an existing task category */
  updateCategory(
    ctx: ServiceContext,
    id: string,
    data: Partial<TaskCategory>
  ): Promise<TaskCategory>;

  /** Delete a task category */
  deleteCategory(ctx: ServiceContext, id: string): Promise<void>;

  /** Reorder task categories */
  reorderCategories(ctx: ServiceContext, orderedIds: string[]): Promise<void>;

  // ============================================
  // TASKS
  // ============================================

  /** Get tasks with optional filtering */
  getTasks(ctx: ServiceContext, options?: TaskQueryOptions): Promise<TaskWithCategory[]>;

  /** Get a single task by ID */
  getTaskById(ctx: ServiceContext, id: string): Promise<TaskWithCategory>;

  /** Get tasks by status */
  getTasksByStatus(ctx: ServiceContext, status: Task['status']): Promise<TaskWithCategory[]>;

  /** Get overdue tasks */
  getOverdueTasks(ctx: ServiceContext): Promise<TaskWithCategory[]>;

  /** Get tasks by category */
  getTasksByCategory(ctx: ServiceContext, categoryId: string): Promise<TaskWithCategory[]>;

  /** Get subtasks of a parent task */
  getSubtasks(ctx: ServiceContext, parentTaskId: string): Promise<TaskWithCategory[]>;

  /** Create a new task */
  createTask(
    ctx: ServiceContext,
    data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'is_overdue'>
  ): Promise<TaskWithCategory>;

  /** Update an existing task */
  updateTask(
    ctx: ServiceContext,
    id: string,
    data: Partial<Task>
  ): Promise<TaskWithCategory>;

  /** Update task status */
  updateTaskStatus(
    ctx: ServiceContext,
    id: string,
    status: Task['status']
  ): Promise<TaskWithCategory>;

  /** Delete a task */
  deleteTask(ctx: ServiceContext, id: string): Promise<void>;

  /** Delete multiple tasks */
  bulkDeleteTasks(ctx: ServiceContext, ids: string[]): Promise<void>;

  /** Update status of multiple tasks */
  bulkUpdateTaskStatus(
    ctx: ServiceContext,
    ids: string[],
    status: Task['status']
  ): Promise<void>;

  /** Reorder tasks */
  reorderTasks(ctx: ServiceContext, orderedIds: string[]): Promise<void>;

  // ============================================
  // TASK COMMENTS
  // ============================================

  /** Get comments for a task */
  getComments(ctx: ServiceContext, taskId: string): Promise<TaskComment[]>;

  /** Create a new comment */
  createComment(
    ctx: ServiceContext,
    data: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaskComment>;

  /** Update a comment */
  updateComment(
    ctx: ServiceContext,
    id: string,
    data: Partial<TaskComment>
  ): Promise<TaskComment>;

  /** Delete a comment */
  deleteComment(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // TASK REMINDERS
  // ============================================

  /** Get reminders for a task */
  getReminders(ctx: ServiceContext, taskId: string): Promise<TaskReminder[]>;

  /** Get all pending reminders */
  getPendingReminders(ctx: ServiceContext): Promise<TaskReminder[]>;

  /** Create a new reminder */
  createReminder(
    ctx: ServiceContext,
    data: Omit<TaskReminder, 'id' | 'is_sent' | 'sent_at' | 'created_at'>
  ): Promise<TaskReminder>;

  /** Mark a reminder as sent */
  markReminderSent(ctx: ServiceContext, id: string): Promise<TaskReminder>;

  /** Delete a reminder */
  deleteReminder(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // STATS
  // ============================================

  /** Get task statistics */
  getStats(ctx: ServiceContext): Promise<TaskStats>;
}
