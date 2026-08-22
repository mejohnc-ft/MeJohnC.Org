import type { TimelineItem } from "./timeline-tracks";

export type LoopStage = "sense" | "decide" | "govern" | "build" | "operate";

export const LOOP_STAGE_LABELS: Record<LoopStage, string> = {
  sense: "Sense",
  decide: "Decide",
  govern: "Govern",
  build: "Build",
  operate: "Operate",
};

export interface ProductBrief {
  id: string;
  name: string;
  tagline: string;
  chips: string[];
  loopStages: LoopStage[];
  capabilities: string[];
  shipped: string;
  stack: string[];
  proven: string[];
  preGa: string[];
  target: string[];
}

export interface PortfolioThesis {
  title: string;
  lead: string;
  tags: string[];
  loop: { stage: LoopStage; detail: string }[];
  honestClaim: string;
  agentAuthority: string;
}

export const portfolioThesis: PortfolioThesis = {
  title: "Governed AI for the Enterprise work I ship",
  lead: "I ship governed AI products that IT leaders and the people who run operations actually use: evidence-preserving client reviews, technician assistance, a company-grounded assistant, and a delivery agent that stays in draft until a human merges. These are substantial products I led or shipped at centrexIT — not yet one uniformly integrated platform. accessAI, the shared control plane, is pre-GA.",
  tags: [
    "Evidence-preserving workflows",
    "Governed agents",
    "Human production authority",
    "Honest pre-GA claims",
  ],
  loop: [
    {
      stage: "sense",
      detail:
        "Pull ticket, meeting, and client signals without dropping the source.",
    },
    {
      stage: "decide",
      detail: "Turn that evidence into work a human can defend.",
    },
    {
      stage: "govern",
      detail:
        "Decide which identities, models, and agents may run. accessAI is still pre-GA.",
    },
    {
      stage: "build",
      detail:
        "Draft delivery stays in review until CI is green and a person merges.",
    },
    {
      stage: "operate",
      detail: "Technicians finish the work; writeback waits for a human.",
    },
  ],
  honestClaim:
    "A developing set of substantial products — not yet one uniformly integrated platform.",
  agentAuthority:
    "Agents advise, draft, and test. People keep merge, deploy, and production authority.",
};

