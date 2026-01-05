import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2, Send, Search } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import EditorPanel, { Field, Input, Select, TagInput, Textarea } from '@/components/admin/EditorPanel';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUploader from '@/components/admin/ImageUploader';
import VersionHistory from '@/components/admin/VersionHistory';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getAppSuites,
  getAppById,
  createApp,
  updateApp,
  generateSlug,
  type App,
  type AppSuite
} from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';
import { useSEO } from '@/lib/seo';

type AppFormData = Omit<App, 'id' | 'created_at' | 'updated_at' | 'suite'>;

const initialFormData: AppFormData = {
  suite_id: null,
  name: '',
  slug: '',
  tagline: '',
  description: '',
  icon_url: '',
  external_url: '',
  demo_url: '',
  tech_stack: [],
  status: 'planned',
  order_index: 0,
  meta_title: null,
  meta_description: null,
  og_image: null,
};

const AppEditor = () => {
  useSEO({ title: 'App Editor', noIndex: true });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { supabase } = useAuthenticatedSupabase();

  const [formData, setFormData] = useState<AppFormData>(initialFormData);
  const [suites, setSuites] = useState<AppSuite[]>([]);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchSuites = useCallback(async () => {
    if (!supabase) return;
    try {
      const data = await getAppSuites(supabase);
      setSuites(data);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AppEditor.fetchSuites' });
    }
  }, [supabase]);

  const fetchApp = useCallback(async (appId: string) => {
    if (!supabase) return;
    try {
      const data = await getAppById(appId, supabase);
      setFormData({
        suite_id: data.suite_id,
        name: data.name,
        slug: data.slug,
        tagline: data.tagline || '',
        description: data.description || '',
        icon_url: data.icon_url || '',
        external_url: data.external_url || '',
        demo_url: data.demo_url || '',
        tech_stack: data.tech_stack || [],
        status: data.status,
        order_index: data.order_index,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        og_image: data.og_image,
      });
      setAutoSlug(false);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AppEditor.fetchApp' });
      setError('App not found');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const handleVersionRestore = useCallback(() => {
    if (id) {
      fetchApp(id);
    }
  }, [id, fetchApp]);

  useEffect(() => {
    fetchSuites();
    if (id) {
      fetchApp(id);
    }
  }, [id, fetchSuites, fetchApp]);

  useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(formData.name),
      }));
    }
  }, [formData.name, autoSlug]);

  async function handleSave(makeAvailable = false) {
    if (!supabase) {
      setError('Database not configured');
      return;
    }
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const dataToSave = {
        ...formData,
        status: makeAvailable ? 'available' : formData.status,
      } as AppFormData;

      if (isEditing && id) {
        await updateApp(id, dataToSave, supabase);
      } else {
        const newApp = await createApp(dataToSave, supabase);
        navigate(`/admin/apps/${newApp.id}/edit`, { replace: true });
      }

      if (makeAvailable) {
        setFormData((prev) => ({
          ...prev,
          status: 'available',
        }));
      }
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AppEditor.saveApp' });
      setError('Failed to save app. Make sure you have permission.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof AppFormData>(
    key: K,
    value: AppFormData[K]
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
      <div className="flex h-[calc(100vh-4rem)] -m-8">
        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-border">
            <Link
              to="/admin/apps"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Apps</span>
            </Link>

            <div className="flex items-center gap-2">
              {formData.status === 'available' && formData.description && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/apps/${formData.slug}`} target="_blank">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              {formData.status !== 'available' && (
                <Button
                  size="sm"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Make Available
                </Button>
              )}
            </div>
          </div>

          {/* Editor content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
                >
                  {error}
                </motion.div>
              )}

              {/* Name */}
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="App name..."
                className="w-full text-4xl font-bold bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              {/* Tagline */}
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Short tagline..."
                className="w-full text-xl bg-transparent text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Description (optional, for app detail page)
                </h3>
                <MarkdownEditor
                  value={formData.description || ''}
                  onChange={(value) => updateField('description', value)}
                  placeholder="Write a detailed description for the app page..."
                  minHeight="300px"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <EditorPanel title="App Settings">
          <Field label="Icon">
            <ImageUploader
              value={formData.icon_url || ''}
              onChange={(value) => updateField('icon_url', value)}
              folder="app-icons"
              aspectRatio="square"
            />
          </Field>

          <Field label="Slug" description="URL-friendly version of the name">
            <Input
              value={formData.slug}
              onChange={(e) => {
                setAutoSlug(false);
                updateField('slug', e.target.value);
              }}
              placeholder="app-slug"
            />
          </Field>

          <Field label="Suite" description="Group this app with others">
            <Select
              value={formData.suite_id || ''}
              onChange={(e) => updateField('suite_id', e.target.value || null)}
              options={[
                { value: '', label: 'No suite' },
                ...suites.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>

          <Field label="External URL" description="Link out to external app">
            <Input
              value={formData.external_url || ''}
              onChange={(e) => updateField('external_url', e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <Field label="Demo URL" description="Embed a demo (iframe)">
            <Input
              value={formData.demo_url || ''}
              onChange={(e) => updateField('demo_url', e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <Field label="Tech Stack">
            <TagInput
              value={formData.tech_stack || []}
              onChange={(value) => updateField('tech_stack', value)}
              placeholder="Press Enter to add"
            />
          </Field>

          <Field label="Status">
            <Select
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value as 'planned' | 'in_development' | 'available' | 'archived')}
              options={[
                { value: 'planned', label: 'Planned' },
                { value: 'in_development', label: 'In Development' },
                { value: 'available', label: 'Available' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </Field>

          <Field label="Order" description="Lower numbers appear first">
            <Input
              type="number"
              value={formData.order_index}
              onChange={(e) => updateField('order_index', parseInt(e.target.value) || 0)}
            />
          </Field>

          {/* SEO Section */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">SEO Settings</h3>
            </div>

            <Field label="Meta Title" description="Overrides page title in search results">
              <Input
                value={formData.meta_title || ''}
                onChange={(e) => updateField('meta_title', e.target.value || null)}
                placeholder={formData.name || 'App name...'}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(formData.meta_title || formData.name || '').length}/60
              </p>
            </Field>

            <Field label="Meta Description" description="Shown in search results">
              <Textarea
                value={formData.meta_description || ''}
                onChange={(e) => updateField('meta_description', e.target.value || null)}
                placeholder={formData.tagline || 'Brief description for search engines...'}
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(formData.meta_description || formData.tagline || '').length}/160
              </p>
            </Field>

            <Field label="Social Image" description="Image for social sharing (OG image)">
              <ImageUploader
                value={formData.og_image || ''}
                onChange={(value) => updateField('og_image', value || null)}
                folder="og-images"
                aspectRatio="video"
              />
              {!formData.og_image && formData.icon_url && (
                <p className="text-xs text-muted-foreground mt-1">
                  Falls back to app icon
                </p>
              )}
            </Field>
          </div>

          {/* Version History - only show for existing apps */}
          {isEditing && id && (
            <VersionHistory
              tableName="apps"
              recordId={id}
              onRestore={handleVersionRestore}
            />
          )}
        </EditorPanel>
      </div>
    </AdminLayout>
  );
};

export default AppEditor;
