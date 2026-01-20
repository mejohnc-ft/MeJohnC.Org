/**
 * Data Source Config Component
 *
 * Displays configuration card for a metrics data source.
 * Shows source type, status, last sync, and error information.
 */

'use client';

import { motion } from 'framer-motion';
import {
  Database,
  Github,
  Activity,
  TrendingUp,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MetricsSource } from '../schemas';

export interface DataSourceConfigProps {
  source: MetricsSource;
  index?: number;
  onClick?: (source: MetricsSource) => void;
  animationDelay?: number;
}

function getSourceIcon(sourceType: string): LucideIcon {
  switch (sourceType) {
    case 'github':
      return Github;
    case 'analytics':
      return TrendingUp;
    case 'supabase':
      return Database;
    default:
      return Activity;
  }
}

function getSourceColor(sourceType: string): string {
  switch (sourceType) {
    case 'github':
      return 'text-purple-500';
    case 'analytics':
      return 'text-blue-500';
    case 'supabase':
      return 'text-green-500';
    case 'webhook':
      return 'text-orange-500';
    default:
      return 'text-gray-500';
  }
}

export function DataSourceConfig({
  source,
  index = 0,
  onClick,
  animationDelay = 0.1,
}: DataSourceConfigProps) {
  const Icon = getSourceIcon(source.source_type);
  const colorClass = getSourceColor(source.source_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * animationDelay }}
    >
      <Card
        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onClick?.(source)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <Badge variant={source.is_active ? 'default' : 'secondary'}>
            {source.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <h3 className="font-semibold text-foreground">{source.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {source.description || 'No description'}
        </p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {source.last_refresh_at
              ? `Last sync: ${new Date(source.last_refresh_at).toLocaleString()}`
              : 'Never synced'}
          </div>
          {source.error_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {source.error_count} errors
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
