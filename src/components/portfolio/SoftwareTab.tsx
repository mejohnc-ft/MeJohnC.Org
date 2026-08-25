import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCardSkeleton } from "@/components/Skeleton";
import AppCard from "@/components/AppCard";
import AppSuiteSection from "@/components/AppSuiteSection";
import {
  getApps,
  getAppSuites,
  type App,
  type AppSuite,
} from "@/lib/supabase-queries";
import { captureException } from "@/lib/sentry";
import { toError } from "@/lib/errors";
import AiProductsPanel from "@/components/portfolio/AiProductsPanel";
import { portfolioThesis } from "@/data/ai-products";

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
        captureException(toError(err), { context: "SoftwareTab.fetchApps" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Group apps by suite (only available ones)
  const appsBySuite = suites
    .map((suite) => ({
      suite,
      apps: apps.filter(
        (app) => app.suite_id === suite.id && app.status === "available",
      ),
    }))
    .filter(({ apps }) => apps.length > 0);

  // Standalone apps (only available ones)
  const standaloneApps = apps.filter(
    (app) => !app.suite_id && app.status === "available",
  );

  return (
    <motion.div
      key="software"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="mb-12">
        <span className="font-mono text-sm text-primary uppercase tracking-widest">
          Products &amp; software
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-foreground mt-2">
          Products I've Built
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-3xl">
          {portfolioThesis.lead}
        </p>
        <p className="mt-5 max-w-2xl border-l border-primary/50 pl-5 text-sm leading-relaxed text-foreground">
          {portfolioThesis.agentAuthority}
        </p>
      </div>

      <AiProductsPanel />

      <section aria-label="Public software builds" className="mt-12">
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
                  <h3 className="text-xl font-bold text-foreground">
                    Other Apps
                  </h3>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {standaloneApps.map((app, index) => (
                    <AppCard key={app.id} app={app} index={index} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
}
