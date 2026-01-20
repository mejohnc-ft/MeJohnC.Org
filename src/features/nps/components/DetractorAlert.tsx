/**
 * Detractor Alert Component
 *
 * Displays alerts for new detractors requiring follow-up.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import { AlertTriangle, Mail, MessageSquare } from 'lucide-react';
import type { NPSResponse } from '../schemas';

interface DetractorAlertProps {
  detractors: NPSResponse[];
  onFollowup?: (responseId: string) => void;
}

export function DetractorAlert({ detractors, onFollowup }: DetractorAlertProps) {
  if (detractors.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-600 dark:text-red-400">
            {detractors.length} {detractors.length === 1 ? 'Detractor' : 'Detractors'} Require Follow-up
          </h3>
          <p className="text-sm text-muted-foreground">
            These customers gave low scores and may need immediate attention.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {detractors.slice(0, 5).map((detractor) => (
          <div
            key={detractor.id}
            className="bg-background border border-border rounded-lg p-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-red-500">{detractor.score}</span>
                <div>
                  <p className="font-medium text-foreground">
                    {detractor.email || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(detractor.responded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {detractor.feedback && (
                <p className="text-sm text-muted-foreground italic">
                  "{detractor.feedback}"
                </p>
              )}
            </div>
            {onFollowup && (
              <div className="flex gap-2">
                <button
                  onClick={() => onFollowup(detractor.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Follow Up
                </button>
              </div>
            )}
          </div>
        ))}

        {detractors.length > 5 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            And {detractors.length - 5} more detractors...
          </p>
        )}
      </div>
    </div>
  );
}
