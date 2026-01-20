/**
 * Data Sources Page
 *
 * Page for managing metrics data sources.
 * Allows creating, editing, and configuring data sources.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSEO } from '@/lib/seo';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Database } from 'lucide-react';
import { DataSourceConfig } from '../components/DataSourceConfig';
import type { MetricsSource } from '../schemas';
import { getMetricsSources } from '@/lib/metrics-queries';

export default function SourcesPage() {
  useSEO({ title: 'Data Sources - Metrics', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [sources, setSources] = useState<MetricsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;

    const loadSources = async () => {
      try {
        const data = await getMetricsSources({}, supabase);
        setSources(data);
      } catch (error) {
        console.error('Failed to load sources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSources();
  }, [supabase]);

  const handleAddSource = () => {
    // TODO: Implement add source modal
    console.log('Add source clicked');
  };

  const handleSourceClick = (source: MetricsSource) => {
    // TODO: Implement source detail/edit view
    console.log('Source clicked:', source);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
            <p className="text-muted-foreground mt-1">
              Manage your metrics data sources and integrations
            </p>
          </div>
          <Button onClick={handleAddSource}>
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>

        {/* Sources Grid */}
        {sources.length === 0 ? (
          <Card className="p-8 text-center">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Sources</h3>
            <p className="text-muted-foreground mb-4">
              Add your first data source to start collecting metrics.
            </p>
            <Button onClick={handleAddSource}>
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
                onClick={handleSourceClick}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
