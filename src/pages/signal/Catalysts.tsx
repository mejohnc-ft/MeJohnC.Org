import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Plus, X, ChevronDown } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

type CatalystType =
  | "earnings"
  | "macro"
  | "policy"
  | "custom"
  | "expected_announcement";
type Impact = "low" | "medium" | "high";

const typeColors: Record<CatalystType, string> = {
  earnings: "bg-blue-500/15 text-blue-500",
  macro: "bg-violet-500/15 text-violet-500",
  policy: "bg-amber-500/15 text-amber-500",
  custom: "bg-slate-500/15 text-slate-400",
  expected_announcement: "bg-emerald-500/15 text-emerald-500",
};

const impactDot: Record<Impact, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

const macroEvents = [
  {
    date: "2026-05-13",
    label: "CPI — April",
    type: "macro" as const,
    impact: "high" as const,
  },
  {
    date: "2026-05-22",
    label: "FOMC minutes",
    type: "macro" as const,
    impact: "high" as const,
  },
  {
    date: "2026-06-06",
    label: "NFP report",
    type: "macro" as const,
    impact: "medium" as const,
  },
  {
    date: "2026-06-17",
    label: "FOMC decision",
    type: "macro" as const,
    impact: "high" as const,
  },
];

export default function Catalysts() {
  useSEO({ title: "Signal — Catalysts", noIndex: true });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    ticker: "",
    type: "custom" as CatalystType,
    scheduledFor: "",
    impact: "medium" as Impact,
    description: "",
  });

  return (
    <SignalLayout>
      <div className="p-6 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">Catalyst calendar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Earnings, macro events, and custom catalysts
            </p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {showAdd ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {showAdd ? "Cancel" : "Add catalyst"}
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="text-sm font-medium mb-4">New catalyst</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Ticker (optional)
                    </label>
                    <input
                      type="text"
                      value={form.ticker}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          ticker: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="NVDA"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Type
                    </label>
                    <div className="relative">
                      <select
                        value={form.type}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            type: e.target.value as CatalystType,
                          }))
                        }
                        className="w-full appearance-none px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary pr-8"
                      >
                        <option value="earnings">Earnings</option>
                        <option value="macro">Macro</option>
                        <option value="policy">Policy</option>
                        <option value="expected_announcement">
                          Expected announcement
                        </option>
                        <option value="custom">Custom</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={form.scheduledFor}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, scheduledFor: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Impact
                    </label>
                    <div className="relative">
                      <select
                        value={form.impact}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            impact: e.target.value as Impact,
                          }))
                        }
                        className="w-full appearance-none px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary pr-8"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Description
                    </label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="What are you expecting?"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    disabled
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
                  >
                    Save catalyst
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    Connect Supabase to persist catalysts
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Macro calendar */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Macro events</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sourced from public macro calendar
            </p>
          </div>
          <div className="divide-y divide-border">
            {macroEvents.map((e) => (
              <div key={e.label} className="flex items-center gap-4 px-4 py-3">
                <div className="w-16 flex-shrink-0">
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {e.date}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${typeColors[e.type]}`}
                >
                  {e.type}
                </span>
                <p className="text-xs flex-1">{e.label}</p>
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${impactDot[e.impact]}`}
                  title={`${e.impact} impact`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Custom + earnings catalysts */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Earnings &amp; custom</h2>
            </div>
          </div>
          <div className="px-4 py-10 text-center">
            <p className="text-xs text-muted-foreground">
              No earnings dates loaded
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Add tickers to your portfolio or watchlist to auto-populate
              earnings dates
            </p>
          </div>
        </div>
      </div>
    </SignalLayout>
  );
}
