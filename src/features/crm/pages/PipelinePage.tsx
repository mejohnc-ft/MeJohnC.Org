/**
 * PipelinePage Component
 *
 * Visual pipeline board for managing deals with add/edit modal
 */

import { useState, useEffect, useCallback } from "react";
import { GitBranch, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import { DealPipeline } from "../components/DealPipeline";
import { DealForm } from "../components/DealForm";
import type {
  Pipeline,
  PipelineStage,
  DealWithDetails,
  Deal,
} from "../schemas";
import {
  getPipelines,
  getPipelineStages,
  getDeals,
  createDeal,
  updateDeal,
} from "@/lib/crm-queries";

const PipelinePage = () => {
  useSEO({ title: "CRM - Pipeline", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(
    null,
  );
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithDetails | null>(null);

  const loadPipelines = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const data = await getPipelines(supabase);
      setPipelines(data);
      if (data.length > 0) {
        setSelectedPipeline(data.find((p) => p.is_default) || data[0]);
      }
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "PipelinePage.loadPipelines",
        },
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const loadPipelineData = useCallback(async () => {
    if (!supabase || !selectedPipeline) return;

    try {
      const [stagesData, dealsData] = await Promise.all([
        getPipelineStages(selectedPipeline.id, supabase),
        getDeals({ pipelineId: selectedPipeline.id, status: "open" }, supabase),
      ]);

      setStages(stagesData);
      setDeals(dealsData);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "PipelinePage.loadPipelineData",
        },
      );
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

  const handleCreateDeal = useCallback(
    async (
      data: Omit<
        Deal,
        "id" | "created_at" | "updated_at" | "closed_at" | "expected_revenue"
      >,
    ) => {
      if (!supabase) return;
      await createDeal(data, supabase);
      toast.success("Deal created");
      setShowForm(false);
      await loadPipelineData();
    },
    [supabase, loadPipelineData],
  );

  const handleUpdateDeal = useCallback(
    async (
      data: Omit<
        Deal,
        "id" | "created_at" | "updated_at" | "closed_at" | "expected_revenue"
      >,
    ) => {
      if (!supabase || !editingDeal) return;
      await updateDeal(editingDeal.id, data, supabase);
      toast.success("Deal updated");
      setEditingDeal(null);
      await loadPipelineData();
    },
    [supabase, editingDeal, loadPipelineData],
  );

  const handleDealClick = useCallback((deal: DealWithDetails) => {
    setEditingDeal(deal);
  }, []);

  const isFormOpen = showForm || editingDeal !== null;

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
          <p className="text-muted-foreground">
            Create a pipeline to start tracking deals
          </p>
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

          <div className="flex items-center gap-3">
            {/* Pipeline Selector */}
            {pipelines.length > 1 && (
              <select
                value={selectedPipeline?.id || ""}
                onChange={(e) => {
                  const pipeline = pipelines.find(
                    (p) => p.id === e.target.value,
                  );
                  setSelectedPipeline(pipeline || null);
                }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            )}

            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* Deal Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDeal(null);
                }}
                className="absolute top-4 right-4 p-1 rounded hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold mb-4">
                {editingDeal ? "Edit Deal" : "New Deal"}
              </h2>
              <DealForm
                initialData={
                  editingDeal ??
                  (selectedPipeline
                    ? { pipeline_id: selectedPipeline.id }
                    : undefined)
                }
                onSubmit={editingDeal ? handleUpdateDeal : handleCreateDeal}
                onCancel={() => {
                  setShowForm(false);
                  setEditingDeal(null);
                }}
                isEditing={!!editingDeal}
              />
            </div>
          </div>
        )}

        {/* Pipeline Board */}
        {selectedPipeline && stages.length > 0 ? (
          <DealPipeline
            stages={stages}
            deals={deals}
            onDealClick={handleDealClick}
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
