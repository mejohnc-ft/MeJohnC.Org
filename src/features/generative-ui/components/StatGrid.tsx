/**
 * StatGrid Component
 *
 * Grid layout for multiple StatCards.
 * Responsive grid with configurable columns.
 */

'use client';

import { cn } from '@/lib/utils';
import { StatCard } from './StatCard';
import type { StatGridProps } from '../schemas';

export function StatGrid({ stats, columns = 4 }: StatGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={cn('grid gap-6 w-full', gridCols)}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

export default StatGrid;
