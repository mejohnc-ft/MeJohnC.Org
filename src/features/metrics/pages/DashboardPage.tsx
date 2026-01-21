/**
 * Metrics Dashboard Page
 *
 * Main page for the metrics dashboard feature.
 * Wraps MetricsDashboard component in admin layout with SEO.
 * Uses lazy loading for heavy chart components to reduce initial bundle size.
 */

'use client';

import { lazy, Suspense } from 'react';
import { useSEO } from '@/lib/seo';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import type { MetricsSource } from '@/lib/schemas';

// Lazy load heavy components with charts
const MetricsDashboard = lazy(() => import('../components/MetricsDashboard').then(m => ({ default: m.MetricsDashboard })));
const GitHubMetricsCard = lazy(() => import('@/components/admin/metrics/GitHubMetricsCard'));
const SupabaseStatsCard = lazy(() => import('@/components/admin/metrics/SupabaseStatsCard'));

// Loading fallback for lazy components
function ChartSkeleton() {
  return (
    <Card className="p-6 h-[300px] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </Card>
  );
}

export default function DashboardPage() {
  useSEO({ title: 'Metrics Dashboard', noIndex: true });

  const handleAddSource = () => {
    // TODO: Implement add source modal/navigation
    console.log('Add source clicked');
  };

  const handleSourceClick = (source: MetricsSource) => {
    // TODO: Implement source detail view
    console.log('Source clicked:', source);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <Suspense fallback={<ChartSkeleton />}>
          <MetricsDashboard onAddSource={handleAddSource} onSourceClick={handleSourceClick} />
        </Suspense>

        {/* Live Integrations Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Live Integrations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supabase Stats */}
            <Suspense fallback={<ChartSkeleton />}>
              <SupabaseStatsCard showChart={true} />
            </Suspense>

            {/* GitHub Stats */}
            <Suspense fallback={<ChartSkeleton />}>
              <GitHubMetricsCard owner="mejohnc-ft" repo="MeJohnC.Org" showChart={true} />
            </Suspense>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
