/**
 * DealPipeline Component
 *
 * Visual pipeline board for deals
 */

import { DealCard } from './DealCard';
import type { DealWithDetails, PipelineStage } from '../schemas';

interface DealPipelineProps {
  stages: PipelineStage[];
  deals: DealWithDetails[];
  onDealClick?: (deal: DealWithDetails) => void;
}

export function DealPipeline({ stages, deals, onDealClick }: DealPipelineProps) {
  const getDealsByStage = (stageId: string) => {
    return deals.filter(deal => deal.stage_id === stageId);
  };

  const getTotalValue = (stageDeals: DealWithDetails[]) => {
    return stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {stages.map(stage => {
        const stageDeals = getDealsByStage(stage.id);
        const totalValue = getTotalValue(stageDeals);

        return (
          <div key={stage.id} className="flex flex-col">
            {/* Stage Header */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-medium text-foreground">{stage.name}</h3>
                <span className="text-sm text-muted-foreground">({stageDeals.length})</span>
              </div>
              {totalValue > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(totalValue)}
                </p>
              )}
            </div>

            {/* Deals */}
            <div className="space-y-2 flex-1">
              {stageDeals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No deals
                </div>
              ) : (
                stageDeals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onClick={() => onDealClick?.(deal)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
