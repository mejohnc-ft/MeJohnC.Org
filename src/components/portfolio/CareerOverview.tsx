import { headlineCareerClaims } from "@/data/career-evidence";

const careerArc = [
  {
    period: "2022",
    title: "Learn the work",
    detail:
      "Three months in Tier 1, then into the day-to-day reality of provisioning.",
  },
  {
    period: "2022–2023",
    title: "Rebuild what was broken",
    detail:
      "Cleared a 72-ticket backlog and rebuilt the SOPs, SLAs, and inventory controls the operation had lost.",
  },
  {
    period: "2023–2024",
    title: "Automate the stable system",
    detail:
      "Deployment and configuration moved to Immy.Bot while I carried provisioning-lead, logistics, and field-support scope.",
  },
  {
    period: "2025–now",
    title: "Carry the method across teams",
    detail:
      "Forward-deployed across service and client teams — transforming the work, then turning field learning into standards and products.",
  },
] as const;

export default function CareerOverview() {
  return (
    <>
      <header className="pb-16 pt-4 md:pb-20 md:pt-10">
        <p className="font-mono text-xs tracking-widest text-primary">
          AI Automation Engineer · centrexIT
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.08] text-foreground md:text-5xl">
          I learned the work from the inside. Now I redesign it at scale.
        </h1>

        <div className="mt-8 grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:gap-14">
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            I started in frontline support, spent roughly 18 months doing
            provisioning manually, recovered the operation, and rebuilt the
            process before automating it. The automation began in 2023. In 2025,
            AI Automation Engineer became my full-time role.
          </p>
          <p className="border-l border-primary/50 pl-5 text-sm leading-relaxed text-foreground">
            I care about giving people room to think. The systems I build remove
            repetition, preserve human authority, and turn good operating
            practice into something a whole team can use.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <a
            href="#selected-case"
            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Read the selected case ↓
          </a>
          <a
            href="mailto:mejohnwc@gmail.com?subject=AI%20automation%20role"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Talk about a role →
          </a>
        </div>
      </header>

      <section
        aria-labelledby="throughline-heading"
        className="border-t border-border py-14 md:py-16"
      >
        <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
          <div>
            <p className="font-mono text-xs tracking-widest text-primary">
              The through-line
            </p>
            <h2
              id="throughline-heading"
              className="mt-3 text-2xl font-black text-foreground md:text-3xl"
            >
              The work changed. The method did not.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Understand the real operation, make the process coherent, automate
              only what is stable, and stay through adoption.
            </p>
          </div>

          <ol className="border-t border-border">
            {careerArc.map((chapter) => (
              <li
                key={chapter.period}
                className="grid gap-2 border-b border-border py-5 sm:grid-cols-[7rem_1fr] sm:gap-6"
              >
                <span className="font-mono text-xs text-primary">
                  {chapter.period}
                </span>
                <div>
                  <h3 className="font-bold text-foreground">{chapter.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {chapter.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="impact-heading"
        className="border-y border-border py-12 md:py-14"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest text-primary">
              Realized impact
            </p>
            <h2
              id="impact-heading"
              className="mt-2 text-2xl font-black text-foreground md:text-3xl"
            >
              What changed
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Measured results only. Forecasts are labeled as projections.
          </p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
          {headlineCareerClaims.map((claim) => (
            <article
              key={claim.id}
              className="md:px-7 md:first:pl-0 md:last:pr-0"
            >
              <p className="font-mono text-3xl font-black text-primary md:text-4xl">
                {claim.metric}
              </p>
              <h3 className="mt-2 font-bold text-foreground">{claim.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {claim.qualifier} · {claim.evidenceClass}
              </p>
              <details className="group mt-4">
                <summary className="cursor-pointer list-none text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span className="group-open:hidden">Measurement note +</span>
                  <span className="hidden group-open:inline">Hide note −</span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {claim.methodology}
                  {claim.exclusions ? ` ${claim.exclusions}` : ""}
                </p>
              </details>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
