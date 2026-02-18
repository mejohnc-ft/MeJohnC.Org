/**
 * Metrics Dashboard Page
 *
 * Main page for the metrics dashboard feature.
 * Wraps MetricsDashboard component in admin layout with SEO.
 * Uses lazy loading for heavy chart components to reduce initial bundle size.
 */

"use client";

import { lazy, Suspense, useState, useCallback } from "react";
import { useSEO } from "@/lib/seo";
import { useTenantSupabase } from "@/lib/supabase";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { SourceModal, type SourceFormData } from "../components/SourceModal";
import { SourceDetailPanel } from "../components/SourceDetailPanel";
import {
  createMetricsSource,
  updateMetricsSource,
  deleteMetricsSource,
} from "@/lib/metrics-queries";
import type { MetricsSource } from "@/lib/schemas";

// Lazy load heavy components with charts
const MetricsDashboard = lazy(() =>
  import("../components/MetricsDashboard").then((m) => ({
    default: m.MetricsDashboard,
  })),
);
const GitHubMetricsCard = lazy(
  () => import("@/components/admin/metrics/GitHubMetricsCard"),
);
const SupabaseStatsCard = lazy(
  () => import("@/components/admin/metrics/SupabaseStatsCard"),
);

// Loading fallback for lazy components
function ChartSkeleton() {
  return (
    <Card className="p-6 h-[300px] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </Card>
  );
}

export default function DashboardPage() {
  useSEO({ title: "Metrics Dashboard", noIndex: true });
  const { supabase, tenantId } = useTenantSupabase();

  // State for modal and detail panel
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MetricsSource | null>(
    null,
  );
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Key to force re-render of MetricsDashboard after mutations
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshDashboard = useCallback(() => setRefreshKey((k) => k + 1), []);

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
            tenant_id: tenantId!,
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

      refreshDashboard();
    },
    [supabase, modalMode, selectedSource, refreshDashboard],
  );

  const handleDeleteSource = useCallback(
    async (source: MetricsSource) => {
      if (!supabase) return;
      await deleteMetricsSource(source.id, supabase);
      refreshDashboard();
    },
    [supabase, refreshDashboard],
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <Suspense fallback={<ChartSkeleton />}>
          <MetricsDashboard
            key={refreshKey}
            onAddSource={handleAddSource}
            onSourceClick={handleSourceClick}
          />
        </Suspense>

        {/* Live Integrations Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Live Integrations
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supabase Stats */}
            <Suspense fallback={<ChartSkeleton />}>
              <SupabaseStatsCard showChart={true} />
            </Suspense>

            {/* GitHub Stats */}
            <Suspense fallback={<ChartSkeleton />}>
              <GitHubMetricsCard
                owner="mejohnc-ft"
                repo="MeJohnC.Org"
                showChart={true}
              />
            </Suspense>
          </div>
        </div>
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
