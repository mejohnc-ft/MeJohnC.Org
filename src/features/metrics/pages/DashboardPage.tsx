/**
 * Metrics Dashboard Page
 *
 * Main page for the metrics dashboard feature.
 * Wraps MetricsDashboard component in admin layout with SEO.
 */

'use client';

import { useSEO } from '@/lib/seo';
import AdminLayout from '@/components/AdminLayout';
import { MetricsDashboard } from '../components/MetricsDashboard';
import { GitHubMetricsCard, SupabaseStatsCard } from '@/components/admin/metrics';

export default function DashboardPage() {
  useSEO({ title: 'Metrics Dashboard', noIndex: true });

  const handleAddSource = () => {
    // TODO: Implement add source modal/navigation
    console.log('Add source clicked');
  };

  const handleSourceClick = (source: any) => {
    // TODO: Implement source detail view
    console.log('Source clicked:', source);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <MetricsDashboard onAddSource={handleAddSource} onSourceClick={handleSourceClick} />

        {/* Live Integrations Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Live Integrations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supabase Stats */}
            <SupabaseStatsCard showChart={true} />

            {/* GitHub Stats */}
            <GitHubMetricsCard owner="mejohnc-ft" repo="MeJohnC.Org" showChart={true} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
