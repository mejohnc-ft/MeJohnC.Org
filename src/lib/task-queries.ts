import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, supabase } from "./supabase";
import { handleQueryResult } from "./errors";
import {
  TaskCategorySchema,
  TaskWithCategorySchema,
  TaskCommentSchema,
  TaskReminderSchema,
  parseResponse,
  type TaskCategory,
  type Task,
  type TaskWithCategory,
  type TaskComment,
  type TaskReminder,
  type TaskStats,
} from "./schemas";

// ============================================
// TASK CATEGORIES
// ============================================

export async function getTaskCategories(
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("task_categories")
    .select("*")
    .order("sort_order");

  return handleQueryResult(data, error, {
    operation: "getTaskCategories",
    returnFallback: true,
    fallback: [] as TaskCategory[],
  });
}

export async function getTaskCategoryBySlug(
  slug: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("task_categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return parseResponse(TaskCategorySchema, data, "getTaskCategoryBySlug");
}

export async function getTaskCategoryById(
  id: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("task_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return parseResponse(TaskCategorySchema, data, "getTaskCategoryById");
}

export async function createTaskCategory(
  category: Omit<TaskCategory, "id" | "created_at" | "updated_at">,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("task_categories")
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(TaskCategorySchema, data, "createTaskCategory");
}

export async function updateTaskCategory(
  id: string,
  category: Partial<TaskCategory>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("task_categories")
    .update({ ...category, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(TaskCategorySchema, data, "updateTaskCategory");
}

export async function deleteTaskCategory(
  id: string,
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from("task_categories").delete().eq("id", id);

  if (error) throw error;
}

export async function reorderTaskCategories(
  orderedIds: string[],
  client: SupabaseClient = supabase,
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from("task_categories")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id),
  );

  await Promise.all(updates);
}

// ============================================
// TASKS
// ============================================

export interface TaskQueryOptions {
  categoryId?: string;
  status?: Task["status"];
  priority?: Task["priority"];
  assignedTo?: string;
  isOverdue?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  includeSubtasks?: boolean;
  orderBy?:
    | "sort_order"
    | "created_at"
    | "due_date"
    | "priority"
    | "status"
    | "title";
  orderDirection?: "asc" | "desc";
}

export async function getTasks(
  options: TaskQueryOptions = {},
  client: SupabaseClient = getSupabase(),
) {
  const orderCol = options.orderBy || "sort_order";
  const ascending =
    options.orderDirection === "asc" ||
    (!options.orderDirection && orderCol === "title");

  let query = client
    .from("tasks")
    .select("*, category:task_categories(*)")
    .order(orderCol, { ascending, nullsFirst: false });

  // Apply filters
  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (options.priority) {
    query = query.eq("priority", options.priority);
  }

  if (options.assignedTo) {
    query = query.eq("assigned_to", options.assignedTo);
  }

  if (options.isOverdue !== undefined) {
    query = query.eq("is_overdue", options.isOverdue);
  }

  if (options.dueBefore) {
    query = query.lte("due_date", options.dueBefore);
  }

  if (options.dueAfter) {
    query = query.gte("due_date", options.dueAfter);
  }

  if (!options.includeSubtasks) {
    query = query.is("parent_task_id", null);
  }

  if (options.search) {
    query = query.or(
      `title.ilike.%${options.search}%,description.ilike.%${options.search}%`,
    );
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps("tags", options.tags);
  }

  // Pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1,
    );
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: "getTasks",
    returnFallback: true,
    fallback: [] as TaskWithCategory[],
  });
}

