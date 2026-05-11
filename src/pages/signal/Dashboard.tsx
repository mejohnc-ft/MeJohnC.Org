import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Calendar, CheckSquare, ArrowRight, Plus } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

const tierColors: Record<string, string> = {
  anchor: "text-blue-500 bg-blue-500/10",
  capex_flow: "text-violet-500 bg-violet-500/10",
  moonshot: "text-orange-500 bg-orange-500/10",
  cash: "text-slate-400 bg-slate-500/10",
};

const tiers = ["anchor", "capex_flow", "moonshot", "cash"];

const checklistItems = [
  "Review active firings",
  "Check concentration limits",
  "Scan upcoming catalysts",
  "Plan Friday deployment",
  "Update journal",
];

const metrics = [
  { label: "Today P/L", value: "$0", sub: "+0.00%", delta: 0 },
  { label: "YTD return", value: "0.00%", delta: 0 },
  { label: "vs SPY", value: "0.00%", sub: "year to date", delta: 0 },
  { label: "Next deploy", value: "Friday", sub: "$0 queued" },
];

export default function Dashboard() {
  useSEO({ title: "Signal — Dashboard", noIndex: true });

  return (
    <SignalLayout>
      <div className="p-6 space-y-5 max-w-5xl">
        {/* Portfolio header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
              Portfolio value
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-mono font-medium tabular-nums">
                $0
              </span>
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                cash $0
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              today +$0.00 &nbsp;(0.00%)
            </p>
          </div>
          <Link
            to="/signal/portfolio"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add position
          </Link>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                {m.label}
              </p>
              <p
                className={`text-xl font-mono tabular-nums ${
                  m.delta !== undefined
                    ? m.delta > 0
                      ? "text-emerald-500"
                      : m.delta < 0
                        ? "text-red-500"
                        : "text-foreground"
                    : "text-foreground"
                }`}
              >
                {m.value}
              </p>
              {m.sub && (
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {m.sub}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Holdings by tier */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Holdings</h2>
            <Link
              to="/signal/portfolio"
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              all positions <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {tiers.map((tier) => (
            <div
              key={tier}
              className="px-4 py-3 border-b border-border last:border-0"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${tierColors[tier]}`}
                >
                  {tier.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  $0 · 0%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-2">
                No positions — add your first holding
              </p>
            </div>
          ))}
        </div>

        {/* Checklist + active alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">This week</h2>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                0 / {checklistItems.length}
              </span>
            </div>
            <div className="divide-y divide-border">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-3.5 h-3.5 rounded border border-border flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">Active alerts</h2>
              </div>
              <Link
                to="/signal/firings"
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="px-4 py-10 text-center">
              <p className="text-xs text-muted-foreground">No active firings</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">
                Signal engine not yet running
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming catalysts */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Upcoming catalysts</h2>
            </div>
            <Link
              to="/signal/catalysts"
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              calendar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">No catalysts added</p>
            <p className="text-[11px] text-muted-foreground/50 mt-1">
              Add positions to auto-populate earnings dates
            </p>
          </div>
        </div>

        {/* Smart money feed */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Smart money feed</h2>
            <Link
              to="/signal/firings"
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              all firings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Signal ingestion not yet configured
            </p>
            <Link
              to="/signal/settings"
              className="text-[11px] text-primary hover:underline mt-2 inline-block"
            >
              Configure signal sources →
            </Link>
          </div>
        </div>

        {/* Friday deployment plan */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h2 className="text-sm font-medium">Friday deployment plan</h2>
              <p className="text-[11px] text-muted-foreground">
                $0 available to deploy
              </p>
            </div>
            <Link
              to="/signal/discipline"
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              configure <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {tiers.map((tier) => (
              <div key={tier} className="text-center">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full inline-block ${tierColors[tier]} mb-2`}
                >
                  {tier.replace("_", " ")}
                </span>
                <p className="text-sm font-mono tabular-nums">$0</p>
                <p className="text-[10px] text-muted-foreground">0% target</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 pb-8">
          <Link
            to="/signal/portfolio"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add position
          </Link>
          <Link
            to="/signal/journal"
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors"
          >
            Write note
          </Link>
        </div>
      </div>
    </SignalLayout>
  );
}
