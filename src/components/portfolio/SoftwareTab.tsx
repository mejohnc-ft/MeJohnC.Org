import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppCardSkeleton } from '@/components/Skeleton';
import AppCard from '@/components/AppCard';
import AppSuiteSection from '@/components/AppSuiteSection';
import {
  getApps,
  getAppSuites,
  type App,
  type AppSuite,
} from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';

export default function SoftwareTab() {
  const [apps, setApps] = useState<(App & { suite: AppSuite | null })[]>([]);
  const [suites, setSuites] = useState<AppSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'SoftwareTab.fetchApps' });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Group apps by suite (only available ones)
  const appsBySuite = suites.map((suite) => ({
    suite,
    apps: apps.filter((app) => app.suite_id === suite.id && app.status === 'available'),
  })).filter(({ apps }) => apps.length > 0);

  // Standalone apps (only available ones)
  const standaloneApps = apps.filter((app) => !app.suite_id && app.status === 'available');

  // Planned apps for Coming Soon
  const plannedApps = apps.filter(app => app.status === 'planned' || app.status === 'in_development');

  return (
    <motion.div
      key="software"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="mb-12">
        <span className="font-mono text-sm text-primary uppercase tracking-widest">
          Apps & Tools
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2">
          Software I've Built
        </h2>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
          A collection of apps, tools, and experiments. Click on any app to learn more or try it out.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AppCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
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
            <section className="space-y-4">
              {appsBySuite.length > 0 && (
                <h3 className="text-xl font-bold text-foreground">Other Apps</h3>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {standaloneApps.map((app, index) => (
                  <AppCard key={app.id} app={app} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* Coming Soon */}
          {plannedApps.length > 0 && (
            <section className="space-y-4 pt-8 border-t border-border">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-xl font-bold text-foreground">Coming Soon</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  Roadmap
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {plannedApps.map((app) => (
                  <div
                    key={app.id}
                    className="group relative p-6 bg-card/50 border border-border/50 border-dashed rounded-2xl hover:bg-card hover:border-border hover:border-solid transition-all duration-300"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300 overflow-hidden">
                          {app.icon_url ? (
                            <img src={app.icon_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>📱</span>
                          )}
                        </div>
                        <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold bg-muted text-muted-foreground rounded-lg">
                          {app.status === 'in_development' ? 'In Dev' : 'Planned'}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {app.name}
                      </h4>
                      <div className="text-xs font-medium text-primary/80 mb-2">
                        {app.tagline || app.suite?.name || 'App'}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {app.description || 'Coming soon...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </motion.div>
  );
}
