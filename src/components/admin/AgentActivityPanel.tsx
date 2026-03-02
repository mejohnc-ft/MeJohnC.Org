import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  Brain,
  TrendingUp,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import {
  getAgentActivityStats,
  type AgentActivityStats,
} from "@/lib/agent-platform-queries";
import type { AgentPlatform } from "@/lib/schemas";
import { captureException } from "@/lib/sentry";

interface AgentActivityPanelProps {
  agent: AgentPlatform;
  onClose: () => void;
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function formatLatency(ms: number): string {
  if (ms === 0) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function AgentActivityPanel({
  agent,
  onClose,
}: AgentActivityPanelProps) {
  const { supabase } = useAuthenticatedSupabase();
  const [stats, setStats] = useState<AgentActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(24);

  const fetchStats = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      const data = await getAgentActivityStats(agent.id, period, supabase);
      setStats(data);
    } catch (error) {
      captureException(error);
      console.error("Failed to load agent activity:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, agent.id, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">{agent.name}</h2>
            <p className="text-xs text-muted-foreground">Activity & Metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchStats}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Period selector */}
        <div className="flex gap-2">
          {[1, 6, 24, 168].map((hours) => (
            <button
              key={hours}
              onClick={() => setPeriod(hours)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === hours
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {hours === 1
                ? "1h"
                : hours === 6
                  ? "6h"
                  : hours === 24
                    ? "24h"
                    : "7d"}
            </button>
          ))}
        </div>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Commands"
                value={stats.total_commands}
                sub={`${stats.completed_commands} completed`}
                icon={Activity}
                color="text-blue-500"
              />
              <MetricCard
                label="Success Rate"
                value={`${stats.success_rate}%`}
                sub={`${stats.failed_commands} failed`}
                icon={
                  stats.success_rate >= 90
                    ? CheckCircle2
                    : stats.success_rate >= 70
                      ? TrendingUp
                      : XCircle
                }
                color={
                  stats.success_rate >= 90
                    ? "text-green-500"
                    : stats.success_rate >= 70
                      ? "text-yellow-500"
                      : "text-red-500"
                }
              />
              <MetricCard
                label="Avg Latency"
                value={formatLatency(stats.avg_latency_ms)}
                icon={Clock}
                color="text-purple-500"
              />
              <MetricCard
                label="Tool Calls"
                value={stats.total_tool_calls}
                icon={Wrench}
                color="text-orange-500"
              />
              <MetricCard
                label="Memories"
                value={stats.memory_count}
                icon={Brain}
                color="text-cyan-500"
              />
              <MetricCard
                label="Audit Events"
                value={stats.audit_events}
                icon={Activity}
                color="text-gray-500"
              />
            </div>

            {/* Top Tools */}
            {stats.top_tools.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Top Tools Used</h3>
                <div className="space-y-2">
                  {stats.top_tools.map((tool) => {
                    const maxCount = stats.top_tools[0]?.count || 1;
                    const pct = Math.round((tool.count / maxCount) * 100);
                    return (
                      <div key={tool.tool}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-mono text-xs">{tool.tool}</span>
                          <span className="text-muted-foreground text-xs">
                            {tool.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Recent Activity Timeline */}
            {stats.recent_activity.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {stats.recent_activity.map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {event.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(event.created_at)}
                          </span>
                        </div>
                        {event.resource_type && (
                          <p className="text-xs text-muted-foreground truncate">
                            {event.resource_type}
                            {event.resource_id
                              ? `: ${event.resource_id.slice(0, 8)}...`
                              : ""}
                          </p>
                        )}
                        {event.details &&
                          typeof event.details === "object" &&
                          Object.keys(event.details).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {event.details.command
                                ? String(event.details.command).slice(0, 80)
                                : JSON.stringify(event.details).slice(0, 80)}
                            </p>
                          )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            {/* Empty state */}
            {stats.total_commands === 0 && stats.audit_events === 0 && (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No activity in the last{" "}
                  {period === 1
                    ? "hour"
                    : period === 168
                      ? "7 days"
                      : `${period} hours`}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Unable to load activity data.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
