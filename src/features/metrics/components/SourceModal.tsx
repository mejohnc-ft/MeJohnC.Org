/**
 * Source Modal Component
 *
 * Modal dialog for creating and editing metric sources.
 * Supports different source types with conditional fields.
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Database, Github, Activity, TrendingUp, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { MetricsSource } from '../schemas';

export type SourceType = 'github' | 'analytics' | 'supabase' | 'webhook' | 'custom';
export type AuthType = 'none' | 'api_key' | 'oauth' | 'bearer';

export interface SourceFormData {
  name: string;
  slug: string;
  description: string;
  source_type: SourceType;
  endpoint_url: string;
  auth_type: AuthType;
  auth_config: Record<string, string>;
  refresh_interval_minutes: number;
  is_active: boolean;
  color: string;
}

export interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SourceFormData) => Promise<void>;
  source?: MetricsSource | null;
  mode: 'create' | 'edit';
}

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string; icon: typeof Database }[] = [
  { value: 'github', label: 'GitHub', icon: Github },
  { value: 'analytics', label: 'Analytics', icon: TrendingUp },
  { value: 'supabase', label: 'Supabase', icon: Database },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'custom', label: 'Custom', icon: Activity },
];

const AUTH_TYPE_OPTIONS: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'oauth', label: 'OAuth' },
];

const SOURCE_COLORS: string[] = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const DEFAULT_FORM_DATA: SourceFormData = {
  name: '',
  slug: '',
  description: '',
  source_type: 'custom',
  endpoint_url: '',
  auth_type: 'none',
  auth_config: {},
  refresh_interval_minutes: 60,
  is_active: true,
  color: SOURCE_COLORS[0],
};

export function SourceModal({ isOpen, onClose, onSave, source, mode }: SourceModalProps) {
  const [formData, setFormData] = useState<SourceFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SourceFormData, string>>>({});

  useEffect(() => {
    if (source && mode === 'edit') {
      setFormData({
        name: source.name,
        slug: source.slug,
        description: source.description || '',
        source_type: source.source_type as SourceType,
        endpoint_url: source.endpoint_url || '',
        auth_type: (source.auth_type || 'none') as AuthType,
        auth_config: (source.auth_config as Record<string, string>) || {},
        refresh_interval_minutes: source.refresh_interval_minutes,
        is_active: source.is_active,
        color: source.color,
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    setErrors({});
  }, [source, mode, isOpen]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: mode === 'create' ? generateSlug(name) : prev.slug,
    }));
  };

  const handleAuthConfigChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      auth_config: { ...prev.auth_config, [key]: value },
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SourceFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    if (formData.source_type === 'webhook' && !formData.endpoint_url.trim()) {
      newErrors.endpoint_url = 'Endpoint URL is required for webhooks';
    }

    if (formData.auth_type === 'api_key' && !formData.auth_config.api_key?.trim()) {
      newErrors.auth_config = 'API key is required';
    }

    if (formData.auth_type === 'bearer' && !formData.auth_config.token?.trim()) {
      newErrors.auth_config = 'Bearer token is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save source:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-background border shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {mode === 'create' ? 'Add Data Source' : 'Edit Data Source'}
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Data Source"
                  disabled={isSaving}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="my-data-source"
                  disabled={isSaving}
                />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={2}
                  disabled={isSaving}
                />
              </div>

              {/* Source Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {SOURCE_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.source_type === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, source_type: option.value }))
                        }
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                        disabled={isSaving}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint URL (conditional) */}
              {(formData.source_type === 'webhook' || formData.source_type === 'custom') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Endpoint URL</label>
                  <Input
                    value={formData.endpoint_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endpoint_url: e.target.value }))
                    }
                    placeholder="https://api.example.com/metrics"
                    disabled={isSaving}
                  />
                  {errors.endpoint_url && (
                    <p className="text-xs text-destructive">{errors.endpoint_url}</p>
                  )}
                </div>
              )}

              {/* Auth Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Authentication</label>
                <div className="grid grid-cols-4 gap-2">
                  {AUTH_TYPE_OPTIONS.map((option) => {
                    const isSelected = formData.auth_type === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, auth_type: option.value }))}
                        className={`p-2 rounded-lg border text-sm transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                        disabled={isSaving}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auth Config (conditional) */}
              {formData.auth_type === 'api_key' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <Input
                    type="password"
                    value={formData.auth_config.api_key || ''}
                    onChange={(e) => handleAuthConfigChange('api_key', e.target.value)}
                    placeholder="Enter API key"
                    disabled={isSaving}
                  />
                  {errors.auth_config && (
                    <p className="text-xs text-destructive">{errors.auth_config}</p>
                  )}
                </div>
              )}

              {formData.auth_type === 'bearer' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bearer Token</label>
                  <Input
                    type="password"
                    value={formData.auth_config.token || ''}
                    onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                    placeholder="Enter bearer token"
                    disabled={isSaving}
                  />
                  {errors.auth_config && (
                    <p className="text-xs text-destructive">{errors.auth_config}</p>
                  )}
                </div>
              )}

              {/* Refresh Interval */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Refresh Interval (minutes)</label>
                <Input
                  type="number"
                  value={formData.refresh_interval_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      refresh_interval_minutes: parseInt(e.target.value) || 60,
                    }))
                  }
                  min={1}
                  disabled={isSaving}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2">
                  {SOURCE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-primary' : 'bg-muted'
                  }`}
                  disabled={isSaving}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-medium">Active</label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {mode === 'create' ? 'Create Source' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
