import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, FolderOpen } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import AppCard from '@/components/AppCard';
import { Button } from '@/components/ui/button';
import { getAppsBySuiteSlug, type App, type AppSuite as AppSuiteType } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';

const AppSuite = () => {
  const { slug } = useParams<{ slug: string }>();
  const [suite, setSuite] = useState<AppSuiteType | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSuite() {
      if (!slug) return;

      try {
        const data = await getAppsBySuiteSlug(slug);
        setSuite(data.suite);
        setApps(data.apps);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AppSuite.fetchSuite', slug });
        setError('Suite not found');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuite();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !suite) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
          <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Suite not found</h1>
          <p className="text-muted-foreground mb-6">
            The app suite you're looking for doesn't exist.
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
        <div className="max-w-6xl mx-auto">
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

          {/* Suite Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              {suite.name}
            </h1>
            {suite.description && (
              <p className="text-lg text-muted-foreground max-w-2xl">
                {suite.description}
              </p>
            )}
          </motion.div>

          {/* Apps Grid */}
          {apps.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No apps in this suite yet.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {apps.map((app, index) => (
                <AppCard key={app.id} app={app} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default AppSuite;
