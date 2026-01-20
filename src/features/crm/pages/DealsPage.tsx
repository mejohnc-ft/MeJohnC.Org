/**
 * DealsPage Component
 *
 * List view of all deals with filtering
 */

import { useState, useEffect } from 'react';
import { DollarSign, Plus, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { DealCard } from '../components/DealCard';
import type { DealWithDetails } from '../schemas';
import { getDeals } from '@/lib/crm-queries';

const DealsPage = () => {
  useSEO({ title: 'CRM - Deals', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('open');

  useEffect(() => {
    loadDeals();
  }, [selectedStatus]);

  const loadDeals = async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const data = await getDeals({
        status: selectedStatus as any || undefined,
      }, supabase);
      setDeals(data);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'DealsPage.loadDeals',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Deal
          </Button>
        </div>

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
            <div className="text-muted-foreground mb-1 text-sm">Total Deals</div>
            <p className="text-2xl font-bold">{deals.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-muted-foreground mb-1 text-sm">Average Value</div>
            <p className="text-2xl font-bold">
              {deals.length > 0 ? formatCurrency(totalValue / deals.length) : '$0'}
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
            <p className="text-muted-foreground mb-4">Create your first deal to get started</p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map(deal => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DealsPage;
