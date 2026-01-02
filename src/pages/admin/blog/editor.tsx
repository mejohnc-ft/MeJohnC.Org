import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2, Send } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import EditorPanel, { Field, Input, Textarea, Select, TagInput } from '@/components/admin/EditorPanel';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUploader from '@/components/admin/ImageUploader';
import { Button } from '@/components/ui/button';
import {
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  generateSlug,
  calculateReadingTime,
  type BlogPost
} from '@/lib/supabase-queries';

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
  reading_time: null,
};

const BlogEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<PostFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPost(id);
    }
  }, [id]);

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

  async function fetchPost(postId: string) {
    try {
      const post = await getBlogPostById(postId);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content,
        cover_image: post.cover_image || '',
        tags: post.tags || [],
        status: post.status,
        published_at: post.published_at,
        reading_time: post.reading_time,
      });
      setAutoSlug(false); // Don't auto-update slug for existing posts
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Post not found');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(publish = false) {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      setError('Content is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const dataToSave = {
        ...formData,
        status: publish ? 'published' : formData.status,
        published_at: publish && !formData.published_at
          ? new Date().toISOString()
          : formData.published_at,
      } as PostFormData;

      if (isEditing && id) {
        await updateBlogPost(id, dataToSave);
      } else {
        const newPost = await createBlogPost(dataToSave);
        navigate(`/admin/blog/${newPost.id}/edit`, { replace: true });
      }

      if (publish) {
        setFormData((prev) => ({
          ...prev,
          status: 'published',
          published_at: dataToSave.published_at,
        }));
      }
    } catch (err) {
      console.error('Error saving post:', err);
      setError('Failed to save post');
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
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>
              {formData.status !== 'published' && (
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
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Post title..."
                className="w-full text-4xl font-bold bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              {/* Content */}
              <MarkdownEditor
                value={formData.content}
                onChange={(value) => updateField('content', value)}
                placeholder="Write your post content in markdown..."
                minHeight="500px"
              />
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
              onChange={(e) => updateField('status', e.target.value as 'draft' | 'published')}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ]}
            />
          </Field>

          {formData.reading_time && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Reading time: ~{formData.reading_time} min
              </p>
            </div>
          )}
        </EditorPanel>
      </div>
    </AdminLayout>
  );
};

export default BlogEditor;
