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
  lead: "I built an app platform, several individual apps, and an agent and compute federation platform. Two of the app platforms I stewarded from idea through scoping, iteration, and review, and saw through to completion. It is governed AI that IT leaders and the people who run operations actually use. These are substantial products — not yet one uniformly integrated platform.",
  tags: [
    "Evidence-preserving workflows",
    "Governed agents",
    "Human production authority",
    "Honest product claims",
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
      detail: "Decide which identities, models, and agents may run.",
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
    id: "service-desk-toolbox",
    name: "Service Delivery",
    tagline:
      "A technician workspace that routes tickets into guided automations for identity, mail, and access work. Humans review before writeback.",
    chips: [
      "Ticket-linked automations",
      "Guided runbooks",
      "Human writeback",
    ],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Guided automations for common identity, mail, and access work",
      "Ticket context stays attached to the run",
      "Humans review before anything is written back",
      "Built with the people who close the tickets",
    ],
    shipped:
      "I shipped this with the service desk team: ticket-linked automations that do not write back until a human reviews.",
    stack: [
      "Rewst",
      "Halo",
      "Azure AI Foundry",
      "Microsoft Teams",
      "TypeScript",
    ],
  },
  {
    id: "client-toolbox",
    name: "Portfolio Management",
    tagline:
      "A workspace that turns identity, endpoint, and security evidence into a client book you can explain — scores, gaps, and next conversations.",
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
      "I stewarded this workspace from idea through scoping, iteration, and review to completion: collection, scoring, and the client book used to review evidence.",
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
  },
  {
    id: "deep-research",
    name: "Deep Research / Technical investigations",
    tagline:
      "An investigation assistant for incidents and technical questions across identity, endpoint, mail, and operations. People review findings before anything is written back.",
    chips: [
      "Cross-domain investigation",
      "Cited findings",
      "Human writeback",
    ],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Investigates across identity, endpoint, mail, and related operations domains",
      "Ticket and source context stay attached to the run",
      "Findings a person can check before they act",
      "Nothing is written back until a human reviews",
    ],
    shipped:
      "I shipped an investigation assistant that drafts findings across the usual operations domains and waits for a human before writeback.",
    stack: [
      "Rewst",
      "Halo",
      "Azure AI Foundry",
      "Microsoft Teams",
      "TypeScript",
    ],
  },
  {
    id: "iris",
    name: "Multimodal Enterprise Agent",
    tagline:
      "The assistant people talk to in Teams. It researches, remembers, and drafts — and only acts after someone approves.",
    chips: ["Teams", "Company context", "Approval-gated action"],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Answers grounded in handbook, people, tickets, and approved channels",
      "Research and drafts with citations",
      "Durable skills, reminders, and memory",
      "Specialists sit behind the same approval gate",
    ],
    shipped:
      "I led the assistant people talk to: the Teams bot, company-grounded answers, and the approval-gated action path.",
    stack: [
      "TypeScript",
      "Azure Functions",
      "Azure AI Foundry",
      "Microsoft Graph",
      "Halo",
      "Rewst",
      "Bot Framework",
      "Microsoft Teams",
    ],
  },
  {
    id: "iris-os",
    name: "Agentic Application OS Platform",
    tagline:
      "The agentic application OS I stewarded from idea through to completion: the shell where governed agents and apps run, with one approval path.",
    chips: ["Application shell", "Shared context", "Approval-gated action"],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Hosts assistants and specialists behind one application shell",
      "Shared company context, memory, and skills",
      "Approval-gated action for anything that writes or spends",
      "One OS for the agents and apps, not a pile of disconnected chat windows",
    ],
    shipped:
      "I stewarded this OS platform from idea through scoping, iteration, and review to completion — the shell the assistants run in, with a single approval-gated action path.",
    stack: [
      "React",
      "TypeScript",
      "Azure Functions",
      "Azure AI Foundry",
      "Microsoft Graph",
      "Halo",
      "Rewst",
      "Microsoft Teams",
    ],
  },
  {
    id: "accessai",
    name: "Agent and Compute Federation Platform",
    tagline:
      "Control plane for which identities, models, agents, and tools may run — plus cost, audit, evaluation, and rollback. Not an end-user assistant.",
    chips: ["Multi-model governance", "Tenant-safe execution", "Cost + audit"],
    loopStages: ["govern"],
    capabilities: [
      "Routes work across Azure OpenAI, Anthropic, OpenAI, and Foundry",
      "Fail-closed identity and tenant isolation",
      "Records runs, cost, evals, and promotions",
      "Governs what may run; it is not an end-user assistant",
    ],
    shipped:
      "I helped define the federation model — which identities, models, agents, and tools may run, under whose authority, and how a run is audited, evaluated, and rolled back.",
    stack: [
      "TypeScript",
      "Hono",
      "React",
      "PostgreSQL",
      "Azure Container Apps",
      "Key Vault",
    ],
  },
  {
    id: "proxima",
    name: "DevOps Teammate",
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
      "I helped design the draft-mode delivery loop: a teammate that implements and verifies against real CI; people still merge.",
    stack: [
      "TypeScript",
      "Python",
      "Docker",
      "GitHub",
      "Node",
      "Azure",
      "Supabase",
    ],
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
