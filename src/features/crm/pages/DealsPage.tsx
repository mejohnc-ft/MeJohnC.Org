/**
 * DealsPage Component
 *
 * List view of all deals with filtering, creation, and editing
 */

import { useState, useEffect, useCallback } from "react";
import { DollarSign, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import { DealCard } from "../components/DealCard";
import { DealForm } from "../components/DealForm";
import type { DealWithDetails, Deal } from "../schemas";
import { getDeals, createDeal, updateDeal } from "@/lib/crm-queries";

const DealsPage = () => {
  useSEO({ title: "CRM - Deals", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("open");
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithDetails | null>(null);

  const loadDeals = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const data = await getDeals(
        {
          status: (selectedStatus as DealWithDetails["status"]) || undefined,
        },
        supabase,
      );
      setDeals(data);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "DealsPage.loadDeals",
        },
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase, selectedStatus]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

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
      await loadDeals();
    },
    [supabase, loadDeals],
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
      await loadDeals();
    },
    [supabase, editingDeal, loadDeals],
  );

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isFormOpen = showForm || editingDeal !== null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Deals</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage your sales pipeline
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Deal
          </Button>
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
                initialData={editingDeal ?? undefined}
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Value</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-muted-foreground mb-1 text-sm">
              Total Deals
            </div>
            <p className="text-2xl font-bold">{deals.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-muted-foreground mb-1 text-sm">
              Average Value
            </div>
            <p className="text-2xl font-bold">
              {deals.length > 0
                ? formatCurrency(totalValue / deals.length)
                : "$0"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="">All</option>
          </select>
        </div>

        {/* Deal List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No deals yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first deal to get started
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => setEditingDeal(deal)}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DealsPage;
