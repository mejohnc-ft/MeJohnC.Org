import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, Star } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

export default function Watchlist() {
  useSEO({ title: "Signal — Watchlist", noIndex: true });
  const [showAdd, setShowAdd] = useState(false);
  const [ticker, setTicker] = useState("");
  const [thesis, setThesis] = useState("");

  return (
    <SignalLayout>
      <div className="p-6 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">Watchlist</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              0 tickers being monitored
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
            {showAdd ? "Cancel" : "Add ticker"}
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
                <h2 className="text-sm font-medium mb-4">Add to watchlist</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Ticker
                    </label>
                    <input
                      type="text"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      placeholder="AAPL"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Thesis (optional)
                    </label>
                    <input
                      type="text"
                      value={thesis}
                      onChange={(e) => setThesis(e.target.value)}
                      placeholder="Why are you watching this?"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    disabled
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
                    title="Supabase integration required"
                  >
                    Add to watchlist
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    Connect Supabase to persist watchlist
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watchlist table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Ticker
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Thesis
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    1d %
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Active signals
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Star className="w-6 h-6 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No tickers on watchlist
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Add tickers to monitor signals and catalog your thesis
                    </p>
                    <button
                      onClick={() => setShowAdd(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add ticker
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Signal coverage:
            </span>{" "}
            Watchlist tickers are included in pattern matching. Signals that
            fire against any watchlist ticker generate an alert even if you
            don't hold the position yet.
          </p>
        </div>
      </div>
    </SignalLayout>
  );
}
