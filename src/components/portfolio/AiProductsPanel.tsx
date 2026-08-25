import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LOOP_STAGE_LABELS,
  orderProductBriefs,
  portfolioThesis,
  type LoopStage,
  type ProductOrderEntry,
  type ProductBrief,
} from "@/data/ai-products";
import { useReducedMotion } from "@/lib/reduced-motion";

const LOOP_ORDER: LoopStage[] = [
  "sense",
  "decide",
  "govern",
  "build",
  "operate",
];

interface AiProductsPanelProps {
  entries?: ProductOrderEntry[];
}

export default function AiProductsPanel({ entries }: AiProductsPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const briefs = useMemo(() => orderProductBriefs(entries), [entries]);
  const [selectedId, setSelectedId] = useState(briefs[0]?.id ?? "");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const selected = briefs.find((brief) => brief.id === selectedId) ?? briefs[0];

  const duration = prefersReducedMotion ? 0 : 0.35;

  return (
    <section aria-label="Enterprise AI product catalog" className="space-y-8">
      <ol
        aria-label="The operating loop each product plays a part in"
        className="grid gap-x-6 gap-y-3 border-y border-border py-5 sm:grid-cols-2 md:grid-cols-5"
      >
        {portfolioThesis.loop.map((step) => (
          <li key={step.stage}>
            <span className="font-mono text-xs uppercase tracking-wider text-primary">
              {LOOP_STAGE_LABELS[step.stage]}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>

      <div>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              The portfolio
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              One brief per product, each labeled with its maturity.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="AI product categories"
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
                ref={(element) => {
                  tabRefs.current[brief.id] = element;
                }}
                onClick={() => setSelectedId(brief.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                    return;
                  }
                  event.preventDefault();
                  const index = briefs.findIndex(
                    (item) => item.id === brief.id,
                  );
                  const delta = event.key === "ArrowRight" ? 1 : -1;
                  const next =
                    briefs[(index + delta + briefs.length) % briefs.length];
                  setSelectedId(next.id);
                  tabRefs.current[next.id]?.focus();
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
              <ProductBriefCard brief={selected} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function ProductBriefCard({ brief }: { brief: ProductBrief }) {
  return (
    <article className="p-6 md:p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-2xl font-black text-foreground">{brief.name}</h3>
        <span className="w-fit rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {brief.status}
        </span>
      </div>
      <p className="mb-3 font-mono text-xs uppercase tracking-wider text-primary">
        My role · {brief.role}
      </p>
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

      <LoopMarker stages={brief.loopStages} />

      <p className="text-sm text-foreground leading-relaxed my-6">
        <span className="font-semibold">Evidence. </span>
        {brief.shipped}
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
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Stack
          </h4>
          <p className="text-sm text-muted-foreground">
            {brief.stack.join(" · ")}
          </p>
        </div>
      </div>
    </article>
  );
}

function LoopMarker({ stages }: { stages: LoopStage[] }) {
  return (
    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
      Loop{" "}
      {LOOP_ORDER.map((stage, index) => {
        const active = stages.includes(stage);
        return (
          <span key={stage}>
            <span className={active ? "font-semibold text-primary" : ""}>
              {LOOP_STAGE_LABELS[stage]}
            </span>
            {index < LOOP_ORDER.length - 1 ? " → " : ""}
          </span>
        );
      })}
    </p>
  );
}
