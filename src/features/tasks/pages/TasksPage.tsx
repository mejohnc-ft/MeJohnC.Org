import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, ListTodo, Kanban, ArrowUpDown } from "lucide-react";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import {
  getTasks,
  getTaskCategories,
  deleteTask,
  bulkDeleteTasks,
  getTaskStats,
} from "@/lib/task-queries";
import { Task, TaskCategory, TaskWithCategory, TaskStats } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/AdminLayout";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import { TaskCard } from "../components";

const TasksPage = () => {
  useSEO({ title: "Tasks", noIndex: true });
  const navigate = useNavigate();
  const { supabase } = useAuthenticatedSupabase();
  const [tasks, setTasks] = useState<TaskWithCategory[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Task["status"] | "">("");
  const [selectedPriority, setSelectedPriority] = useState<
    Task["priority"] | ""
  >("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<
    "sort_order" | "created_at" | "due_date" | "priority" | "status" | "title"
  >("sort_order");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    supabase,
    selectedCategory,
    selectedStatus,
    selectedPriority,
    showOverdueOnly,
    searchQuery,
    sortBy,
  ]);

  async function fetchData() {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const [tasksData, categoriesData, statsData] = await Promise.all([
        getTasks(
          {
            categoryId: selectedCategory || undefined,
            status: selectedStatus || undefined,
            priority: selectedPriority || undefined,
            isOverdue: showOverdueOnly || undefined,
            search: searchQuery || undefined,
            orderBy: sortBy,
          },
          supabase,
        ),
        getTaskCategories(supabase),
        getTaskStats(supabase),
      ]);

      setTasks(tasksData);
      setCategories(categoriesData);
      setStats(statsData);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "TasksPage.fetchData" },
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!supabase || !confirm("Are you sure you want to delete this task?"))
      return;

    try {
      await deleteTask(taskId, supabase);
      setTasks(tasks.filter((t) => t.id !== taskId));
      setSelectedTasks(selectedTasks.filter((id) => id !== taskId));
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "TasksPage.handleDelete" },
      );
    }
  };

  const handleBulkDelete = async () => {
    if (
      !supabase ||
      selectedTasks.length === 0 ||
      !confirm(`Delete ${selectedTasks.length} tasks?`)
    )
      return;

    try {
      await bulkDeleteTasks(selectedTasks, supabase);
      setTasks(tasks.filter((t) => !selectedTasks.includes(t.id)));
      setSelectedTasks([]);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "TasksPage.handleBulkDelete" },
      );
    }
  };

  const handleToggleSelect = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Manage your tasks and projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/tasks/kanban" className="gap-2">
                <Kanban className="w-4 h-4" />
                Kanban View
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/tasks/new" className="gap-2">
                <Plus className="w-4 h-4" />
                New Task
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-card border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.total_tasks}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-4 bg-card border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">To Do</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.todo_count}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-card border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.in_progress_count}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-4 bg-card border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">Review</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.review_count}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-card border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">Done</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.done_count}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 bg-card border border-red-500/20 rounded-lg"
            >
              <p className="text-sm text-red-600 dark:text-red-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.overdue_count}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 bg-card border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.high_priority_count}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-4 bg-card border border-red-500/20 rounded-lg"
            >
              <p className="text-sm text-red-600 dark:text-red-400">Urgent</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.urgent_priority_count}
              </p>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as Task["status"] | "")
              }
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Priority */}
            <select
              value={selectedPriority}
              onChange={(e) =>
                setSelectedPriority(e.target.value as Task["priority"] | "")
              }
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
                className="rounded border-input"
              />
              Show overdue only
            </label>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-2 py-1 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="sort_order">Default</option>
                <option value="created_at">Created Date</option>
                <option value="due_date">Due Date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="title">Title</option>
              </select>
            </div>

            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">
                  {selectedTasks.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No tasks found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ||
              selectedCategory ||
              selectedStatus ||
              selectedPriority
                ? "Try adjusting your filters"
                : "Create your first task to get started"}
            </p>
            <Button asChild>
              <Link to="/admin/tasks/new">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <div key={task.id} className="relative">
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.id)}
                  onChange={() => handleToggleSelect(task.id)}
                  className="absolute top-2 left-2 z-10 rounded border-input"
                />
                <TaskCard
                  task={task}
                  onEdit={(id) => navigate(`/admin/tasks/${id}/edit`)}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TasksPage;
