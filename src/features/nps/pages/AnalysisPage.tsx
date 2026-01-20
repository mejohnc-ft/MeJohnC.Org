/**
 * NPS Analysis Page
 *
 * AI-powered analysis and insights from NPS data.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import { useEffect, useState } from 'react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { useSEO } from '@/lib/seo';
import AdminLayout from '@/components/AdminLayout';
import { NpsServiceSupabase } from '@/services/nps';
import { NpsDashboard, TrendChart } from '../components';
import type { NPSStats, NPSSurvey, NPSTrend } from '../schemas';

const AnalysisPage = () => {
  useSEO({ title: 'NPS Analysis', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [stats, setStats] = useState<NPSStats | null>(null);
  const [recentSurveys, setRecentSurveys] = useState<NPSSurvey[]>([]);
  const [trends, setTrends] = useState<NPSTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const service = new NpsServiceSupabase(supabase);
        const [statsData, surveysResult, trendsData] = await Promise.all([
          service.getStats({ client: supabase }),
          service.getSurveys({ client: supabase }, { limit: 5 }),
          service.getTrends({ client: supabase }),
        ]);
        setStats(statsData);
        setRecentSurveys(surveysResult.data);
        setTrends(trendsData);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'AnalysisPage.fetchAnalysis',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
  }, [supabase]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading analysis...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">No data available</h3>
          <p className="text-muted-foreground">Create surveys and collect responses to see analysis.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">NPS Analysis</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights and trends from your NPS data.
          </p>
        </div>

        {/* Dashboard */}
        <NpsDashboard stats={stats} recentSurveys={recentSurveys} />

        {/* Trend Chart */}
        {trends.length > 0 && <TrendChart trends={trends} period="week" />}

        {/* AI Insights Section (Placeholder) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              AI-powered sentiment analysis and actionable insights coming soon.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalysisPage;
