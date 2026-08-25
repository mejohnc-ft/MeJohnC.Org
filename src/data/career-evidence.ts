export type EvidenceClass = "Measured" | "Operational record" | "Projection";

/**
 * Single source for the service-delivery hours-returned figure. This is a
 * year-to-date number that changes; every public surface must interpolate it
 * from here rather than hardcoding it.
 */
export const SERVICE_HOURS_RETURNED = "836.3";
export const SERVICE_HOURS_PERIOD = "2026 year to date";

export interface CareerClaim {
  id: string;
  metric: string;
  label: string;
  qualifier: string;
  evidenceClass: EvidenceClass;
  methodology: string;
  exclusions?: string;
  headline: boolean;
}

export const careerClaims: CareerClaim[] = [
  {
    id: "service-time-returned",
    metric: `${SERVICE_HOURS_RETURNED}h`,
    label: "service time returned",
    qualifier: SERVICE_HOURS_PERIOD,
    evidenceClass: "Measured",
    methodology:
      "Cumulative time-returned total for service-delivery automation during 2026.",
    exclusions:
      "Excludes forecast capacity from portfolio, client-management, strategy, and unreleased tools.",
    headline: true,
  },
  {
    id: "provisioning-active-work",
    metric: "45 → ~2 min",
    label: "active provisioning work",
    qualifier: "per fresh-machine onboarding path",
    evidenceClass: "Measured",
    methodology:
      "Compares active technician effort before and after the Immy.Bot and Rewst provisioning playbook.",
    exclusions:
      "Human quality control remains in the workflow; this is not a claim that all elapsed delivery time is two minutes.",
    headline: true,
  },
  {
    id: "provisioning-backlog",
    metric: "72",
    label: "ticket backlog cleared",
    qualifier: "within six months",
    evidenceClass: "Operational record",
    methodology:
      "Tracks the inherited COVID-era provisioning backlog through the six-month recovery period.",
    exclusions:
      "The result is presented separately from later automation and turnaround improvements.",
    headline: true,
  },
  {
    id: "automation-throughput",
    metric: "+133%",
    label: "automation hours",
    qualifier: "with billed labor essentially flat",
    evidenceClass: "Measured",
    methodology:
      "Compares recorded automation hours across the source reporting periods while billed labor remained essentially flat.",
    exclusions:
      "Held out of the headline proof strip until the exact comparison window is published.",
    headline: false,
  },
  {
    id: "service-capacity",
    metric: "~1 FTE",
    label: "service-capacity target",
    qualifier: "across a team of 15",
    evidenceClass: "Projection",
    methodology:
      "Forward capacity model based on continued adoption of the current service-automation portfolio.",
    exclusions:
      "A forecast, not realized headcount reduction, cash savings, or a measured outcome.",
    headline: false,
  },
  {
    id: "strategy-capacity",
    metric: "2–4 FTE",
    label: "portfolio and strategy capability target",
    qualifier: "planned portfolio leverage",
    evidenceClass: "Projection",
    methodology:
      "Capability forecast for portfolio, client-management, executive, and strategy tooling.",
    exclusions:
      "A roadmap target for future capability; it is not included in measured time returned.",
    headline: false,
  },
];

export const headlineCareerClaims = careerClaims.filter(
  (claim) => claim.headline,
);

export const forwardDeployedMethod = [
  {
    step: "01",
    title: "Find the constraint",
    detail: "Embed with operators and trace the work before selecting a tool.",
  },
  {
    step: "02",
    title: "Redesign the work",
    detail: "Clarify ownership, handoffs, evidence, and the operating model.",
  },
  {
    step: "03",
    title: "Build with boundaries",
    detail:
      "Combine deterministic automation and AI with explicit human authority.",
  },
  {
    step: "04",
    title: "Drive adoption",
    detail:
      "Treat enablement, UX, UI, and developer experience as production work.",
  },
  {
    step: "05",
    title: "Measure and reuse",
    detail:
      "Track operational value, then turn field learning into standards and products.",
  },
] as const;

export const flagshipDeployment = {
  title: "Scaling service-delivery automation without scaling labor",
  context:
    "A 15-person service team was absorbing repeatable work alongside client-facing responsibilities. More automation could not require a matching increase in engineer hours.",
  ownership:
    "I set the portfolio direction, designed the workflow and authority boundaries, contributed hands-on, and orchestrated delivery through adoption with the automation and service teams.",
  system: [
    "Select repeatable, evidence-rich service work",
    "Route research and drafting through governed workflows",
    "Keep writeback, deployment, and spend behind human approval",
    "Measure adoption and time returned",
    "Reuse proven patterns across the portfolio",
  ],
  headlineResult: `Service-delivery automations returned ${SERVICE_HOURS_RETURNED} hours in ${SERVICE_HOURS_PERIOD}.`,
} as const;

export const supportingTransformations = [
  {
    title: "Provisioning operating model",
    detail:
      "Cleared a 72-ticket backlog, rebuilt SOPs, SLAs, inventory controls, and knowledge, then reduced active onboarding work from roughly 45 minutes to about two with human QC retained.",
    proof: "Origin case",
  },
  {
    title: "Multi-tenant M365 reporting",
    detail:
      "Combined license inventory, cost validation, and utilization evidence into a repeatable client-ready workflow with tenant context and human review.",
    proof: "Public walkthrough",
  },
] as const;
