import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  AlertTriangle,
  Play,
  Pause,
  Eye,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/lib/seo";
import { useAuthenticatedSupabase } from "@/lib/supabase";

interface AgentActivity {
  id: string;
  agentName: string;
  agentType: "autonomous" | "supervised" | "tool";
  status: "running" | "idle" | "error" | "waiting_approval";
  currentTask: string | null;
  lastAction: string;
  lastActionTime: string;
  actionsCount: number;
  uptime: string;
}

interface ActivityEvent {
  id: string;
  agentName: string;
  type:
    | "tool_call"
    | "response"
    | "error"
    | "approval_request"
    | "approval_response";
  message: string;
  timestamp: string;
}

const STATUS_STYLES: Record<string, { bg: string; icon: typeof Activity }> = {
  running: {
    bg: "bg-green-500/10 border-green-500/30 text-green-400",
    icon: Play,
  },
  idle: { bg: "bg-gray-500/10 border-gray-500/30 text-gray-400", icon: Pause },
  error: { bg: "bg-red-500/10 border-red-500/30 text-red-400", icon: XCircle },
  waiting_approval: {
    bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    icon: AlertTriangle,
  },
};

function AgentCard({
  agent,
  isSelected,
  onSelect,
}: {
  agent: AgentActivity;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const style = STATUS_STYLES[agent.status] || STATUS_STYLES.idle;
  const StatusIcon = style.icon;

  return (
    <motion.button
      layout
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isSelected
          ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
          : "bg-card border-border hover:border-primary/20"
      }`}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-md border ${style.bg}`}>
            <StatusIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {agent.agentName}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {agent.agentType}
            </div>
          </div>
        </div>
        <Badge className={`text-[9px] ${style.bg}`}>
          {agent.status.replace("_", " ")}
        </Badge>
      </div>

      {agent.currentTask && (
        <div className="mt-2 text-xs text-muted-foreground truncate">
          <Terminal className="w-3 h-3 inline mr-1" />
          {agent.currentTask}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{agent.actionsCount} actions</span>
        <span>{agent.uptime}</span>
      </div>
    </motion.button>
  );
}

function ActivityStream({ events }: { events: ActivityEvent[] }) {
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [events]);

  const typeStyles: Record<string, string> = {
    tool_call: "text-blue-400",
    response: "text-green-400",
    error: "text-red-400",
    approval_request: "text-yellow-400",
    approval_response: "text-purple-400",
  };

  return (
    <div
      ref={streamRef}
      className="flex-1 overflow-y-auto font-mono text-xs space-y-1 p-3"
    >
      {events.length === 0 ? (
        <div className="text-muted-foreground/50 text-center py-8">
          No activity yet
        </div>
      ) : (
        events.map((event) => (
          <div key={event.id} className="flex gap-2">
            <span className="text-muted-foreground/50 shrink-0 tabular-nums">
              {new Date(event.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span className="text-muted-foreground/70 shrink-0">
              [{event.agentName}]
            </span>
            <span className={typeStyles[event.type] || "text-foreground"}>
              {event.message}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function ApprovalQueue({
  approvals,
  onApprove,
  onReject,
}: {
  approvals: ActivityEvent[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (approvals.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground/50 text-xs">
        No pending approvals
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {approvals.map((a) => (
        <div
          key={a.id}
          className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg"
        >
          <div className="text-xs text-foreground mb-1">{a.message}</div>
          <div className="text-[10px] text-muted-foreground mb-2">
            from {a.agentName}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => onApprove(a.id)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] text-destructive"
              onClick={() => onReject(a.id)}
            >
              <XCircle className="w-3 h-3 mr-1" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AgentWarRoom() {
  useSEO({ title: "Agent War Room", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  // Demo data — will be replaced with real Supabase Realtime subscriptions
  const [agents] = useState<AgentActivity[]>([
    {
      id: "1",
      agentName: "Customer Success",
      agentType: "supervised",
      status: "running",
      currentTask: "Analyzing NPS responses for Q1",
      lastAction: "Sent follow-up email to detractor",
      lastActionTime: new Date().toISOString(),
      actionsCount: 47,
      uptime: "2h 15m",
    },
    {
      id: "2",
      agentName: "Code Reviewer",
      agentType: "autonomous",
      status: "idle",
      currentTask: null,
      lastAction: "Reviewed PR #234",
      lastActionTime: new Date(Date.now() - 3600000).toISOString(),
      actionsCount: 12,
      uptime: "8h 30m",
    },
    {
      id: "3",
      agentName: "Content Writer",
      agentType: "supervised",
      status: "waiting_approval",
      currentTask: "Draft blog post: AI in 2026",
      lastAction: "Requesting approval for publish",
      lastActionTime: new Date(Date.now() - 600000).toISOString(),
      actionsCount: 23,
      uptime: "1h 45m",
    },
    {
      id: "4",
      agentName: "Infra Monitor",
      agentType: "autonomous",
      status: "running",
      currentTask: "Health check cycle #156",
      lastAction: "All 8 nodes healthy",
      lastActionTime: new Date(Date.now() - 120000).toISOString(),
      actionsCount: 312,
      uptime: "24h 0m",
    },
  ]);

  const [events] = useState<ActivityEvent[]>([
    {
      id: "e1",
      agentName: "Customer Success",
      type: "tool_call",
      message: "crm.getDetractors({ period: 'Q1', minResponses: 10 })",
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: "e2",
      agentName: "Customer Success",
      type: "response",
      message: "Found 3 detractors with NPS < 5",
      timestamp: new Date(Date.now() - 290000).toISOString(),
    },
    {
      id: "e3",
      agentName: "Infra Monitor",
      type: "tool_call",
      message: "infrastructure.healthCheck({ nodeIds: ['*'] })",
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: "e4",
      agentName: "Infra Monitor",
      type: "response",
      message: "All 8 nodes reporting healthy. Avg response: 142ms",
      timestamp: new Date(Date.now() - 118000).toISOString(),
    },
    {
      id: "e5",
      agentName: "Content Writer",
      type: "approval_request",
      message: 'Publish blog post "AI Trends in 2026: What to Expect"?',
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: "e6",
      agentName: "Customer Success",
      type: "tool_call",
      message: 'email.send({ to: "jane@corp.com", template: "nps-followup" })',
      timestamp: new Date(Date.now() - 30000).toISOString(),
    },
    {
      id: "e7",
      agentName: "Customer Success",
      type: "response",
      message: "Email sent successfully (id: msg_abc123)",
      timestamp: new Date(Date.now() - 28000).toISOString(),
    },
  ]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>("1");
  const [activeTab, setActiveTab] = useState<"stream" | "approvals">("stream");

  const pendingApprovals = events.filter((e) => e.type === "approval_request");
  const selectedEvents = selectedAgentId
    ? events.filter((e) => {
        const agent = agents.find((a) => a.id === selectedAgentId);
        return agent ? e.agentName === agent.agentName : false;
      })
    : events;

  const handleApprove = useCallback((id: string) => {
    console.log("Approved:", id);
  }, []);

  const handleReject = useCallback((id: string) => {
    console.log("Rejected:", id);
  }, []);

  // Stats
  const stats = {
    total: agents.length,
    running: agents.filter((a) => a.status === "running").length,
    pending: pendingApprovals.length,
    totalActions: agents.reduce((sum, a) => sum + a.actionsCount, 0),
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("agent-war-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "app", table: "agent_platform" },
        () => {
          // Refresh agent data when changes occur
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Bot className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Agent War Room
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-time agent collaboration view
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 font-medium">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: "Total Agents",
              value: stats.total,
              icon: Bot,
              color: "text-blue-400",
            },
            {
              label: "Running",
              value: stats.running,
              icon: Activity,
              color: "text-green-400",
            },
            {
              label: "Pending Approvals",
              value: stats.pending,
              icon: Clock,
              color: "text-yellow-400",
            },
            {
              label: "Total Actions",
              value: stats.totalActions,
              icon: Terminal,
              color: "text-purple-400",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <div>
                <div className="text-lg font-bold text-foreground">{value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Layout: Agents sidebar + Activity stream */}
        <div className="grid grid-cols-[280px_1fr] gap-4 h-[calc(100vh-280px)]">
          {/* Agents Sidebar */}
          <div className="space-y-2 overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedAgentId(null)}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                selectedAgentId === null
                  ? "bg-primary/5 border-primary/30 text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1.5" />
              All Agents
            </button>
            <AnimatePresence>
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onSelect={() => setSelectedAgentId(agent.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Activity Panel */}
          <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("stream")}
                className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "stream"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 inline mr-1.5" />
                Activity Stream
              </button>
              <button
                onClick={() => setActiveTab("approvals")}
                className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                  activeTab === "approvals"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
                Approvals
                {pendingApprovals.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[9px] font-bold">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            {activeTab === "stream" ? (
              <ActivityStream events={selectedEvents} />
            ) : (
              <div className="flex-1 overflow-y-auto">
                <ApprovalQueue
                  approvals={pendingApprovals}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
