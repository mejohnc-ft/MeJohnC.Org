/**
 * useMetricsData Hook
 *
 * Connects generative UI panels to live metrics data.
 * Provides data context for data-bound components.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface MetricsData {
  [sourceId: string]: {
    name: string;
    metrics: {
      [metricName: string]: {
        value: number;
        previousValue?: number;
        timestamp: string;
      };
    };
  };
}

interface UseMetricsDataOptions {
  sourceIds?: string[];
  refreshInterval?: number; // ms
  enabled?: boolean;
}

export function useMetricsData(options: UseMetricsDataOptions = {}) {
  const { sourceIds = [], refreshInterval = 60000, enabled = true } = options;

  const [data, setData] = useState<MetricsData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!enabled || sourceIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch sources
      const { data: sources, error: sourcesError } = await supabase
        .from('metrics_sources')
        .select('id, name, slug')
        .in('id', sourceIds)
        .eq('is_active', true);

      if (sourcesError) throw sourcesError;

      // Fetch latest metrics for each source
      const metricsData: MetricsData = {};

      for (const source of sources || []) {
        const { data: metrics, error: metricsError } = await supabase
          .from('metrics_data')
          .select('metric_name, value, recorded_at')
          .eq('source_id', source.id)
          .order('recorded_at', { ascending: false })
          .limit(10);

        if (metricsError) {
          console.warn(`Failed to fetch metrics for source ${source.id}:`, metricsError);
          continue;
        }

        // Group by metric name, keeping latest and previous values
        const metricsByName: MetricsData[string]['metrics'] = {};

        for (const metric of metrics || []) {
          if (!metricsByName[metric.metric_name]) {
            metricsByName[metric.metric_name] = {
              value: metric.value,
              timestamp: metric.recorded_at,
            };
          } else if (!metricsByName[metric.metric_name].previousValue) {
            metricsByName[metric.metric_name].previousValue = metric.value;
          }
        }

        metricsData[source.id] = {
          name: source.name,
          metrics: metricsByName,
        };
      }

      setData(metricsData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [sourceIds, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval, enabled]);

  // Build context object for UIRenderer
  const getDataContext = useCallback(() => {
    const context: Record<string, unknown> = { metrics: {} };

    for (const [sourceId, sourceData] of Object.entries(data)) {
      const metricsContext: Record<string, unknown> = {};

      for (const [metricName, metricData] of Object.entries(sourceData.metrics)) {
        metricsContext[metricName] = {
          value: metricData.value,
          previousValue: metricData.previousValue,
          change: metricData.previousValue
            ? ((metricData.value - metricData.previousValue) / metricData.previousValue) * 100
            : 0,
        };
      }

      (context.metrics as Record<string, unknown>)[sourceId] = metricsContext;
    }

    return context;
  }, [data]);

  return {
    data,
    loading,
    error,
    lastRefresh,
    refresh: fetchMetrics,
    getDataContext,
  };
}

/**
 * Get available metrics sources for the generation context
 */
export async function getAvailableMetricsSources() {
  const { data, error } = await supabase
    .from('metrics_sources')
    .select('id, name, slug, source_type')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Failed to fetch metrics sources:', error);
    return [];
  }

  return data || [];
}

export default useMetricsData;
