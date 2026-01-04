import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2, Send, Clock, Search } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import EditorPanel, { Field, Input, Textarea, Select, TagInput } from '@/components/admin/EditorPanel';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUploader from '@/components/admin/ImageUploader';
import VersionHistory from '@/components/admin/VersionHistory';
import { Button } from '@/components/ui/button';
import { useSupabaseClient } from '@/lib/supabase';
import {
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  generateSlug,
  calculateReadingTime,
  type BlogPost
} from '@/lib/supabase-queries';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';

type PostFormData = Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;

const initialFormData: PostFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image: '',
  tags: [],
  status: 'draft',
  published_at: null,
  scheduled_for: null,
  reading_time: null,
  meta_title: null,
  meta_description: null,
  og_image: null,
};

const BlogEditor = () => {
  useSEO({ title: 'Blog Editor', noIndex: true });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const supabase = useSupabaseClient();

  const [formData, setFormData] = useState<PostFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPost(id);
    }
  }, [id, fetchPost]);

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && formData.title) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(formData.title),
      }));
    }
  }, [formData.title, autoSlug]);

  // Auto-calculate reading time
  useEffect(() => {
    if (formData.content) {
      setFormData((prev) => ({
        ...prev,
        reading_time: calculateReadingTime(formData.content),
      }));
    }
  }, [formData.content]);

  const fetchPost = useCallback(async (postId: string) => {
    try {
      const post = await getBlogPostById(postId, supabase);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content,
        cover_image: post.cover_image || '',
        tags: post.tags || [],
        status: post.status,
        published_at: post.published_at,
        scheduled_for: post.scheduled_for,
        reading_time: post.reading_time,
        meta_title: post.meta_title,
        meta_description: post.meta_description,
        og_image: post.og_image,
      });
      setAutoSlug(false); // Don't auto-update slug for existing posts
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'BlogEditor.fetchPost' });
      setError('Post not found');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Handle version restore by refetching the post
  const handleVersionRestore = useCallback(() => {
    if (id) {
      fetchPost(id);
    }
  }, [id, fetchPost]);

  async function handleSave(publish = false, schedule = false) {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      setError('Content is required');
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
      let published_at = formData.published_at;

      if (publish) {
        status = 'published';
        published_at = published_at || new Date().toISOString();
      } else if (schedule) {
        status = 'scheduled';
      }

      const dataToSave = {
        ...formData,
        status,
        published_at,
      } as PostFormData;

      if (isEditing && id) {
        await updateBlogPost(id, dataToSave, supabase);
      } else {
        const newPost = await createBlogPost(dataToSave, supabase);
        navigate(`/admin/blog/${newPost.id}/edit`, { replace: true });
      }

      setFormData((prev) => ({
        ...prev,
        status,
        published_at,
      }));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'BlogEditor.savePost' });
      setError('Failed to save post. Make sure you have permission.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof PostFormData>(
    key: K,
    value: PostFormData[K]
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
              to="/admin/blog"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Posts</span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Preview button - works for drafts and scheduled */}
              {formData.slug && formData.status !== 'published' && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/blog/${formData.slug}?preview=true`} target="_blank">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Link>
                </Button>
              )}
              {formData.status === 'published' && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/blog/${formData.slug}`} target="_blank">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Link>
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
                Save Draft
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

              {/* Title */}
              <div>
                <label htmlFor="post-title" className="sr-only">Post title</label>
                <input
                  id="post-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Post title..."
                  aria-required="true"
                  className="w-full text-4xl font-bold bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="post-content" className="sr-only">Post content (Markdown)</label>
                <MarkdownEditor
                  id="post-content"
                  value={formData.content}
                  onChange={(value) => updateField('content', value)}
                  placeholder="Write your post content in markdown..."
                  minHeight="500px"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <EditorPanel title="Post Settings">
          <Field label="Slug" description="URL-friendly version of the title">
            <Input
              value={formData.slug}
              onChange={(e) => {
                setAutoSlug(false);
                updateField('slug', e.target.value);
              }}
              placeholder="post-slug"
            />
          </Field>

          <Field label="Excerpt" description="Brief summary for previews">
            <Textarea
              value={formData.excerpt || ''}
              onChange={(e) => updateField('excerpt', e.target.value)}
              placeholder="A brief description of the post..."
              rows={3}
            />
          </Field>

          <Field label="Cover Image">
            <ImageUploader
              value={formData.cover_image || ''}
              onChange={(value) => updateField('cover_image', value)}
              folder="blog"
              aspectRatio="video"
            />
          </Field>

          <Field label="Tags">
            <TagInput
              value={formData.tags || []}
              onChange={(value) => updateField('tags', value)}
              placeholder="Press Enter to add tag"
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

          {formData.reading_time && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Reading time: ~{formData.reading_time} min
              </p>
            </div>
          )}

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
                placeholder={formData.title || 'Page title...'}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(formData.meta_title || formData.title || '').length}/60
              </p>
            </Field>

            <Field label="Meta Description" description="Shown in search results">
              <Textarea
                value={formData.meta_description || ''}
                onChange={(e) => updateField('meta_description', e.target.value || null)}
                placeholder={formData.excerpt || 'Brief description for search engines...'}
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(formData.meta_description || formData.excerpt || '').length}/160
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

          {/* Version History - only show for existing posts */}
          {isEditing && id && (
            <VersionHistory
              tableName="blog_posts"
              recordId={id}
              onRestore={handleVersionRestore}
            />
          )}
        </EditorPanel>
      </div>
    </AdminLayout>
  );
};

export default BlogEditor;
