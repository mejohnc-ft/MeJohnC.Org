import { useState } from "react";
import { Radio, RefreshCw } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

type SourceCategory =
  | "all"
  | "sec"
  | "government"
  | "congress"
  | "market"
  | "analyst";

const categories: { id: SourceCategory; label: string }[] = [
  { id: "all", label: "All sources" },
  { id: "sec", label: "SEC EDGAR" },
  { id: "government", label: "Government" },
  { id: "congress", label: "Congress" },
  { id: "market", label: "Market" },
  { id: "analyst", label: "Analyst" },
];

const sourceBadgeColors: Record<string, string> = {
  sec: "bg-blue-500/15 text-blue-500",
  government: "bg-amber-500/15 text-amber-500",
  congress: "bg-violet-500/15 text-violet-500",
  market: "bg-emerald-500/15 text-emerald-500",
  analyst: "bg-pink-500/15 text-pink-500",
  macro: "bg-orange-500/15 text-orange-500",
};

export default function SignalFeed() {
  useSEO({ title: "Signal — Feed", noIndex: true });
  const [activeCategory, setActiveCategory] = useState<SourceCategory>("all");

  return (
    <SignalLayout>
      <div className="p-6 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">Signal feed</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Raw events from all configured sources
            </p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Source filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeCategory === c.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Source status cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              id: "edgar_8k",
              label: "SEC EDGAR — 8-K",
              category: "sec",
              status: "not configured",
              schedule: "every 5 min",
            },
            {
              id: "edgar_form4",
              label: "SEC EDGAR — Form 4",
              category: "sec",
              status: "not configured",
              schedule: "every 15 min",
            },
            {
              id: "whitehouse",
              label: "White House press releases",
              category: "government",
              status: "not configured",
              schedule: "every 15 min",
            },
            {
              id: "fed_register",
              label: "Federal Register",
              category: "government",
              status: "not configured",
              schedule: "hourly",
            },
            {
              id: "capitol_trades",
              label: "Capitol Trades",
              category: "congress",
              status: "not configured",
              schedule: "every 30 min",
            },
            {
              id: "substack",
              label: "Substack RSS",
              category: "analyst",
              status: "not configured",
              schedule: "hourly",
            },
          ].map((source) => (
            <div
              key={source.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${sourceBadgeColors[source.category]}`}
                >
                  {source.category}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60 px-2 py-0.5 border border-border rounded-full">
                  {source.status}
                </span>
              </div>
              <p className="text-xs font-medium">{source.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {source.schedule}
              </p>
            </div>
          ))}
        </div>

        {/* Event feed (empty state) */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Event stream</h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              0 events
            </span>
          </div>
          <div className="px-4 py-16 text-center">
            <Radio className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No events ingested yet
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-xs mx-auto">
              Configure Supabase Edge Functions and API keys to start pulling
              from live sources.
            </p>
          </div>
        </div>

        {/* Setup guide */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-medium">Setup checklist</h2>
          {[
            {
              step: "1",
              label: "Add Supabase Edge Function: ingest-sec-edgar",
              done: false,
            },
            {
              step: "2",
              label: "Set SEC_EDGAR_USER_AGENT env var",
              done: false,
            },
            {
              step: "3",
              label: "Add Capitol Trades API key (CAPITOL_TRADES_API_KEY)",
              done: false,
            },
            {
              step: "4",
              label: "Configure pg_cron job to invoke ingest functions",
              done: false,
            },
            {
              step: "5",
              label: "Enable Supabase Realtime on events table",
              done: false,
            },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px] font-mono ${
                  item.done
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {item.step}
              </div>
              <span
                className={`text-xs ${item.done ? "line-through text-muted-foreground" : ""}`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SignalLayout>
  );
}
