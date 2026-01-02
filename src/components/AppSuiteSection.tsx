import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import AppCard from './AppCard';
import type { App, AppSuite } from '@/lib/supabase-queries';

interface AppSuiteSectionProps {
  suite: AppSuite;
  apps: App[];
  index?: number;
}

const AppSuiteSection = ({ suite, apps, index = 0 }: AppSuiteSectionProps) => {
  if (apps.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="space-y-4"
    >
      {/* Suite Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/apps/${suite.slug}`}
            className="group inline-flex items-center gap-2"
          >
            <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {suite.name}
            </h2>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
          {suite.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {suite.description}
            </p>
          )}
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {apps.map((app, appIndex) => (
          <AppCard key={app.id} app={app} index={appIndex} />
        ))}
      </div>
    </motion.section>
  );
};

export default AppSuiteSection;
