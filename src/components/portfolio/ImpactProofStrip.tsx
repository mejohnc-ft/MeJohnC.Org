import { headlineCareerClaims } from "@/data/career-evidence";

export default function ImpactProofStrip() {
  return (
    <section aria-labelledby="impact-proof-heading" className="mb-16">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Realized impact
          </span>
          <h2
            id="impact-proof-heading"
            className="mt-2 text-2xl font-black text-foreground md:text-3xl"
          >
            Results with defined boundaries
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Forecasts excluded
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {headlineCareerClaims.map((claim) => (
          <article
            key={claim.id}
            className="rounded-xl border border-border bg-card/55 p-5"
          >
            <div className="font-mono text-3xl font-black text-primary md:text-4xl">
              {claim.metric}
            </div>
            <h3 className="mt-3 text-base font-bold text-foreground">
              {claim.label}
            </h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {claim.qualifier} · {claim.evidenceClass}
            </p>
            <details className="group mt-5 border-t border-border pt-4">
              <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-widest text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="group-open:hidden">How measured +</span>
                <span className="hidden group-open:inline">Hide method −</span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {claim.methodology}
              </p>
              {claim.exclusions && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Boundary: {claim.exclusions}
                </p>
              )}
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
