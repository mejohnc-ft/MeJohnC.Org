import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LOOP_STAGE_LABELS,
  orderProductBriefs,
  portfolioThesis,
  type LoopStage,
  type ProductBrief,
  type ReadinessLedger,
} from "@/data/ai-products";
import type { TimelineItem } from "@/data/timeline-tracks";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useTheme } from "@/lib/theme";

const themes = {
  warm: { primary: "hsl(25, 95%, 53%)", glow: "hsla(25, 95%, 53%, 0.15)" },
  crisp: { primary: "hsl(177, 94%, 21%)", glow: "hsla(177, 94%, 21%, 0.15)" },
  "solarized-dark": {
    primary: "hsl(175, 59%, 40%)",
    glow: "hsla(175, 59%, 40%, 0.15)",
  },
  "solarized-light": {
    primary: "hsl(175, 59%, 40%)",
    glow: "hsla(175, 59%, 40%, 0.15)",
  },
};

const LOOP_ORDER: LoopStage[] = [
  "sense",
  "decide",
  "govern",
  "build",
  "operate",
];

interface AiProductsPanelProps {
  entries?: TimelineItem[];
}

export default function AiProductsPanel({ entries }: AiProductsPanelProps) {
  const { theme: currentTheme } = useTheme();
  const theme = themes[currentTheme];
  const prefersReducedMotion = useReducedMotion();
  const briefs = useMemo(() => orderProductBriefs(entries), [entries]);
  const [selectedId, setSelectedId] = useState(briefs[0]?.id ?? "");
  const selected = briefs.find((brief) => brief.id === selectedId) ?? briefs[0];

  const duration = prefersReducedMotion ? 0 : 0.35;

  return (
    <div className="space-y-10">
      <ThesisCard theme={theme} duration={duration} />

      <div>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              Product briefs
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Five products with named owners. Cadre, Spark, Spot, Navigate,
              Vantage, Knowledge, and AI Triage appear as seams in the loop
              above — not as full briefs.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="AI product briefs"
          className="flex flex-wrap gap-2 mb-6"
        >
          {briefs.map((brief) => {
            const selectedBrief = brief.id === selected?.id;
            return (
              <motion.button
                key={brief.id}
                type="button"
                role="tab"
                id={`product-tab-${brief.id}`}
                aria-selected={selectedBrief}
                aria-controls={`product-panel-${brief.id}`}
                tabIndex={selectedBrief ? 0 : -1}
                onClick={() => setSelectedId(brief.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                    return;
                  }
                  event.preventDefault();
                  const index = briefs.findIndex((item) => item.id === brief.id);
                  const delta = event.key === "ArrowRight" ? 1 : -1;
                  const next =
                    briefs[(index + delta + briefs.length) % briefs.length];
                  setSelectedId(next.id);
                  document.getElementById(`product-tab-${next.id}`)?.focus();
                }}
                className={`font-mono text-xs uppercase tracking-wider px-3 py-2 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selectedBrief
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-current"
                }`}
                whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                {brief.name}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              role="tabpanel"
              id={`product-panel-${selected.id}`}
              aria-labelledby={`product-tab-${selected.id}`}
              initial={
                prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }
              }
              transition={{ duration, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <ProductBriefCard brief={selected} theme={theme} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ThesisCard({
  theme,
  duration,
}: {
  theme: { primary: string; glow: string };
  duration: number;
}) {
  const thesis = portfolioThesis;

  return (
    <motion.section
      aria-labelledby="ai-products-thesis"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="p-6 md:p-8 rounded-xl border bg-card/50 backdrop-blur-sm"
      style={{
        borderColor: theme.primary,
        boxShadow: `0 0 24px ${theme.glow}`,
      }}
    >
      <span className="font-mono text-xs text-primary uppercase tracking-widest">
        Portfolio thesis
      </span>
      <h3
        id="ai-products-thesis"
        className="text-2xl md:text-3xl font-black text-foreground mt-2 mb-4"
      >
        {thesis.title}
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
        {thesis.lead}
      </p>

      <ul className="flex flex-wrap gap-2 mb-8">
        {thesis.tags.map((tag) => (
          <li
            key={tag}
            className="font-mono text-xs px-2.5 py-1 rounded-full border border-border text-foreground"
          >
            {tag}
          </li>
        ))}
      </ul>

      <div className="mb-8">
        <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Operating loop
        </h4>
        <ol className="grid gap-3 md:grid-cols-5">
          {thesis.loop.map((step, index) => (
            <li
              key={step.stage}
              className="rounded-lg border border-border p-3 bg-background/40"
            >
              <div
                className="font-mono text-xs font-semibold mb-2"
                style={{ color: theme.primary }}
              >
                {index + 1}. {LOOP_STAGE_LABELS[step.stage]}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-foreground leading-relaxed mb-3">{thesis.cohesive}</p>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">
        {thesis.honestClaim}
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Layers
          </h4>
          <ul className="space-y-2">
            {thesis.layers.map((layer) => (
              <li key={layer.name} className="text-sm">
                <span className="font-semibold text-foreground">
                  {layer.name}
                </span>
                <span className="text-muted-foreground"> — {layer.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Guardrails
          </h4>
          <ul className="flex flex-wrap gap-2 mb-4">
            {thesis.guardrails.map((item) => (
              <li
                key={item}
                className="text-xs px-2 py-1 rounded border border-border text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {thesis.agentAuthority}
          </p>
        </div>
      </div>

      <p className="text-sm text-foreground mb-6">
        <span className="font-semibold">Current truth. </span>
        {thesis.currentTruth}
      </p>

      <ReadinessLedgerBlock ledger={thesis.operatingEvidence} />

      <p className="text-xs text-muted-foreground mt-6">
        Named seams: {thesis.namedSeams.join(" · ")}
      </p>
    </motion.section>
  );
}

function ProductBriefCard({
  brief,
  theme,
}: {
  brief: ProductBrief;
  theme: { primary: string; glow: string };
}) {
  return (
    <article
      className="p-6 md:p-8 rounded-xl border bg-card/50 backdrop-blur-sm"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
        <h3 className="text-2xl font-black text-foreground">{brief.name}</h3>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Owner {brief.owner}
        </span>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {brief.tagline}
      </p>

      <ul className="flex flex-wrap gap-2 mb-4">
        {brief.chips.map((chip) => (
          <li
            key={chip}
            className="font-mono text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary"
          >
            {chip}
          </li>
        ))}
      </ul>

      <LoopMarker stages={brief.loopStages} primary={theme.primary} />

      <p className="text-sm text-foreground leading-relaxed my-6">
        <span className="font-semibold">Primary. </span>
        {brief.primaryCapability}
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Capabilities
          </h4>
          <ol className="space-y-2">
            {brief.capabilities.map((capability, index) => (
              <li key={capability} className="text-sm text-foreground">
                <span className="font-mono text-xs text-primary mr-2">
                  {index + 1}.
                </span>
                {capability}
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-6">
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Flow
            </h4>
            <p className="text-sm text-foreground">
              {brief.flow.join(" → ")}
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Stack
            </h4>
            <p className="text-sm text-muted-foreground">{brief.stack.join(" · ")}</p>
          </div>
        </div>
      </div>

      {(brief.engineeringNotes || brief.securityNotes) && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {brief.engineeringNotes && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Engineering
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {brief.engineeringNotes}
              </p>
            </div>
          )}
          {brief.securityNotes && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Security
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {brief.securityNotes}
              </p>
            </div>
          )}
        </div>
      )}

      <ReadinessLedgerBlock ledger={brief.readiness} />

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <MaturityColumn label="Proven today" items={brief.proven} />
        <MaturityColumn label="Pre-GA" items={brief.preGa} />
        <MaturityColumn label="Target seam" items={brief.target} />
      </div>
    </article>
  );
}

function LoopMarker({
  stages,
  primary,
}: {
  stages: LoopStage[];
  primary: string;
}) {
  return (
    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
      Loop{" "}
      {LOOP_ORDER.map((stage, index) => {
        const active = stages.includes(stage);
        return (
          <span key={stage}>
            <span style={{ color: active ? primary : undefined }} className={active ? "font-semibold" : ""}>
              {LOOP_STAGE_LABELS[stage]}
            </span>
            {index < LOOP_ORDER.length - 1 ? " → " : ""}
          </span>
        );
      })}
    </p>
  );
}

function ReadinessLedgerBlock({ ledger }: { ledger: ReadinessLedger }) {
  const rows: [string, string][] = [
    ["Lifecycle", ledger.lifecycle],
    ["Adoption", ledger.adoption],
    ["Production", ledger.production],
    ["Ownership", ledger.ownership],
    ["Risk", ledger.risk],
  ];
  return (
    <div>
      <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Readiness ledger
      </h4>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="text-sm">
            <dt className="inline font-semibold text-foreground">{label}. </dt>
            <dd className="inline text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MaturityColumn({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-border p-4 bg-background/40">
      <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None claimed.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="text-sm text-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
