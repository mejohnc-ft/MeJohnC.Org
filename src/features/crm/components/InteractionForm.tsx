/**
 * InteractionForm Component
 *
 * Form for logging new interactions
 */

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Interaction, InteractionType, Sentiment } from '../schemas';

interface InteractionFormData {
  interaction_type: InteractionType;
  subject: string;
  content: string;
  duration_minutes: number | null;
  outcome: string;
  sentiment: Sentiment | null;
  occurred_at: string;
}

interface InteractionFormProps {
  contactId: string;
  onSubmit: (data: Omit<Interaction, 'id' | 'created_at' | 'tenant_id' | 'created_by' | 'related_url' | 'attachments'>) => Promise<void>;
  onCancel: () => void;
}

const emptyFormData: InteractionFormData = {
  interaction_type: 'email_sent',
  subject: '',
  content: '',
  duration_minutes: null,
  outcome: '',
  sentiment: null,
  occurred_at: new Date().toISOString().slice(0, 16),
};

export function InteractionForm({ contactId, onSubmit, onCancel }: InteractionFormProps) {
  const [formData, setFormData] = useState<InteractionFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        contact_id: contactId,
        ...formData,
        related_url: null,
        attachments: [],
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Interaction Type</label>
          <select
            value={formData.interaction_type}
            onChange={(e) => setFormData({ ...formData, interaction_type: e.target.value as InteractionType })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            required
          >
            <option value="email_sent">Email Sent</option>
            <option value="email_received">Email Received</option>
            <option value="call_outbound">Call Outbound</option>
            <option value="call_inbound">Call Inbound</option>
            <option value="meeting">Meeting</option>
            <option value="video_call">Video Call</option>
            <option value="message">Message</option>
            <option value="linkedin_message">LinkedIn Message</option>
            <option value="note">Note</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Occurred At</label>
          <input
            type="datetime-local"
            value={formData.occurred_at}
            onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Subject</label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          placeholder="Brief summary"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Content / Notes</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          placeholder="Detailed notes about this interaction..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Duration (minutes)</label>
          <input
            type="number"
            value={formData.duration_minutes || ''}
            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            min="0"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Sentiment</label>
          <select
            value={formData.sentiment || ''}
            onChange={(e) => setFormData({ ...formData, sentiment: e.target.value as Sentiment || null })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">None</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Outcome</label>
          <input
            type="text"
            value={formData.outcome}
            onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            placeholder="e.g., Follow-up scheduled"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Log Interaction
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
