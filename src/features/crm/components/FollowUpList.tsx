/**
 * FollowUpList Component
 *
 * Displays a list of follow-ups with status indicators
 */

import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FollowUp } from '../schemas';

interface FollowUpListProps {
  followUps: FollowUp[];
  onComplete?: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-500 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  normal: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  low: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
};

export function FollowUpList({ followUps, onComplete }: FollowUpListProps) {
  if (followUps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No follow-ups scheduled
      </div>
    );
  }

  const now = new Date().toISOString();

  return (
    <div className="space-y-2">
      {followUps.map(followUp => {
        const isOverdue = followUp.status === 'pending' && followUp.due_at < now;
        const isCompleted = followUp.status === 'completed';

        return (
          <div
            key={followUp.id}
            className={`flex items-center justify-between p-4 bg-card border rounded-lg ${
              isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-border'
            } ${isCompleted ? 'opacity-60' : ''}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : isOverdue ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
                <h4 className="font-medium text-foreground">{followUp.title}</h4>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(followUp.due_at).toLocaleString()}
                </span>
                <Badge variant="outline" className={priorityColors[followUp.priority]}>
                  {followUp.priority}
                </Badge>
                <Badge variant="outline">
                  {followUp.follow_up_type}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive">
                    Overdue
                  </Badge>
                )}
              </div>

              {followUp.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {followUp.description}
                </p>
              )}
            </div>

            {followUp.status === 'pending' && onComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onComplete(followUp.id)}
                className="ml-4"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
