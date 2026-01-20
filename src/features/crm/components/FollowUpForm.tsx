/**
 * FollowUpForm Component
 *
 * Form for creating and editing follow-ups
 */

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FollowUp, FollowUpType, FollowUpPriority } from '../schemas';

interface FollowUpFormData {
  title: string;
  description: string;
  follow_up_type: FollowUpType;
  priority: FollowUpPriority;
  due_at: string;
  remind_at: string;
}

interface FollowUpFormProps {
  contactId: string;
  initialData?: Partial<FollowUpFormData>;
  onSubmit: (data: Omit<FollowUp, 'id' | 'created_at' | 'tenant_id' | 'status' | 'completed_at' | 'completed_by' | 'completion_notes' | 'is_recurring' | 'recurrence_rule' | 'parent_follow_up_id' | 'created_by'>) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

const emptyFormData: FollowUpFormData = {
  title: '',
  description: '',
  follow_up_type: 'reminder',
  priority: 'normal',
  due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  remind_at: '',
};

export function FollowUpForm({ contactId, initialData, onSubmit, onCancel, isEditing = false }: FollowUpFormProps) {
  const [formData, setFormData] = useState<FollowUpFormData>({ ...emptyFormData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        contact_id: contactId,
        ...formData,
        remind_at: formData.remind_at || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          placeholder="Additional details..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Type</label>
          <select
            value={formData.follow_up_type}
            onChange={(e) => setFormData({ ...formData, follow_up_type: e.target.value as FollowUpType })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            required
          >
            <option value="reminder">Reminder</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="task">Task</option>
            <option value="review">Review</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as FollowUpPriority })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            required
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Due Date *</label>
          <input
            type="datetime-local"
            value={formData.due_at}
            onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Reminder Date</label>
          <input
            type="datetime-local"
            value={formData.remind_at}
            onChange={(e) => setFormData({ ...formData, remind_at: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
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
              {isEditing ? 'Update' : 'Create'} Follow-up
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
