import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Field, Input, Textarea } from '@/components/admin/EditorPanel';
import { Button } from '@/components/ui/button';
import { useSupabaseClient } from '@/lib/supabase';
import {
  createAppSuite,
  updateAppSuite,
  generateSlug,
  type AppSuite
} from '@/lib/supabase-queries';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';

type SuiteFormData = Omit<AppSuite, 'id' | 'created_at' | 'updated_at'>;

const initialFormData: SuiteFormData = {
  name: '',
  slug: '',
  description: '',
  order_index: 0,
};

const SuiteEditor = () => {
  useSEO({ title: 'Edit App Suite', noIndex: true });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const supabase = useSupabaseClient();

  const [formData, setFormData] = useState<SuiteFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchSuite = useCallback(async (suiteId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('app_suites')
        .select('*')
        .eq('id', suiteId)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        order_index: data.order_index,
      });
      setAutoSlug(false);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'SuiteEditor.fetchSuite' });
      setError('Suite not found');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (id) {
      fetchSuite(id);
    }
  }, [id, fetchSuite]);

  // Auto-generate slug from name
  useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(formData.name),
      }));
    }
  }, [formData.name, autoSlug]);

  async function handleSave() {
    if (!supabase) {
      setError('Database not configured');
      return;
    }
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.slug.trim()) {
      setError('Slug is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      if (isEditing && id) {
        await updateAppSuite(id, formData, supabase);
      } else {
        await createAppSuite(formData, supabase);
      }
      navigate('/admin/apps');
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'SuiteEditor.saveSuite' });
      setError('Failed to save suite. Make sure you have permission.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof SuiteFormData>(
    key: K,
    value: SuiteFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/admin/apps"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Apps</span>
          </Link>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Suite
          </Button>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Edit Suite' : 'New Suite'}
          </h1>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
            >
              {error}
            </motion.div>
          )}

          <Field label="Name">
            <Input
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Suite name"
            />
          </Field>

          <Field label="Slug" description="URL-friendly version of the name">
            <Input
              value={formData.slug}
              onChange={(e) => {
                setAutoSlug(false);
                updateField('slug', e.target.value);
              }}
              placeholder="suite-slug"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of this suite..."
              rows={3}
            />
          </Field>

          <Field label="Order" description="Lower numbers appear first">
            <Input
              type="number"
              value={formData.order_index}
              onChange={(e) => updateField('order_index', parseInt(e.target.value) || 0)}
            />
          </Field>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SuiteEditor;
