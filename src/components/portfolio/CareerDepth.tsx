import { Link } from "react-router-dom";
import Experience from "@/components/Experience";
import ProjectTimeline from "@/components/ProjectTimeline";
import {
  flagshipDeployment,
  forwardDeployedMethod,
} from "@/data/career-evidence";
import { talks } from "@/data/talks";

export default function CareerDepth() {
  const webinar = talks.find(
    (talk) => talk.id === "centrex-it-automation-adoption-webinar",
  );

  return (
    <>
      <section
        id="selected-case"
        aria-labelledby="selected-case-heading"
        className="scroll-mt-24 border-b border-border py-16 md:py-20"
      >
        <div className="grid gap-10 md:grid-cols-[0.75fr_1.25fr] md:gap-16">
          <div>
            <p className="font-mono text-xs tracking-widest text-primary">
              Selected case
            </p>
            <h2
              id="selected-case-heading"
              className="mt-3 text-3xl font-black leading-tight text-foreground md:text-4xl"
            >
              A service team needed leverage, not another tool.
            </h2>
          </div>

          <div className="space-y-5 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              With 15 people already carrying client work, more automation could
              not require a matching increase in engineering effort. The job was
              to create a governed delivery system the team would actually use.
            </p>
            <p>
              I set the portfolio direction, designed the workflow and authority
              boundaries, contributed hands-on, and orchestrated delivery with
              the automation and service teams. People kept control of
              writeback, deployment, production change, and spending.
            </p>
            <p className="text-base font-semibold text-foreground md:text-lg">
              {flagshipDeployment.headlineResult}
            </p>

            <p className="border-l border-border pl-4 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">The method:</span>{" "}
              {forwardDeployedMethod.map((step) => step.title).join(" → ")}.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2 text-sm">
              <Link
                to="/work/service-delivery-automation"
                className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Read the service-delivery case →
              </Link>
              {webinar?.url && (
                <a
                  href={webinar.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Watch the Rewst interview ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="full-record-heading" className="py-14 md:py-16">
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-widest text-primary">
            The full record
          </p>
          <h2
            id="full-record-heading"
            className="mt-3 text-2xl font-black text-foreground md:text-3xl"
          >
            Go deeper when the detail is useful.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The short version is above. Open these when the detail matters.
          </p>
        </div>

        <div className="mt-8 border-t border-border">
          <details className="group border-b border-border py-5">
            <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="font-bold text-foreground">
                    Two progress histories
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Provisioning and logistics alongside AI and automation.
                  </p>
                </div>
                <span className="font-mono text-xs text-primary">
                  <span className="group-open:hidden">Open +</span>
                  <span className="hidden group-open:inline">Close −</span>
                </span>
              </div>
            </summary>
            <div className="pt-10">
              <ProjectTimeline />
            </div>
          </details>

          <details className="group border-b border-border py-5">
            <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="font-bold text-foreground">Role chronology</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Formal titles, concurrent scope, responsibilities, and
                    tools.
                  </p>
                </div>
                <span className="font-mono text-xs text-primary">
                  <span className="group-open:hidden">Open +</span>
                  <span className="hidden group-open:inline">Close −</span>
                </span>
              </div>
            </summary>
            <div className="pt-4">
              <Experience showHeading={false} />
            </div>
          </details>
        </div>

        <nav
          aria-label="Related portfolio evidence"
          className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm"
        >
          <Link
            to="/products"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Product portfolio →
          </Link>
          <Link
            to="/speaking"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Public talks and walkthroughs →
          </Link>
        </nav>
      </section>
    </>
  );
}
