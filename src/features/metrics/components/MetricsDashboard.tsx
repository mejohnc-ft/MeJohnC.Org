/**
 * Metrics Dashboard Component
 *
 * Main dashboard component that displays:
 * - Overview statistics
 * - Data sources
 * - Time-series charts
 * - Live integrations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Database,
  RefreshCw,
  Plus,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';
import { ANIMATION } from '@/lib/constants';
import { WidgetCard } from './WidgetCard';
import { ChartWidget } from './ChartWidget';
import { DataSourceConfig } from './DataSourceConfig';
import type { MetricsSource, MetricsStats, MetricsData } from '../schemas';
import type { TimeRange } from '@/services/metrics';
import {
  getMetricsSources,
  getMetricsStats,
  getMetricsData,
  getDistinctMetricNames,
  getTimeRangeDates,
} from '@/lib/metrics-queries';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1H', value: '1h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
];

export interface MetricsDashboardProps {
  onAddSource?: () => void;
  onSourceClick?: (source: MetricsSource) => void;
}

export function MetricsDashboard({ onAddSource, onSourceClick }: MetricsDashboardProps) {
  const { supabase } = useAuthenticatedSupabase();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<MetricsStats | null>(null);
  const [sources, setSources] = useState<MetricsSource[]>([]);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('7d');
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [metricNames, setMetricNames] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) return;

    try {
      const { start, end } = getTimeRangeDates(selectedRange);

      const [statsData, sourcesData, dataPoints, names] = await Promise.all([
        getMetricsStats(supabase),
        getMetricsSources({ isActive: true }, supabase),
        getMetricsData({ startDate: start, endDate: end, limit: 1000 }, supabase),
        getDistinctMetricNames(undefined, supabase),
      ]);

      setStats(statsData);
      setSources(sourcesData);
      setMetricsData(dataPoints);
      setMetricNames(names);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'MetricsDashboard.loadData',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, selectedRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Transform metrics data for charts
  const chartData = metricsData.map((d) => ({
    timestamp: d.recorded_at,
    value: d.value,
    name: d.metric_name,
  }));

  // Group data by metric name for multi-series charts
  const dataByMetric = metricNames.reduce(
    (acc, name) => {
      acc[name] = chartData.filter((d) => d.name === name);
      return acc;
    },
    {} as Record<string, typeof chartData>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metrics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your site performance and external data sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={onAddSource}>
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetCard
          title="Data Sources"
          value={stats?.total_sources ?? 0}
          icon={Database}
          iconColor="text-blue-500"
          showTrend={false}
        />
        <WidgetCard
          title="Active Sources"
          value={stats?.active_sources ?? 0}
          icon={Activity}
          iconColor="text-green-500"
          showTrend={false}
        />
        <WidgetCard
          title="Data Points"
          value={stats?.total_data_points ?? 0}
          icon={BarChart3}
          iconColor="text-purple-500"
          formatValue={(v) => (typeof v === 'number' ? v.toLocaleString() : v)}
          showTrend={false}
        />
        <WidgetCard
          title="Dashboards"
          value={stats?.dashboards_count ?? 0}
          icon={TrendingUp}
          iconColor="text-orange-500"
          showTrend={false}
        />
      </div>

      {/* Time Range Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Time Range</span>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={selectedRange === range.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedRange(range.value)}
                className="h-7 px-3"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Data Sources List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Data Sources</h2>
        {sources.length === 0 ? (
          <Card className="p-8 text-center">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Sources</h3>
            <p className="text-muted-foreground mb-4">
              Add your first data source to start collecting metrics.
            </p>
            <Button onClick={onAddSource}>
              <Plus className="w-4 h-4 mr-2" />
              Add Data Source
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source, index) => (
              <DataSourceConfig
                key={source.id}
                source={source}
                index={index}
                onClick={onSourceClick}
                animationDelay={ANIMATION.staggerDelay}
              />
            ))}
          </div>
        )}
      </div>

      {/* Charts Section */}
      {metricsData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Metrics Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metricNames.slice(0, 4).map((metricName) => {
              const data = dataByMetric[metricName] || [];
              return (
                <ChartWidget
                  key={metricName}
                  title={metricName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  data={data}
                  dataKey="value"
                  color="hsl(var(--primary))"
                  height={250}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State for Charts */}
      {metricsData.length === 0 && sources.length > 0 && (
        <Card className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
          <p className="text-muted-foreground">
            Your data sources are configured but haven&apos;t collected any data yet.
            <br />
            Data will appear here after the first sync.
          </p>
        </Card>
      )}
    </div>
  );
}
