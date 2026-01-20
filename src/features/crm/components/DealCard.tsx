/**
 * DealCard Component
 *
 * Card view of a deal
 */

import { DollarSign, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DealWithDetails } from '../schemas';

interface DealCardProps {
  deal: DealWithDetails;
  onClick?: () => void;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-500',
  won: 'bg-green-500/10 text-green-500',
  lost: 'bg-red-500/10 text-red-500',
};

export function DealCard({ deal, onClick }: DealCardProps) {
  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate mb-1">{deal.name}</h3>
          {deal.contact && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {deal.contact.first_name || ''} {deal.contact.last_name || ''} {deal.contact.company && `(${deal.contact.company})`}
            </p>
          )}
        </div>
        <Badge variant="outline" className={statusColors[deal.status]}>
          {deal.status}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {formatCurrency(deal.value, deal.currency)}
          </span>
        </div>

        {deal.stage && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stage</span>
            <Badge variant="secondary">{deal.stage.name}</Badge>
          </div>
        )}

        {deal.close_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Close Date</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(deal.close_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {deal.probability !== null && deal.probability !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Probability</span>
            <span>{deal.probability}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
