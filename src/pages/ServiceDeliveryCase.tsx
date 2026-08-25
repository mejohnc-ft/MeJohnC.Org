import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import ImpactProofStrip from "@/components/portfolio/ImpactProofStrip";
import {
  careerClaims,
  flagshipDeployment,
  SERVICE_HOURS_RETURNED,
} from "@/data/career-evidence";
import { talks } from "@/data/talks";
import { RECRUITING_KEYWORDS, useSEO } from "@/lib/seo";

const authorityBoundaries = [
  {
    layer: "Deterministic automation",
    detail:
      "Collects source context, routes work, runs repeatable playbooks, and preserves evidence.",
  },
  {
    layer: "AI-assisted work",
    detail:
      "Researches, summarizes, and drafts where the task benefits from interpretation.",
  },
  {
    layer: "Human production authority",
    detail:
      "People retain writeback, deployment, production-change, and spend authority.",
  },
] as const;

export default function ServiceDeliveryCase() {
  const webinar = talks.find(
    (talk) => talk.id === "centrex-it-automation-adoption-webinar",
  );
  const communitySession = talks.find(
    (talk) => talk.id === "rewst-flow-2026-community-live",
  );
  const supportingThroughputClaim = careerClaims.find(
    (claim) => claim.id === "automation-throughput",
  );

  useSEO({
    title: "Service-Delivery Automation Case Study",
    description: `How Jonathan Christensen scaled governed service-delivery automation across a 15-person team, returned ${SERVICE_HOURS_RETURNED} hours in 2026 YTD, retained human production authority, and reused field learning across a portfolio.`,
    url: "/work/service-delivery-automation",
    keywords: RECRUITING_KEYWORDS,
  });

  return (
    <PageTransition>
      <article className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <Link
          to="/work"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Work
        </Link>

        <header className="mt-10 max-w-5xl">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Deployment dossier · Service operations
          </span>
          <h1 className="mt-3 text-4xl font-black leading-tight text-foreground md:text-6xl">
            {flagshipDeployment.title}
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-relaxed text-muted-foreground">
            A forward-deployed case spanning operating-model design, governed
            implementation, adoption, measurement, and reuse—not a collection of
            disconnected workflow counts.
          </p>
        </header>

        <section
          aria-labelledby="case-context-heading"
          className="mt-14 grid gap-5 lg:grid-cols-2"
        >
          <div className="rounded-xl border border-border bg-card/45 p-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Context
            </span>
            <h2
              id="case-context-heading"
              className="mt-2 text-2xl font-black text-foreground"
            >
              Capacity was the constraint
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {flagshipDeployment.context}
            </p>
          </div>
          <div className="rounded-xl border border-primary/50 bg-primary/5 p-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Ownership
            </span>
            <h2 className="mt-2 text-2xl font-black text-foreground">
              Direction, design, implementation, orchestration
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-foreground">
              {flagshipDeployment.ownership}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Built with centrexIT&apos;s automation and service teams — the
              direction and design were mine; the delivery was shared.
            </p>
          </div>
        </section>

        <section aria-labelledby="deployment-system-heading" className="mt-14">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            System and controls
          </span>
          <h2
            id="deployment-system-heading"
            className="mt-2 text-3xl font-black text-foreground"
          >
            Automation carries the repeatable load. People keep authority.
          </h2>

          <ol className="mt-7 grid gap-3 md:grid-cols-5">
            {flagshipDeployment.system.map((item, index) => (
              <li
                key={item}
                className="rounded-lg border border-border bg-card/40 p-4"
              >
                <span className="font-mono text-[10px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {item}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {authorityBoundaries.map((boundary) => (
              <article
                key={boundary.layer}
                className="border-l border-primary bg-primary/5 p-5"
              >
                <h3 className="font-mono text-xs uppercase tracking-wider text-primary">
                  {boundary.layer}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {boundary.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-16">
          <ImpactProofStrip />
        </div>

        <section
          aria-labelledby="measurement-boundaries-heading"
          className="mt-6 rounded-xl border border-border bg-card/40 p-6 md:p-8"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Measurement boundaries
          </span>
          <h2
            id="measurement-boundaries-heading"
            className="mt-2 text-2xl font-black text-foreground md:text-3xl"
          >
            What this case does—and does not—claim
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Included
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>2026 cumulative service-delivery time returned.</li>
                <li>Active technician work on the provisioning path.</li>
                <li>
                  Operational backlog recovery with a defined six-month window.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Excluded
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>Cash savings or realized headcount reduction.</li>
                <li>
                  Forecast value from unreleased portfolio and strategy tools.
                </li>
                <li>Confidential client, tenant, and source-system details.</li>
              </ul>
            </div>
          </div>
          {supportingThroughputClaim && (
            <p className="mt-6 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">
                Supporting throughput evidence:
              </strong>{" "}
              {supportingThroughputClaim.metric}{" "}
              {supportingThroughputClaim.label}{" "}
              {supportingThroughputClaim.qualifier}. It remains outside the
              headline strip until the exact comparison window is published.
            </p>
          )}
        </section>

        <section aria-labelledby="adoption-reuse-heading" className="mt-14">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Adoption and reuse
          </span>
          <h2
            id="adoption-reuse-heading"
            className="mt-2 text-3xl font-black text-foreground"
          >
            The durable output is the operating pattern
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-muted-foreground">
            Delivery included the people closing the work, experience and
            developer-experience standards, explicit approval boundaries, and a
            measurement habit. Proven patterns then became inputs to the broader
            product portfolio instead of remaining one-off automations.
          </p>
        </section>

        <section
          aria-labelledby="public-proof-heading"
          className="mt-14 border-t border-border pt-8"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Public proof
          </span>
          <h2
            id="public-proof-heading"
            className="mt-2 text-2xl font-black text-foreground"
          >
            Adoption and system design presented with Rewst
          </h2>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {[webinar, communitySession]
              .filter((talk): talk is NonNullable<typeof talk> => Boolean(talk))
              .map((talk) => (
                <a
                  key={talk.id}
                  href={talk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {talk.title}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
          </div>
        </section>

        <footer className="mt-16 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Looking for lead and senior forward-deployed and AI transformation
            roles where operational depth and hands-on delivery matter.
          </p>
          <a
            href="mailto:mejohnwc@gmail.com?subject=Service-delivery%20automation%20case"
            className="font-mono text-xs uppercase tracking-wider text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Talk about a role →
          </a>
        </footer>
      </article>
    </PageTransition>
  );
}