export async function getTaskById(
  id: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("tasks")
    .select("*, category:task_categories(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return parseResponse(TaskWithCategorySchema, data, "getTaskById");
}

export async function getTasksByStatus(
  status: Task["status"],
  client: SupabaseClient = getSupabase(),
) {
  return getTasks({ status }, client);
}

export async function getOverdueTasks(client: SupabaseClient = getSupabase()) {
  return getTasks({ isOverdue: true }, client);
}

export async function getTasksByCategory(
  categoryId: string,
  client: SupabaseClient = getSupabase(),
) {
  return getTasks({ categoryId }, client);
}

export async function getSubtasks(
  parentTaskId: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("tasks")
    .select("*, category:task_categories(*)")
    .eq("parent_task_id", parentTaskId)
    .order("sort_order");

  return handleQueryResult(data, error, {
    operation: "getSubtasks",
    returnFallback: true,
    fallback: [] as TaskWithCategory[],
  });
}

export async function createTask(
  task: Omit<
    Task,
    "id" | "created_at" | "updated_at" | "completed_at" | "is_overdue"
  >,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("tasks")
    .insert(task)
    .select("*, category:task_categories(*)")
    .single();

  if (error) throw error;
  return parseResponse(TaskWithCategorySchema, data, "createTask");
}

export async function updateTask(
  id: string,
  task: Partial<Task>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("tasks")
    .update({ ...task, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, category:task_categories(*)")
    .single();

  if (error) throw error;
  return parseResponse(TaskWithCategorySchema, data, "updateTask");
}

export async function updateTaskStatus(
  id: string,
  status: Task["status"],
  client: SupabaseClient = supabase,
) {
  return updateTask(id, { status }, client);
}

export async function deleteTask(
  id: string,
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from("tasks").delete().eq("id", id);

  if (error) throw error;
}

export async function bulkDeleteTasks(
  ids: string[],
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from("tasks").delete().in("id", ids);

  if (error) throw error;
}

export async function bulkUpdateTaskStatus(
  ids: string[],
  status: Task["status"],
  client: SupabaseClient = supabase,
) {
  const { error } = await client
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw error;
}

export async function reorderTasks(
  orderedIds: string[],
  client: SupabaseClient = supabase,
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from("tasks")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id),
  );

  await Promise.all(updates);
}

// ============================================
// TASK COMMENTS
// ============================================

export async function getTaskComments(
  taskId: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  return handleQueryResult(data, error, {
    operation: "getTaskComments",
    returnFallback: true,
    fallback: [] as TaskComment[],
  });
}

export async function createTaskComment(
  comment: Omit<TaskComment, "id" | "created_at" | "updated_at">,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("task_comments")
    .insert(comment)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(TaskCommentSchema, data, "createTaskComment");
}

export async function updateTaskComment(
  id: string,
  comment: Partial<TaskComment>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("task_comments")
    .update({ ...comment, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(TaskCommentSchema, data, "updateTaskComment");
}

export async function deleteTaskComment(
  id: string,
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from("task_comments").delete().eq("id", id);

  if (error) throw error;
}

// ============================================
// TASK REMINDERS
// ============================================

export async function getTaskReminders(
  taskId: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("task_reminders")
    .select("*")
    .eq("task_id", taskId)
    .order("reminder_at");

  return handleQueryResult(data, error, {
    operation: "getTaskReminders",
    returnFallback: true,
    fallback: [] as TaskReminder[],
  });
}

export async function getPendingReminders(
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("task_reminders")
    .select("*")
    .eq("is_sent", false)
    .lte("reminder_at", new Date().toISOString())
    .order("reminder_at");

  return handleQueryResult(data, error, {
    operation: "getPendingReminders",
    returnFallback: true,
    fallback: [] as TaskReminder[],
  });
}

export async function createTaskReminder(
  reminder: Omit<TaskReminder, "id" | "is_sent" | "sent_at" | "created_at">,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("task_reminders")
    .insert({ ...reminder, is_sent: false })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(TaskReminderSchema, data, "createTaskReminder");
}

export async function markReminderSent(
  id: string,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("task_reminders")
    .update({ is_sent: true, sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(TaskReminderSchema, data, "markReminderSent");
}

export async function deleteTaskReminder(
  id: string,
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from("task_reminders").delete().eq("id", id);

  if (error) throw error;
}

// ============================================
// TASK STATS
// ============================================

export async function getTaskStats(
  client: SupabaseClient = getSupabase(),
): Promise<TaskStats> {
  const [
    totalResult,
    todoResult,
    inProgressResult,
    reviewResult,
    doneResult,
    overdueResult,
    highPriorityResult,
    urgentPriorityResult,
  ] = await Promise.all([
    client.from("tasks").select("id", { count: "exact", head: true }),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "todo"),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "review"),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "done"),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("is_overdue", true),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("priority", "high"),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("priority", "urgent"),
  ]);

  return {
    total_tasks: totalResult.count ?? 0,
    todo_count: todoResult.count ?? 0,
    in_progress_count: inProgressResult.count ?? 0,
    review_count: reviewResult.count ?? 0,
    done_count: doneResult.count ?? 0,
    overdue_count: overdueResult.count ?? 0,
    high_priority_count: highPriorityResult.count ?? 0,
    urgent_priority_count: urgentPriorityResult.count ?? 0,
  };
}
