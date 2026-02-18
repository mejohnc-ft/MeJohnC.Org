/**
 * Data Sources Page
 *
 * Page for managing metrics data sources.
 * Allows creating, editing, and configuring data sources.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSEO } from "@/lib/seo";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Database } from "lucide-react";
import { DataSourceConfig } from "../components/DataSourceConfig";
import { SourceModal, type SourceFormData } from "../components/SourceModal";
import { SourceDetailPanel } from "../components/SourceDetailPanel";
import type { MetricsSource } from "../schemas";
import { DEFAULT_TENANT_ID } from "@/lib/schemas";
import {
  getMetricsSources,
  createMetricsSource,
  updateMetricsSource,
  deleteMetricsSource,
} from "@/lib/metrics-queries";

export default function SourcesPage() {
  useSEO({ title: "Data Sources - Metrics", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [sources, setSources] = useState<MetricsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for modal and detail panel
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MetricsSource | null>(
    null,
  );
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const loadSources = useCallback(async () => {
    if (!supabase) return;

    try {
      const data = await getMetricsSources({}, supabase);
      setSources(data);
    } catch (error) {
      console.error("Failed to load sources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleAddSource = useCallback(() => {
    setSelectedSource(null);
    setModalMode("create");
    setIsModalOpen(true);
  }, []);

  const handleSourceClick = useCallback((source: MetricsSource) => {
    setSelectedSource(source);
    setIsDetailOpen(true);
  }, []);

  const handleEditSource = useCallback((source: MetricsSource) => {
    setSelectedSource(source);
    setModalMode("edit");
    setIsDetailOpen(false);
    setIsModalOpen(true);
  }, []);

  const handleSaveSource = useCallback(
    async (data: SourceFormData) => {
      if (!supabase) return;

      if (modalMode === "create") {
        await createMetricsSource(
          {
            tenant_id: DEFAULT_TENANT_ID,
            name: data.name,
            slug: data.slug,
            source_type: data.source_type,
            description: data.description || null,
            icon: null,
            color: data.color,
            endpoint_url: data.endpoint_url || null,
            auth_type: data.auth_type === "none" ? null : data.auth_type,
            auth_config:
              Object.keys(data.auth_config).length > 0
                ? data.auth_config
                : undefined,
            refresh_interval_minutes: data.refresh_interval_minutes,
            is_active: data.is_active,
          },
          supabase,
        );
      } else if (selectedSource) {
        await updateMetricsSource(
          selectedSource.id,
          {
            name: data.name,
            slug: data.slug,
            source_type: data.source_type,
            description: data.description || null,
            color: data.color,
            endpoint_url: data.endpoint_url || null,
            auth_type: data.auth_type === "none" ? null : data.auth_type,
            auth_config:
              Object.keys(data.auth_config).length > 0
                ? data.auth_config
                : undefined,
            refresh_interval_minutes: data.refresh_interval_minutes,
            is_active: data.is_active,
          },
          supabase,
        );
      }

      await loadSources();
    },
    [supabase, modalMode, selectedSource, loadSources],
  );

  const handleDeleteSource = useCallback(
    async (source: MetricsSource) => {
      if (!supabase) return;
      await deleteMetricsSource(source.id, supabase);
      await loadSources();
    },
    [supabase, loadSources],
  );

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
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Data Sources
            </h3>
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

      {/* Source Modal */}
      <SourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSource}
        source={selectedSource}
        mode={modalMode}
      />

      {/* Source Detail Panel */}
      <SourceDetailPanel
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        source={selectedSource}
        onEdit={handleEditSource}
        onDelete={handleDeleteSource}
      />
    </AdminLayout>
  );
}
