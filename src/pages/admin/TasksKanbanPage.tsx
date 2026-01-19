import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, List, ArrowLeft } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { getTasks, deleteTask, updateTaskStatus } from '@/lib/task-queries';
import { Task, TaskWithCategory } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';

const TasksKanbanPage = () => {
  useSEO({ title: 'Tasks - Kanban View', noIndex: true });
  const navigate = useNavigate();
  const { supabase } = useAuthenticatedSupabase();
  const [tasks, setTasks] = useState<TaskWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function fetchData() {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const tasksData = await getTasks({}, supabase);
      setTasks(tasksData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), { context: 'TasksKanbanPage.fetchData' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleTaskMove = async (taskId: string, newStatus: Task['status']) => {
    if (!supabase) return;

    // Optimistic update
    setTasks(tasks.map((task) =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ));

    try {
      await updateTaskStatus(taskId, newStatus, supabase);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), { context: 'TasksKanbanPage.handleTaskMove' });
      // Revert on error
      fetchData();
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(taskId, supabase);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), { context: 'TasksKanbanPage.handleDelete' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/tasks">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tasks - Kanban View</h1>
              <p className="text-muted-foreground mt-1">
                Drag and drop tasks between columns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/tasks" className="gap-2">
                <List className="w-4 h-4" />
                List View
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

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <KanbanBoard
              tasks={tasks.filter((t) => t.status !== 'cancelled')}
              onTaskMove={handleTaskMove}
              onEdit={(id) => navigate(`/admin/tasks/${id}/edit`)}
              onDelete={handleDelete}
            />
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TasksKanbanPage;
