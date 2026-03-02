import { useState, useEffect, useMemo } from "react";
import { Activity, HardDrive, Cpu, MemoryStick, Globe } from "lucide-react";

interface MetricSnapshot {
  timestamp: number;
  memoryUsed: number;
  memoryTotal: number;
  jsHeapUsed: number;
  jsHeapTotal: number;
  domNodes: number;
  windowCount: number;
}

function getMetrics(windowCount: number): MetricSnapshot {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
  };

  return {
    timestamp: Date.now(),
    memoryUsed: perf.memory?.usedJSHeapSize ?? 0,
    memoryTotal: perf.memory?.totalJSHeapSize ?? 0,
    jsHeapUsed: perf.memory?.usedJSHeapSize ?? 0,
    jsHeapTotal: perf.memory?.totalJSHeapSize ?? 0,
    domNodes: document.querySelectorAll("*").length,
    windowCount,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function SystemMonitorApp() {
  const [history, setHistory] = useState<MetricSnapshot[]>([]);
  const [windowCount, setWindowCount] = useState(0);

  // Count open windows from DOM (desktop windows have data-window attribute)
  useEffect(() => {
    const count = () => {
      const wins = document.querySelectorAll("[data-window-id]");
      setWindowCount(wins.length);
    };
    count();
    const interval = setInterval(count, 2000);
    return () => clearInterval(interval);
  }, []);

  // Collect metrics every 2 seconds
  useEffect(() => {
    const collect = () => {
      setHistory((prev) => {
        const snapshot = getMetrics(windowCount);
        const next = [...prev, snapshot];
        // Keep last 60 samples (2 minutes)
        return next.slice(-60);
      });
    };
    collect();
    const interval = setInterval(collect, 2000);
    return () => clearInterval(interval);
  }, [windowCount]);

  const latest = history[history.length - 1];

  const uptimeStr = useMemo(() => {
    const nav = performance as Performance & { timeOrigin?: number };
    const origin = nav.timeOrigin ?? Date.now();
    const elapsed = Math.round((Date.now() - origin) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${secs}s`;
  }, [history.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!latest) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Collecting metrics...
      </div>
    );
  }

  const heapPct =
    latest.jsHeapTotal > 0
      ? Math.round((latest.jsHeapUsed / latest.jsHeapTotal) * 100)
      : 0;

  return (
    <div className="h-full overflow-y-auto bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          <h2 className="text-sm font-semibold text-foreground">
            System Monitor
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Uptime: {uptimeStr}
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={MemoryStick}
          label="JS Heap"
          value={formatBytes(latest.jsHeapUsed)}
          sub={`of ${formatBytes(latest.jsHeapTotal)} (${heapPct}%)`}
          color="text-blue-500"
        />
        <MetricCard
          icon={Cpu}
          label="DOM Nodes"
          value={latest.domNodes.toLocaleString()}
          sub="Active elements"
          color="text-orange-500"
        />
        <MetricCard
          icon={HardDrive}
          label="Open Windows"
          value={String(windowCount)}
          sub="Desktop windows"
          color="text-purple-500"
        />
        <MetricCard
          icon={Globe}
          label="Screen"
          value={`${window.innerWidth}x${window.innerHeight}`}
          sub={`DPR: ${window.devicePixelRatio}`}
          color="text-cyan-500"
        />
      </div>

      {/* Heap Usage Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Heap Usage</span>
          <span>{heapPct}%</span>
        </div>
        <MiniBar
          value={latest.jsHeapUsed}
          max={latest.jsHeapTotal}
          color={
            heapPct > 80
              ? "bg-red-500"
              : heapPct > 60
                ? "bg-amber-500"
                : "bg-green-500"
          }
        />
      </div>

      {/* DOM Nodes Over Time (text sparkline) */}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">
          DOM Nodes (last 2 min)
        </span>
        <div className="flex items-end gap-px h-10">
          {history.slice(-30).map((snap, i) => {
            const maxDom = Math.max(...history.map((s) => s.domNodes), 1);
            const heightPct = (snap.domNodes / maxDom) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-blue-500/60 rounded-t-sm transition-all duration-300"
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Navigator Info */}
      <div className="text-[10px] text-muted-foreground space-y-0.5 border-t border-border pt-3">
        <div>Platform: {navigator.platform}</div>
        <div>Language: {navigator.language}</div>
        <div>Cores: {navigator.hardwareConcurrency ?? "N/A"}</div>
        <div>Online: {navigator.onLine ? "Yes" : "No"}</div>
      </div>
    </div>
  );
}