export const productBriefs: ProductBrief[] = [
  {
    id: "client-toolbox",
    name: "Client Toolbox",
    tagline:
      "A vITM workspace that turns identity, endpoint, and security evidence into a client book you can explain — scores, gaps, and next conversations.",
    chips: [
      "Assigned client book",
      "Explainable scores",
      "Evidence provenance",
    ],
    loopStages: ["sense", "decide", "operate"],
    capabilities: [
      "A scoped book of clients, not a generic dashboard",
      "Scores that point back to a control, a source, and how fresh the evidence is",
      "Gaps lower confidence instead of looking clean",
      "A governed AI teammate that drafts; source systems stay authoritative",
    ],
    shipped:
      "Designed and shipped the evidence spine: collection, scoring, and the workspace used to review a client.",
    stack: [
      "React",
      "TypeScript",
      "Azure Static Web Apps",
      "Entra ID",
      "Supabase",
      "PostgreSQL",
      "Rewst",
      "Azure AI Foundry",
    ],
    proven: ["Collection", "Provenance", "Scoring workspace"],
    preGa: [],
    target: ["Shared outcome tracking with the rest of the portfolio"],
  },
  {
    id: "service-desk-toolbox",
    name: "Service Desk Toolbox + Incident Buddy",
    tagline:
      "Technician app, built with the service desk team, that routes tickets into guided automations and an investigation assistant. Humans review before writeback.",
    chips: ["Ticket-linked automations", "Incident Buddy", "Human writeback"],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Guided automations for common identity, mail, and access work",
      "Ticket context stays attached to the run",
      "Incident Buddy investigates across the usual IT operations domains",
      "Humans review findings before anything is written back",
    ],
    shipped:
      "Shipped with the service desk team: ticket-linked automations and an investigation assistant that does not write back until a human reviews.",
    stack: [
      "Rewst",
      "Halo",
      "Azure AI Foundry",
      "Microsoft Teams",
      "TypeScript",
    ],
    proven: ["Technician shell", "Ticket linking", "Incident Buddy"],
    preGa: [],
    target: ["Shared outcome tracking with the rest of the portfolio"],
  },
  {
    id: "iris",
    name: "Iris",
    tagline:
      "A company-grounded assistant in Teams and Iris OS. It researches, remembers, and drafts — and only acts after someone approves.",
    chips: ["Teams + Iris OS", "Company context", "Approval-gated action"],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Answers grounded in handbook, people, tickets, and approved channels",
      "Research and drafts with citations",
      "Durable skills, reminders, and memory",
      "Specialists sit behind the same approval gate",
    ],
    shipped:
      "Led Iris: the Teams bot, the Iris OS shell, and the approval-gated action path.",
    stack: [
      "React",
      "TypeScript",
      "Azure Functions",
      "Azure AI Foundry",
      "Microsoft Graph",
      "Halo",
      "Rewst",
      "Bot Framework",
    ],
    proven: ["Teams bot", "Iris OS"],
    preGa: ["accessAI federation"],
    target: ["Tighter shared-control-plane integration"],
  },
  {
    id: "proxima",
    name: "Proxima",
    tagline:
      "Takes approved engineering work and returns a reviewed branch, a draft PR, and green CI. The model never marks its own work done.",
    chips: [
      "GitHub-native delivery",
      "Draft-mode only",
      "Human merge authority",
    ],
    loopStages: ["build"],
    capabilities: [
      "Implements approved work in a fresh clone bound to a real commit",
      "Opens draft PRs and repairs against actual CI",
      "Surfaces decisions in Teams instead of a chat firehose",
      "Humans keep merge, deploy, and anything that spends money",
    ],
    shipped:
      "Helped design the draft-mode delivery loop: agents implement and verify against real CI; people still merge.",
    stack: [
      "TypeScript",
      "Python",
      "Docker",
      "GitHub",
      "Node",
      "Azure",
      "Supabase",
    ],
    proven: ["Draft delivery loop"],
    preGa: ["Broader autonomy"],
    target: ["Shared delivery standard across products"],
  },
  {
    id: "accessai",
    name: "accessAI",
    tagline:
      "Pre-GA control plane for which identities, models, agents, and tools may run — plus cost, audit, evaluation, and rollback.",
    chips: [
      "Multi-model governance",
      "Tenant-safe execution",
      "Cost + audit",
      "Pre-GA",
    ],
    loopStages: ["govern"],
    capabilities: [
      "Routes work across Azure OpenAI, Anthropic, OpenAI, and Foundry",
      "Fail-closed identity and tenant isolation",
      "Records runs, cost, evals, and promotions",
      "Not an end-user assistant, and not sellable-GA yet",
    ],
    shipped:
      "Helped define the control-plane model — what may run, under whose authority, and how it gets promoted. Still pre-GA as a universal control plane.",
    stack: [
      "TypeScript",
      "Hono",
      "React",
      "PostgreSQL",
      "Azure Container Apps",
      "Key Vault",
    ],
    proven: ["Control-plane implementation"],
    preGa: ["Universal use"],
    target: ["Portfolio-wide enforcement"],
  },
];

export function getProductBrief(id: string): ProductBrief | undefined {
  return productBriefs.find((brief) => brief.id === id);
}

export function orderProductBriefs(entries?: TimelineItem[]): ProductBrief[] {
  if (!entries?.length) return productBriefs;
  const keys = entries
    .map((entry) => entry.entry_key)
    .filter((key): key is string => Boolean(key));
  if (!keys.length) return productBriefs;

  const byId = new Map(productBriefs.map((brief) => [brief.id, brief]));
  const ordered: ProductBrief[] = [];
  for (const key of keys) {
    const match = byId.get(key);
    if (match) {
      ordered.push(match);
      byId.delete(key);
    }
  }
  for (const remaining of byId.values()) {
    ordered.push(remaining);
  }
  return ordered;
}
