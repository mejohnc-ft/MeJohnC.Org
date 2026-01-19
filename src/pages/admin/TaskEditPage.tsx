import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { getTaskById, getTaskCategories, createTask, updateTask } from '@/lib/task-queries';
import { Task, TaskCategory } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { TaskForm } from '@/components/tasks/TaskForm';

const TaskEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useAuthenticatedSupabase();
  const isNew = !id || id === 'new';

  useSEO({ title: isNew ? 'New Task' : 'Edit Task', noIndex: true });

  const [task, setTask] = useState<Task | undefined>(undefined);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, id]);

  async function fetchData() {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const categoriesData = await getTaskCategories(supabase);
      setCategories(categoriesData);

      if (!isNew && id) {
        const taskData = await getTaskById(id, supabase);
        setTask(taskData);
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), { context: 'TaskEditPage.fetchData' });
      navigate('/admin/tasks');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (data: Partial<Task>) => {
    if (!supabase) return;

    try {
      if (isNew) {
        await createTask(data as Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'is_overdue'>, supabase);
      } else if (id) {
        await updateTask(id, data, supabase);
      }
      navigate('/admin/tasks');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), { context: 'TaskEditPage.handleSubmit' });
      alert('Failed to save task. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate('/admin/tasks');
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/tasks">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isNew ? 'New Task' : 'Edit Task'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNew ? 'Create a new task' : 'Update task details'}
            </p>
          </div>
        </div>

        {/* Form */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-lg p-6"
          >
            <TaskForm
              task={task}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TaskEditPage;
