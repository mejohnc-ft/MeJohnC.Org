import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

type Tier = "anchor" | "capex_flow" | "moonshot" | "cash";

const tierColors: Record<Tier, string> = {
  anchor: "text-blue-500 bg-blue-500/10",
  capex_flow: "text-violet-500 bg-violet-500/10",
  moonshot: "text-orange-500 bg-orange-500/10",
  cash: "text-slate-400 bg-slate-500/10",
};

const tiers: Tier[] = ["anchor", "capex_flow", "moonshot", "cash"];

interface NewPositionForm {
  ticker: string;
  shares: string;
  cost: string;
  tier: Tier;
  entryDate: string;
  notes: string;
}

const empty: NewPositionForm = {
  ticker: "",
  shares: "",
  cost: "",
  tier: "anchor",
  entryDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function Portfolio() {
  useSEO({ title: "Signal — Portfolio", noIndex: true });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NewPositionForm>(empty);

  const update = (k: keyof NewPositionForm, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <SignalLayout>
      <div className="p-6 max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">Portfolio</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              0 positions · $0 total value
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
            {showAdd ? "Cancel" : "Add position"}
          </button>
        </div>

        {/* Add position form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="text-sm font-medium mb-4">New position</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Ticker
                    </label>
                    <input
                      type="text"
                      value={form.ticker}
                      onChange={(e) =>
                        update("ticker", e.target.value.toUpperCase())
                      }
                      placeholder="NVDA"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Shares
                    </label>
                    <input
                      type="number"
                      value={form.shares}
                      onChange={(e) => update("shares", e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Cost basis / share
                    </label>
                    <input
                      type="number"
                      value={form.cost}
                      onChange={(e) => update("cost", e.target.value)}
                      placeholder="450.00"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Tier
                    </label>
                    <div className="relative">
                      <select
                        value={form.tier}
                        onChange={(e) => update("tier", e.target.value)}
                        className="w-full appearance-none px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary pr-8"
                      >
                        {tiers.map((t) => (
                          <option key={t} value={t}>
                            {t.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Entry date
                    </label>
                    <input
                      type="date"
                      value={form.entryDate}
                      onChange={(e) => update("entryDate", e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      placeholder="Optional thesis note"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <button
                    disabled
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
                    title="Supabase integration required"
                  >
                    Save position
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    Connect Supabase to persist positions
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tier summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiers.map((tier) => (
            <div
              key={tier}
              className="bg-card border border-border rounded-lg p-4"
            >
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${tierColors[tier]}`}
              >
                {tier.replace("_", " ")}
              </span>
              <p className="text-xl font-mono tabular-nums mt-2">$0</p>
              <p className="text-[11px] text-muted-foreground">
                0% of portfolio
              </p>
            </div>
          ))}
        </div>

        {/* Holdings table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Ticker
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    Shares
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    Cost
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    Value
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    P/L
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Conc.
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-sm text-muted-foreground">
                      No positions yet
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Add your first position to start tracking
                    </p>
                    <button
                      onClick={() => setShowAdd(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add position
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Closed positions */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Closed positions</h2>
          </div>
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">No closed positions</p>
          </div>
        </div>
      </div>
    </SignalLayout>
  );
}
