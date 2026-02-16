import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Download, ChevronDown, ChevronRight, Filter, X, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getAuditLogEntries, formatPlatformAuditAction, formatPlatformTableName, type AuditLogFilters } from '@/lib/audit-platform';
import type { AuditLogEntry } from '@/lib/schemas';

const PAGE_SIZE = 100;

const actorTypeColors: Record<string, string> = {
  user: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  agent: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  system: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  scheduler: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

function exportCSV(entries: AuditLogEntry[]) {
  const headers = ['Timestamp', 'Actor Type', 'Actor ID', 'Action', 'Resource Type', 'Resource ID', 'Correlation ID'];
  const rows = entries.map(e => [
    e.timestamp, e.actor_type, e.actor_id || '', e.action,
    e.resource_type || '', e.resource_id || '', e.correlation_id || ''
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(entries: AuditLogEntry[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function truncateId(id: string | null, maxLength = 8): string {
  if (!id) return '-';
  return id.length > maxLength ? `${id.slice(0, maxLength)}...` : id;
}

export default function AuditLog() {
  useSEO({ title: 'Audit Log', noIndex: true });

  const supabase = useAuthenticatedSupabase();

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch entries when filters or page change
  const fetchEntries = useCallback(async () => {
    if (!supabase) return;

    setIsLoading(true);
    try {
      const data = await getAuditLogEntries(
        filters,
        PAGE_SIZE,
        page * PAGE_SIZE,
        supabase
      );
      setEntries(data);
    } catch (error) {
      captureException(error as Error, { context: 'AuditLog.fetchEntries', filters, page });
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filters, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Client-side search filter
  const filteredEntries = searchQuery
    ? entries.filter(e =>
        e.action.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setPage(0);
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Set correlation ID filter when clicking a correlation ID
  const setCorrelationFilter = (correlationId: string) => {
    setFilters(prev => ({ ...prev, correlationId }));
    setPage(0);
  };

  if (!supabase) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery;

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSearch className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Audit Log</h1>
              <p className="text-sm text-muted-foreground">
                Platform activity and change history
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(filteredEntries)}
              disabled={filteredEntries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportJSON(filteredEntries)}
              disabled={filteredEntries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Filters</h2>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Search Action
              </label>
              <Input
                placeholder="Filter by action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Actor Type */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Actor Type
              </label>
              <select
                className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
                value={filters.actorType || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    actorType: e.target.value ? e.target.value as AuditLogFilters['actorType'] : undefined
                  }));
                  setPage(0);
                }}
              >
                <option value="">All</option>
                <option value="user">User</option>
                <option value="agent">Agent</option>
                <option value="system">System</option>
                <option value="scheduler">Scheduler</option>
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Resource Type
              </label>
              <select
                className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
                value={filters.resourceType || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    resourceType: e.target.value || undefined
                  }));
                  setPage(0);
                }}
              >
                <option value="">All</option>
                <option value="agents">Agent</option>
                <option value="workflows">Workflow</option>
                <option value="workflow_runs">Workflow Run</option>
                <option value="integrations">Integration</option>
                <option value="credentials">Credential</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Start Date
              </label>
              <input
                type="datetime-local"
                className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
                value={filters.startDate || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    startDate: e.target.value || undefined
                  }));
                  setPage(0);
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                End Date
              </label>
              <input
                type="datetime-local"
                className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground w-full"
                value={filters.endDate || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    endDate: e.target.value || undefined
                  }));
                  setPage(0);
                }}
              />
            </div>

            {/* Correlation ID */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Correlation ID
              </label>
              <Input
                placeholder="Filter by correlation ID..."
                value={filters.correlationId || ''}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    correlationId: e.target.value || undefined
                  }));
                  setPage(0);
                }}
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSearch className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-1">No audit logs found</h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Audit logs will appear here as actions are performed'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Timestamp
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Actor
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Actor ID
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Action
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Resource
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Resource ID
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Correlation ID
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-16">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEntries.map((entry) => {
                      const isExpanded = expandedRows.has(entry.id);
                      return (
                        <tr key={entry.id}>
                          <td colSpan={8} className="p-0">
                            <div className="hover:bg-muted/50 transition-colors">
                              <div className="grid grid-cols-[1fr_auto_auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3">
                                <div className="text-sm text-foreground">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </div>
                                <div>
                                  <Badge
                                    variant="outline"
                                    className={actorTypeColors[entry.actor_type] || 'bg-gray-500/10 text-gray-500'}
                                  >
                                    {entry.actor_type}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  {truncateId(entry.actor_id)}
                                </div>
                                <div className="text-sm text-foreground font-medium">
                                  {formatPlatformAuditAction(entry.action)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {entry.resource_type ? formatPlatformTableName(entry.resource_type) : '-'}
                                </div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  {truncateId(entry.resource_id)}
                                </div>
                                <div className="text-sm">
                                  {entry.correlation_id ? (
                                    <button
                                      onClick={() => setCorrelationFilter(entry.correlation_id!)}
                                      className="text-primary hover:underline font-mono"
                                      title="Filter by this correlation ID"
                                    >
                                      {truncateId(entry.correlation_id)}
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                                <div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRow(entry.id)}
                                    className="p-1 h-auto"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {/* Expanded details */}
                              {isExpanded && entry.details && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="px-4 pb-4"
                                >
                                  <Separator className="mb-4" />
                                  <div className="text-xs text-muted-foreground mb-2 font-semibold">
                                    Details:
                                  </div>
                                  <pre className="font-mono text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64">
                                    {JSON.stringify(entry.details, null, 2)}
                                  </pre>
                                </motion.div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={filteredEntries.length < PAGE_SIZE || isLoading}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
