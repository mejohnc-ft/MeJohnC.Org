/**
 * Survey Builder Component
 *
 * Form for creating and editing NPS surveys.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import type { NPSSurvey } from '../schemas';

interface SurveyBuilderProps {
  survey?: NPSSurvey;
  onSave: (data: SurveyFormData) => Promise<void>;
  onCancel: () => void;
}

export interface SurveyFormData {
  name: string;
  question: string;
  status: NPSSurvey['status'];
  target_segment: string;
  starts_at: string;
  ends_at: string;
}

export function SurveyBuilder({ survey, onSave, onCancel }: SurveyBuilderProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SurveyFormData>({
    name: survey?.name || '',
    question: survey?.question || 'How likely are you to recommend us to a friend or colleague?',
    status: survey?.status || 'draft',
    target_segment: survey?.target_segment || '',
    starts_at: survey?.starts_at || '',
    ends_at: survey?.ends_at || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Survey Details</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Survey Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Q1 2024 Customer Satisfaction"
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Question *</label>
          <textarea
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
            placeholder="How likely are you to recommend us to a friend or colleague?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as NPSSurvey['status'] })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Target Segment</label>
          <select
            value={formData.target_segment}
            onChange={(e) => setFormData({ ...formData, target_segment: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Users</option>
            <option value="active_users">Active Users</option>
            <option value="recent_customers">Recent Customers</option>
            <option value="subscribers">Newsletter Subscribers</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="datetime-local"
              value={formData.starts_at ? new Date(formData.starts_at).toISOString().slice(0, 16) : ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  starts_at: e.target.value ? new Date(e.target.value).toISOString() : '',
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="datetime-local"
              value={formData.ends_at ? new Date(formData.ends_at).toISOString().slice(0, 16) : ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ends_at: e.target.value ? new Date(e.target.value).toISOString() : '',
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : 'Save Survey'}
        </button>
      </div>
    </form>
  );
}
