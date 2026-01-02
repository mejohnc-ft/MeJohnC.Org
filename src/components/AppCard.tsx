import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, AppWindow } from 'lucide-react';
import type { App } from '@/lib/supabase-queries';

interface AppCardProps {
  app: App;
  index?: number;
}

const AppCard = ({ app, index = 0 }: AppCardProps) => {
  const hasInternalPage = app.description && !app.external_url;
  const linkTo = hasInternalPage ? `/apps/${app.slug}` : app.external_url;
  const isExternal = !!app.external_url;

  const CardContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group flex flex-col items-center p-6 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Icon */}
      <div className="relative w-24 h-24 mb-4">
        {app.icon_url ? (
          <img
            src={app.icon_url}
            alt={app.name}
            className="w-full h-full object-cover rounded-2xl shadow-md group-hover:shadow-lg transition-shadow"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
            <AppWindow className="w-10 h-10 text-primary" />
          </div>
        )}
        {isExternal && (
          <div className="absolute -top-1 -right-1 p-1.5 bg-muted rounded-full">
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-foreground text-center group-hover:text-primary transition-colors">
        {app.name}
      </h3>

      {/* Tagline */}
      {app.tagline && (
        <p className="text-sm text-muted-foreground text-center mt-1 line-clamp-2">
          {app.tagline}
        </p>
      )}

      {/* Tech stack badges */}
      {app.tech_stack && app.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 justify-center">
          {app.tech_stack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full"
            >
              {tech}
            </span>
          ))}
          {app.tech_stack.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
              +{app.tech_stack.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );

  if (isExternal && linkTo) {
    return (
      <a href={linkTo} target="_blank" rel="noopener noreferrer">
        <CardContent />
      </a>
    );
  }

  if (hasInternalPage && linkTo) {
    return (
      <Link to={linkTo}>
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
};

export default AppCard;
