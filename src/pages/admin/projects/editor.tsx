import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2, Send, Clock, Search } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import EditorPanel, { Field, Input, Select, TagInput, Textarea } from '@/components/admin/EditorPanel';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUploader from '@/components/admin/ImageUploader';
import VersionHistory from '@/components/admin/VersionHistory';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getProjectById,
  createProject,
  updateProject,
  generateSlug,
  type Project,
} from '@/lib/supabase-queries';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';

type ProjectFormData = Omit<Project, 'id' | 'created_at' | 'updated_at'>;

const initialFormData: ProjectFormData = {
  name: '',
  slug: '',
  tagline: '',
  description: '',
  cover_image: '',
  external_url: '',
  tech_stack: [],
  status: 'draft',
  scheduled_for: null,
  order_index: 0,
  meta_title: null,
  meta_description: null,
  og_image: null,
};

const ProjectEditor = () => {
  useSEO({ title: 'Project Editor', noIndex: true });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { supabase } = useAuthenticatedSupabase();

  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchProject = useCallback(async (projectId: string) => {
    if (!supabase) return;
    try {
      const data = await getProjectById(projectId, supabase);
      setFormData({
        name: data.name,
        slug: data.slug,
        tagline: data.tagline || '',
        description: data.description || '',
        cover_image: data.cover_image || '',
        external_url: data.external_url || '',
        tech_stack: data.tech_stack || [],
        status: data.status,
        scheduled_for: data.scheduled_for,
        order_index: data.order_index,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        og_image: data.og_image,
      });
      setAutoSlug(false);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'ProjectEditor.fetchProject' });
      setError('Project not found');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const handleVersionRestore = useCallback(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id, fetchProject]);

  useEffect(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id, fetchProject]);

  useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(formData.name),
      }));
    }
  }, [formData.name, autoSlug]);

  async function handleSave(publish = false, schedule = false) {
    if (!supabase) {
      setError('Database not configured');
      return;
    }
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (schedule && !formData.scheduled_for) {
      setError('Please select a scheduled date and time');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      let status = formData.status;
      if (publish) {
        status = 'published';
      } else if (schedule) {
        status = 'scheduled';
      }

      const dataToSave = {
        ...formData,
        status,
      } as ProjectFormData;

      if (isEditing && id) {
        await updateProject(id, dataToSave, supabase);
      } else {
        const newProject = await createProject(dataToSave, supabase);
        navigate(`/admin/projects/${newProject.id}/edit`, { replace: true });
      }

      setFormData((prev) => ({
        ...prev,
        status,
      }));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'ProjectEditor.saveProject' });
      setError('Failed to save project. Make sure you have permission.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof ProjectFormData>(
    key: K,
    value: ProjectFormData[K]
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
              to="/admin/projects"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Projects</span>
            </Link>

            <div className="flex items-center gap-2">
              {formData.status === 'published' && formData.external_url && (
                <Button asChild variant="ghost" size="sm">
                  <a href={formData.external_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(false, false)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              {formData.status !== 'published' && formData.scheduled_for && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSave(false, true)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  Schedule
                </Button>
              )}
              {formData.status !== 'published' && (
                <Button
                  size="sm"
                  onClick={() => handleSave(true, false)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Publish
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
                placeholder="Project name..."
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
                  Description
                </h3>
                <MarkdownEditor
                  value={formData.description || ''}
                  onChange={(value) => updateField('description', value)}
                  placeholder="Write about the project..."
                  minHeight="300px"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <EditorPanel title="Project Settings">
          <Field label="Cover Image">
            <ImageUploader
              value={formData.cover_image || ''}
              onChange={(value) => updateField('cover_image', value)}
              folder="project-covers"
              aspectRatio="video"
            />
          </Field>

          <Field label="Slug" description="URL-friendly version of the name">
            <Input
              value={formData.slug}
              onChange={(e) => {
                setAutoSlug(false);
                updateField('slug', e.target.value);
              }}
              placeholder="project-slug"
            />
          </Field>

          <Field label="External URL" description="Link to live project">
            <Input
              value={formData.external_url || ''}
              onChange={(e) => updateField('external_url', e.target.value)}
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
              onChange={(e) => updateField('status', e.target.value as 'draft' | 'published' | 'scheduled')}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'published', label: 'Published' },
              ]}
            />
          </Field>

          {formData.status !== 'published' && (
            <Field label="Schedule For" description="Auto-publish at this date/time">
              <Input
                type="datetime-local"
                value={formData.scheduled_for ? formData.scheduled_for.slice(0, 16) : ''}
                onChange={(e) => updateField('scheduled_for', e.target.value ? new Date(e.target.value).toISOString() : null)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </Field>
          )}

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
                placeholder={formData.name || 'Project name...'}
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
              {!formData.og_image && formData.cover_image && (
                <p className="text-xs text-muted-foreground mt-1">
                  Falls back to cover image
                </p>
              )}
            </Field>
          </div>

          {/* Version History - only show for existing projects */}
          {isEditing && id && (
            <VersionHistory
              tableName="projects"
              recordId={id}
              onRestore={handleVersionRestore}
            />
          )}
        </EditorPanel>
      </div>
    </AdminLayout>
  );
};

export default ProjectEditor;
