/**
 * InteractionLog Component
 *
 * Timeline view of interactions with a contact
 */

import { Mail, Phone, MessageSquare, Video, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Interaction } from '../schemas';

interface InteractionLogProps {
  interactions: Interaction[];
}

const interactionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  email_sent: Mail,
  email_received: Mail,
  call_outbound: Phone,
  call_inbound: Phone,
  meeting: Calendar,
  video_call: Video,
  message: MessageSquare,
  linkedin_message: MessageSquare,
};

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-500/10 text-green-500',
  neutral: 'bg-gray-500/10 text-gray-500',
  negative: 'bg-red-500/10 text-red-500',
};

export function InteractionLog({ interactions }: InteractionLogProps) {
  if (interactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No interactions recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interactions.map((interaction, index) => {
        const Icon = interactionIcons[interaction.interaction_type] || MessageSquare;

        return (
          <div key={interaction.id} className="flex gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              {index < interactions.length - 1 && (
                <div className="w-0.5 flex-1 bg-border mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h4 className="font-medium text-foreground">
                    {interaction.subject || interaction.interaction_type.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(interaction.occurred_at).toLocaleString()}
                  </p>
                </div>
                {interaction.sentiment && (
                  <Badge variant="outline" className={sentimentColors[interaction.sentiment]}>
                    {interaction.sentiment}
                  </Badge>
                )}
              </div>

              {interaction.content && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                  {interaction.content}
                </p>
              )}

              {interaction.outcome && (
                <div className="mt-2">
                  <span className="text-sm font-medium">Outcome: </span>
                  <span className="text-sm text-muted-foreground">{interaction.outcome}</span>
                </div>
              )}

              {interaction.duration_minutes && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Duration: {interaction.duration_minutes} minutes
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
