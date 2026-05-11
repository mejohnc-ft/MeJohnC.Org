import { useState } from "react";
import { Shield, AlertTriangle, CheckSquare } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

interface Rule {
  id: string;
  type: string;
  label: string;
  description: string;
  config: string;
  enabled: boolean;
}

const defaultRules: Rule[] = [
  {
    id: "concentration",
    type: "concentration",
    label: "Concentration limit",
    description:
      "Alert if any single position exceeds this percentage of total portfolio value.",
    config: "25%",
    enabled: true,
  },
  {
    id: "parabolic",
    type: "parabolic",
    label: "Parabolic move",
    description:
      "Alert if a position gains this much in this many days. Prompts to skip next tranche.",
    config: "+15% in 5 days",
    enabled: true,
  },
  {
    id: "drawdown",
    type: "drawdown",
    label: "Drawdown stop",
    description: "Alert if a position falls this far from cost basis.",
    config: "-20% from cost",
    enabled: true,
  },
  {
    id: "tier_balance",
    type: "tier_balance",
    label: "Tier balance",
    description:
      "Alert if any tier deviates from its target allocation by this amount.",
    config: "±10 percentage points",
    enabled: false,
  },
];

const checklistTemplate = [
  "Review active pattern firings",
  "Check position concentration",
  "Scan upcoming earnings (next 7 days)",
  "Review any parabolic movers",
  "Plan this week's capital deployment",
];

export default function Discipline() {
  useSEO({ title: "Signal — Discipline", noIndex: true });
  const [rules, setRules] = useState(defaultRules);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggleRule = (id: string) =>
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );

  const toggleCheck = (i: number) =>
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <SignalLayout>
      <div className="p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-lg font-medium">Discipline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rules that enforce position sizing and emotional guardrails
          </p>
        </div>

        {/* Discipline rules */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Active rules</h2>
          </div>

          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-card border rounded-lg p-4 transition-colors ${
                rule.enabled ? "border-border" : "border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{rule.label}</p>
                    <span className="font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {rule.config}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`flex-shrink-0 w-10 h-5 rounded-full transition-colors ${
                    rule.enabled ? "bg-primary" : "bg-muted"
                  }`}
                  aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                      rule.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}

          <div className="bg-card border border-dashed border-border rounded-lg p-4 flex items-center gap-3">
            <p className="text-[11px] text-muted-foreground flex-1">
              Connect Supabase to persist rule configurations and log
              violations.
            </p>
          </div>
        </div>

        {/* Weekly checklist */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Weekly checklist</h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {doneCount} / {checklistTemplate.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {checklistTemplate.map((item, i) => (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked[i] ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {checked[i] && (
                    <svg
                      className="w-2.5 h-2.5 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 10 10"
                    >
                      <path
                        d="M1.5 5l2.5 2.5 4.5-4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-xs ${checked[i] ? "line-through text-muted-foreground" : ""}`}
                >
                  {item}
                </span>
              </button>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Checklist resets each week. Connect Supabase to persist
              completions.
            </p>
          </div>
        </div>

        {/* Violation log */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Override log</h2>
          </div>
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              No overrides recorded
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              When you trade against a firing rule, Signal logs the override
              with your reason here.
            </p>
          </div>
        </div>
      </div>
    </SignalLayout>
  );
}
