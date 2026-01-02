import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Loader2, AppWindow } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import PageTransition from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAppsBySlug, type App, type AppSuite } from '@/lib/supabase-queries';

const AppDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [app, setApp] = useState<(App & { suite: AppSuite | null }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApp() {
      if (!slug) return;

      try {
        const data = await getAppsBySlug(slug);
        setApp(data);
      } catch (err) {
        console.error('Error fetching app:', err);
        setError('App not found');
      } finally {
        setIsLoading(false);
      }
    }

    fetchApp();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
          <AppWindow className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">App not found</h1>
          <p className="text-muted-foreground mb-6">
            The app you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/apps">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Apps
            </Link>
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              to="/apps"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Apps</span>
            </Link>
          </motion.div>

          {/* App Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-6 mb-8"
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {app.icon_url ? (
                <img
                  src={app.icon_url}
                  alt={app.name}
                  className="w-32 h-32 object-cover rounded-3xl shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center">
                  <AppWindow className="w-16 h-16 text-primary" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {app.name}
              </h1>
              {app.tagline && (
                <p className="text-lg text-muted-foreground mb-4">
                  {app.tagline}
                </p>
              )}

              {/* Tech stack */}
              {app.tech_stack && app.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {app.tech_stack.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Suite badge */}
              {app.suite && (
                <Link
                  to={`/apps/suite/${app.suite.slug}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Part of {app.suite.name}
                </Link>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                {app.external_url && (
                  <Button asChild>
                    <a
                      href={app.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open App
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                )}
                {app.demo_url && (
                  <Button variant="outline" asChild>
                    <a
                      href={app.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Demo
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Demo embed */}
          {app.demo_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="aspect-video bg-card border border-border rounded-lg overflow-hidden">
                <iframe
                  src={app.demo_url}
                  title={`${app.name} Demo`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          )}

          {/* Description (Markdown) */}
          {app.description && (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="prose prose-invert prose-primary max-w-none"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {app.description}
              </ReactMarkdown>
            </motion.article>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default AppDetail;
