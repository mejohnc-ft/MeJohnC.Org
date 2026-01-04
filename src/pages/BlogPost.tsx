import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'dompurify';
import { ArrowLeft, Clock, Calendar, Loader2, FileText, Eye } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getGhostPostBySlug } from '@/lib/ghost';
import { getBlogPostBySlug } from '@/lib/supabase-queries';
import { formatDate } from '@/lib/markdown';
import { useSEO, useJsonLd } from '@/lib/seo';
import { analytics } from '@/lib/analytics';
import { captureException } from '@/lib/sentry';

// Unified display type
interface DisplayPost {
  title: string;
  slug: string;
  published_at: string | null;
  reading_time: number | null;
  feature_image: string | null;
  tags: string[];
  content: string;
  contentType: 'markdown' | 'html';
}

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const [post, setPost] = useState<DisplayPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic SEO based on post data (noindex for preview mode)
  useSEO(
    post
      ? {
          title: isPreview ? `[Preview] ${post.title}` : post.title,
          description: post.content.slice(0, 160).replace(/[#*_`]/g, '') + '...',
          image: post.feature_image || undefined,
          url: `/blog/${post.slug}`,
          type: 'article',
          publishedTime: post.published_at || undefined,
          noIndex: isPreview,
        }
      : { title: 'Blog Post', url: `/blog/${slug}`, noIndex: isPreview }
  );

  useJsonLd(
    post
      ? {
          type: 'Article',
          headline: post.title,
          description: post.content.slice(0, 160).replace(/[#*_`]/g, ''),
          image: post.feature_image || undefined,
          datePublished: post.published_at || undefined,
          url: `/blog/${post.slug}`,
        }
      : { type: 'Article', headline: 'Blog Post' }
  );

  // Track blog read when post is loaded (not in preview mode)
  useEffect(() => {
    if (post && !isPreview) {
      analytics.trackBlogRead(post.slug, post.title);
    }
  }, [post, isPreview]);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;

      try {
        // Try local Supabase first
        const localPost = await getBlogPostBySlug(slug).catch(() => null);

        if (localPost) {
          setPost({
            title: localPost.title,
            slug: localPost.slug,
            published_at: localPost.published_at,
            reading_time: localPost.reading_time,
            feature_image: localPost.cover_image,
            tags: localPost.tags || [],
            content: localPost.content,
            contentType: 'markdown',
          });
          setIsLoading(false);
          return;
        }

        // Try Ghost if not found locally
        const ghostPost = await getGhostPostBySlug(slug);

        if (ghostPost) {
          setPost({
            title: ghostPost.title,
            slug: ghostPost.slug,
            published_at: ghostPost.published_at || null,
            reading_time: ghostPost.reading_time || null,
            feature_image: ghostPost.feature_image || null,
            tags: ghostPost.tags?.map(t => t.name) || [],
            content: ghostPost.html || '',
            contentType: 'html',
          });
          setIsLoading(false);
          return;
        }

        setError('Post not found');
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: 'BlogPost.fetchPost',
          slug,
        });
        setError('Post not found');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Post not found</h1>
          <p className="text-muted-foreground mb-6">
            The blog post you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Preview Banner */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-yellow-500/90 backdrop-blur-sm text-yellow-950 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <Eye className="w-4 h-4" />
            <span>Preview Mode - This post is not published</span>
          </div>
        </div>
      )}
      <article className="min-h-[calc(100vh-4rem)] py-20 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Blog</span>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(post.published_at)}</span>
                </div>
              )}
              {post.reading_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.reading_time} min read</span>
                </div>
              )}
            </div>
          </motion.header>

          {/* Cover Image */}
          {post.feature_image && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <img
                src={post.feature_image}
                alt={post.title}
                className="w-full rounded-lg shadow-lg"
              />
            </motion.div>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="prose prose-invert max-w-none"
          >
            {post.contentType === 'markdown' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {post.content}
              </ReactMarkdown>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
            )}
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-16 pt-8 border-t border-border"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Thanks for reading!
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/blog">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  More posts
                </Link>
              </Button>
            </div>
          </motion.footer>
        </div>
      </article>
    </PageTransition>
  );
};

export default BlogPostPage;
