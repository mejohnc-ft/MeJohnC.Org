/**
 * PipelinePage Component
 *
 * Visual pipeline board for managing deals
 */

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { DealPipeline } from '../components/DealPipeline';
import type { Pipeline, PipelineStage, DealWithDetails } from '../schemas';
import { getPipelines, getPipelineStages, getDeals } from '@/lib/crm-queries';

const PipelinePage = () => {
  useSEO({ title: 'CRM - Pipeline', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPipelines = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const data = await getPipelines(supabase);
      setPipelines(data);
      if (data.length > 0) {
        setSelectedPipeline(data.find(p => p.is_default) || data[0]);
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'PipelinePage.loadPipelines',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const loadPipelineData = useCallback(async () => {
    if (!supabase || !selectedPipeline) return;

    try {
      const [stagesData, dealsData] = await Promise.all([
        getPipelineStages(selectedPipeline.id, supabase),
        getDeals({ pipelineId: selectedPipeline.id, status: 'open' }, supabase),
      ]);

      setStages(stagesData);
      setDeals(dealsData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'PipelinePage.loadPipelineData',
      });
    }
  }, [supabase, selectedPipeline]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    if (selectedPipeline) {
      loadPipelineData();
    }
  }, [selectedPipeline, loadPipelineData]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (pipelines.length === 0) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No pipelines configured</h3>
          <p className="text-muted-foreground">Create a pipeline to start tracking deals</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Visualize and manage your sales pipeline
            </p>
          </div>

          {/* Pipeline Selector */}
          {pipelines.length > 1 && (
            <select
              value={selectedPipeline?.id || ''}
              onChange={(e) => {
                const pipeline = pipelines.find(p => p.id === e.target.value);
                setSelectedPipeline(pipeline || null);
              }}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Pipeline Board */}
        {selectedPipeline && stages.length > 0 ? (
          <DealPipeline
            stages={stages}
            deals={deals}
            onDealClick={(deal) => console.log('Deal clicked:', deal)}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No stages configured for this pipeline
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PipelinePage;
