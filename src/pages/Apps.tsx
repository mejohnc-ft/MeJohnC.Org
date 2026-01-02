import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AppWindow } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import AppCard from '@/components/AppCard';
import AppSuiteSection from '@/components/AppSuiteSection';
import { getApps, getAppSuites, type App, type AppSuite } from '@/lib/supabase-queries';

const Apps = () => {
  const [apps, setApps] = useState<(App & { suite: AppSuite | null })[]>([]);
  const [suites, setSuites] = useState<AppSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [appsData, suitesData] = await Promise.all([
          getApps(),
          getAppSuites(),
        ]);
        setApps(appsData);
        setSuites(suitesData);
      } catch (err) {
        console.error('Error fetching apps:', err);
        setError('Failed to load apps');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Group apps by suite
  const appsBySuite = suites.map((suite) => ({
    suite,
    apps: apps.filter((app) => app.suite_id === suite.id),
  }));

  // Apps without a suite
  const standaloneApps = apps.filter((app) => !app.suite_id);

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              Apps & Tools
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A collection of apps, tools, and experiments I've built.
              Click on any app to learn more or try it out.
            </p>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && apps.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                <AppWindow className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No apps yet
              </h2>
              <p className="text-muted-foreground">
                Check back soon for new apps and tools.
              </p>
            </motion.div>
          )}

          {/* Apps Content */}
          {!isLoading && !error && apps.length > 0 && (
            <div className="space-y-12">
              {/* Suites with apps */}
              {appsBySuite.map(({ suite, apps: suiteApps }, index) => (
                <AppSuiteSection
                  key={suite.id}
                  suite={suite}
                  apps={suiteApps}
                  index={index}
                />
              ))}

              {/* Standalone apps */}
              {standaloneApps.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: appsBySuite.length * 0.1 }}
                  className="space-y-4"
                >
                  {appsBySuite.length > 0 && (
                    <h2 className="text-xl font-bold text-foreground">
                      Other Apps
                    </h2>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {standaloneApps.map((app, index) => (
                      <AppCard key={app.id} app={app} index={index} />
                    ))}
                  </div>
                </motion.section>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Apps;
