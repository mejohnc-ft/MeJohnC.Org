import { useState } from "react";
import { Zap } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

type Severity = "all" | "monitor" | "alert" | "urgent";
type FiringStatus = "active" | "dismissed" | "expired";

const patternDescriptions: Record<string, string> = {
  G1: "Government stake imminent",
  NV1: "Nvidia portfolio addition setup",
  C1: "Congressional cluster",
  HC: "Hyperscaler capex cascade",
  CM: "Critical mineral squeeze",
};

const severities: Severity[] = ["all", "monitor", "alert", "urgent"];

export default function Firings() {
  useSEO({ title: "Signal — Firings", noIndex: true });
  const [activeSeverity, setActiveSeverity] = useState<Severity>("all");
  const [activeStatus, setActiveStatus] = useState<FiringStatus>("active");

  return (
    <SignalLayout>
      <div className="p-6 max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">Pattern firings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Convergence events detected by the pattern engine
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["active", "dismissed", "expired"] as FiringStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeStatus === s
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1">
          {severities.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSeverity(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeSeverity === s
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s !== "all" && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    s === "monitor"
                      ? "bg-amber-500"
                      : s === "alert"
                        ? "bg-orange-500"
                        : "bg-red-500"
                  }`}
                />
              )}
              {s}
            </button>
          ))}
        </div>

        {/* Pattern legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(patternDescriptions).map(([id, desc]) => (
            <div
              key={id}
              className="bg-card border border-border rounded-lg px-3 py-2"
            >
              <p className="text-xs font-mono font-medium">{id}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Firings table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Ticker
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Pattern
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    Confidence
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                    Evidence
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Fired
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Label
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Zap className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No firings yet
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-sm mx-auto">
                      Pattern engine will surface convergence events here once
                      signal ingestion is configured and positions/watchlist are
                      added.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Signal is informational only and not investment advice. Patterns are
          based on historical correlations and do not guarantee future results.
          Consult a licensed advisor before making investment decisions.
        </p>
      </div>
    </SignalLayout>
  );
}
