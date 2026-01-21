/**
 * Source Detail Panel Component
 *
 * Slide-over panel for viewing metric source details.
 * Shows configuration, sync status, and provides edit/delete actions.
 */

'use client';

import { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Github,
  Activity,
  TrendingUp,
  Webhook,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { MetricsSource } from '../schemas';

export interface SourceDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  source: MetricsSource | null;
  onEdit: (source: MetricsSource) => void;
  onDelete: (source: MetricsSource) => Promise<void>;
}

function getSourceIcon(sourceType: string) {
  switch (sourceType) {
    case 'github':
      return Github;
    case 'analytics':
      return TrendingUp;
    case 'supabase':
      return Database;
    case 'webhook':
      return Webhook;
    default:
      return Activity;
  }
}

function getSourceColor(sourceType: string): string {
  switch (sourceType) {
    case 'github':
      return 'text-purple-500 bg-purple-500/10';
    case 'analytics':
      return 'text-blue-500 bg-blue-500/10';
    case 'supabase':
      return 'text-green-500 bg-green-500/10';
    case 'webhook':
      return 'text-orange-500 bg-orange-500/10';
    default:
      return 'text-gray-500 bg-gray-500/10';
  }
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function SourceDetailPanel({
  isOpen,
  onClose,
  source,
  onEdit,
  onDelete,
}: SourceDetailPanelProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!source) return null;

  const Icon = getSourceIcon(source.source_type);
  const colorClasses = getSourceColor(source.source_type);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(source);
      onClose();
    } catch (error) {
      console.error('Failed to delete source:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l shadow-xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colorClasses}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">{source.name}</h2>
                    <p className="text-sm text-muted-foreground">{source.slug}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status */}
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Status</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {source.is_active ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Active</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">Inactive</span>
                        </>
                      )}
                    </div>
                    <Badge variant={source.is_active ? 'default' : 'secondary'}>
                      {source.source_type}
                    </Badge>
                  </div>
                </Card>

                {/* Description */}
                {source.description && (
                  <Card className="p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <p className="text-sm">{source.description}</p>
                  </Card>
                )}

                {/* Sync Info */}
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Sync Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">Last Sync</span>
                      </div>
                      <p className="text-sm font-medium">
                        {formatRelativeTime(source.last_refresh_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(source.last_refresh_at)}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <RefreshCw className="w-3 h-3" />
                        <span className="text-xs">Interval</span>
                      </div>
                      <p className="text-sm font-medium">{source.refresh_interval_minutes} min</p>
                    </div>
                  </div>

                  {source.next_refresh_at && (
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">Next Sync</span>
                      </div>
                      <p className="text-sm">{formatDateTime(source.next_refresh_at)}</p>
                    </div>
                  )}

                  {source.error_count > 0 && (
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {source.error_count} error{source.error_count > 1 ? 's' : ''}
                        </span>
                      </div>
                      {source.last_error && (
                        <p className="text-xs text-destructive/80">{source.last_error}</p>
                      )}
                    </div>
                  )}
                </Card>

                {/* Configuration */}
                <Card className="p-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Configuration</h3>

                  <div className="space-y-2">
                    {source.endpoint_url && (
                      <div>
                        <span className="text-xs text-muted-foreground">Endpoint URL</span>
                        <p className="text-sm font-mono break-all">{source.endpoint_url}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-xs text-muted-foreground">Authentication</span>
                      <p className="text-sm capitalize">{source.auth_type || 'None'}</p>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Color</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="text-sm font-mono">{source.color}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Timestamps */}
                <Card className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Timestamps</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDateTime(source.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span>{formatDateTime(source.updated_at)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Actions */}
              <div className="p-6 border-t space-y-3">
                {showDeleteConfirm ? (
                  <div className="p-4 bg-destructive/10 rounded-lg space-y-3">
                    <p className="text-sm text-destructive">
                      Are you sure you want to delete this source? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => onEdit(source)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
