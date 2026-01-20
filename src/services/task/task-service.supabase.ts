/**
 * Task Service - Supabase Implementation
 *
 * Implements ITaskService using direct Supabase client access.
 * Delegates to task-queries.ts for actual database operations.
 */

import { ITaskService } from './task-service.interface';
import { ServiceContext } from '../types';
import { getSupabase } from '@/lib/supabase';
import * as taskQueries from '@/lib/task-queries';
import {
  type TaskCategory,
  type Task,
  type TaskWithCategory,
  type TaskComment,
  type TaskReminder,
  type TaskStats,
} from '@/lib/schemas';
import { type TaskQueryOptions } from '@/lib/task-queries';

/**
 * Get Supabase client from context, falling back to default.
 */
function getClient(ctx: ServiceContext) {
  return ctx.client ?? getSupabase();
}

export class TaskServiceSupabase implements ITaskService {
  readonly serviceName = 'TaskService';

  // ============================================
  // TASK CATEGORIES
  // ============================================

  async getCategories(ctx: ServiceContext): Promise<TaskCategory[]> {
    return taskQueries.getTaskCategories(getClient(ctx));
  }

  async getCategoryById(ctx: ServiceContext, id: string): Promise<TaskCategory> {
    return taskQueries.getTaskCategoryById(id, getClient(ctx));
  }

  async getCategoryBySlug(ctx: ServiceContext, slug: string): Promise<TaskCategory> {
    return taskQueries.getTaskCategoryBySlug(slug, getClient(ctx));
  }

  async createCategory(
    ctx: ServiceContext,
    data: Omit<TaskCategory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaskCategory> {
    return taskQueries.createTaskCategory(data, getClient(ctx));
  }

  async updateCategory(
    ctx: ServiceContext,
    id: string,
    data: Partial<TaskCategory>
  ): Promise<TaskCategory> {
    return taskQueries.updateTaskCategory(id, data, getClient(ctx));
  }

  async deleteCategory(ctx: ServiceContext, id: string): Promise<void> {
    return taskQueries.deleteTaskCategory(id, getClient(ctx));
  }

  async reorderCategories(ctx: ServiceContext, orderedIds: string[]): Promise<void> {
    return taskQueries.reorderTaskCategories(orderedIds, getClient(ctx));
  }

  // ============================================
  // TASKS
  // ============================================

  async getTasks(ctx: ServiceContext, options?: TaskQueryOptions): Promise<TaskWithCategory[]> {
    return taskQueries.getTasks(options, getClient(ctx));
  }

  async getTaskById(ctx: ServiceContext, id: string): Promise<TaskWithCategory> {
    return taskQueries.getTaskById(id, getClient(ctx));
  }

  async getTasksByStatus(ctx: ServiceContext, status: Task['status']): Promise<TaskWithCategory[]> {
    return taskQueries.getTasksByStatus(status, getClient(ctx));
  }

  async getOverdueTasks(ctx: ServiceContext): Promise<TaskWithCategory[]> {
    return taskQueries.getOverdueTasks(getClient(ctx));
  }

  async getTasksByCategory(ctx: ServiceContext, categoryId: string): Promise<TaskWithCategory[]> {
    return taskQueries.getTasksByCategory(categoryId, getClient(ctx));
  }

  async getSubtasks(ctx: ServiceContext, parentTaskId: string): Promise<TaskWithCategory[]> {
    return taskQueries.getSubtasks(parentTaskId, getClient(ctx));
  }

  async createTask(
    ctx: ServiceContext,
    data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'is_overdue'>
  ): Promise<TaskWithCategory> {
    return taskQueries.createTask(data, getClient(ctx));
  }

  async updateTask(
    ctx: ServiceContext,
    id: string,
    data: Partial<Task>
  ): Promise<TaskWithCategory> {
    return taskQueries.updateTask(id, data, getClient(ctx));
  }

  async updateTaskStatus(
    ctx: ServiceContext,
    id: string,
    status: Task['status']
  ): Promise<TaskWithCategory> {
    return taskQueries.updateTaskStatus(id, status, getClient(ctx));
  }

  async deleteTask(ctx: ServiceContext, id: string): Promise<void> {
    return taskQueries.deleteTask(id, getClient(ctx));
  }

  async bulkDeleteTasks(ctx: ServiceContext, ids: string[]): Promise<void> {
    return taskQueries.bulkDeleteTasks(ids, getClient(ctx));
  }

  async bulkUpdateTaskStatus(
    ctx: ServiceContext,
    ids: string[],
    status: Task['status']
  ): Promise<void> {
    return taskQueries.bulkUpdateTaskStatus(ids, status, getClient(ctx));
  }

  async reorderTasks(ctx: ServiceContext, orderedIds: string[]): Promise<void> {
    return taskQueries.reorderTasks(orderedIds, getClient(ctx));
  }

  // ============================================
  // TASK COMMENTS
  // ============================================

  async getComments(ctx: ServiceContext, taskId: string): Promise<TaskComment[]> {
    return taskQueries.getTaskComments(taskId, getClient(ctx));
  }

  async createComment(
    ctx: ServiceContext,
    data: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaskComment> {
    return taskQueries.createTaskComment(data, getClient(ctx));
  }

  async updateComment(
    ctx: ServiceContext,
    id: string,
    data: Partial<TaskComment>
  ): Promise<TaskComment> {
    return taskQueries.updateTaskComment(id, data, getClient(ctx));
  }

  async deleteComment(ctx: ServiceContext, id: string): Promise<void> {
    return taskQueries.deleteTaskComment(id, getClient(ctx));
  }

  // ============================================
  // TASK REMINDERS
  // ============================================

  async getReminders(ctx: ServiceContext, taskId: string): Promise<TaskReminder[]> {
    return taskQueries.getTaskReminders(taskId, getClient(ctx));
  }

  async getPendingReminders(ctx: ServiceContext): Promise<TaskReminder[]> {
    return taskQueries.getPendingReminders(getClient(ctx));
  }

  async createReminder(
    ctx: ServiceContext,
    data: Omit<TaskReminder, 'id' | 'is_sent' | 'sent_at' | 'created_at'>
  ): Promise<TaskReminder> {
    return taskQueries.createTaskReminder(data, getClient(ctx));
  }

  async markReminderSent(ctx: ServiceContext, id: string): Promise<TaskReminder> {
    return taskQueries.markReminderSent(id, getClient(ctx));
  }

  async deleteReminder(ctx: ServiceContext, id: string): Promise<void> {
    return taskQueries.deleteTaskReminder(id, getClient(ctx));
  }

  // ============================================
  // STATS
  // ============================================

  async getStats(ctx: ServiceContext): Promise<TaskStats> {
    return taskQueries.getTaskStats(getClient(ctx));
  }
}

// Singleton instance
export const taskServiceSupabase = new TaskServiceSupabase();
