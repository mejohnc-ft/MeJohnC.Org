import type { TimelineItem } from "./timeline-tracks";

export type LoopStage = "sense" | "decide" | "govern" | "build" | "operate";

export const LOOP_STAGE_LABELS: Record<LoopStage, string> = {
  sense: "Sense",
  decide: "Decide",
  govern: "Govern",
  build: "Build+prove",
  operate: "Operate+learn",
};

export interface ReadinessLedger {
  lifecycle: string;
  adoption: string;
  production: string;
  ownership: string;
  risk: string;
}

export interface ProductBrief {
  id: string;
  name: string;
  owner: string;
  tagline: string;
  chips: string[];
  loopStages: LoopStage[];
  capabilities: string[];
  primaryCapability: string;
  stack: string[];
  flow: string[];
  engineeringNotes?: string;
  securityNotes?: string;
  readiness: ReadinessLedger;
  proven: string[];
  preGa: string[];
  target: string[];
}

export interface PortfolioThesis {
  title: string;
  lead: string;
  tags: string[];
  loop: { stage: LoopStage; detail: string }[];
  cohesive: string;
  honestClaim: string;
  layers: { name: string; detail: string }[];
  guardrails: string[];
  agentAuthority: string;
  currentTruth: string;
  operatingEvidence: ReadinessLedger;
  namedSeams: string[];
}

export const portfolioThesis: PortfolioThesis = {
  title: "A developing operating system for MSP work",
  lead: "centrexIT’s portfolio is a developing operating system for how an MSP senses demand, chooses investments, governs AI, builds safely, completes work, and learns. Products are substantial today; common contracts, package adoption, and several cross-product governance seams remain pre-GA or target state.",
  tags: [
    "14 normalized briefs",
    "Evidence-preserving workflows",
    "Human production authority",
    "Shared governance model",
  ],
  loop: [
    {
      stage: "sense",
      detail:
        "Spark captures employee/meeting signals; Spot finds client opportunity; Service Desk and AI Triage capture ticket evidence; Client Toolbox assembles client posture; Iris captures employee intent and feedback.",
    },
    {
      stage: "decide",
      detail:
        "Client Toolbox → client strategy; Navigate governs company strategy/KPIs; Vantage scores demand, governs PRDs and ROI, assigns ownership, measures realized value.",
    },
    {
      stage: "govern",
      detail:
        "accessAI is the shared control-plane for identity, models, agents, tools, policy, runs, cost, audit, evaluation, promotion, rollback.",
    },
    {
      stage: "build",
      detail:
        "Proxima governs delivery automation; Cadre supplies durable threads, paired execution hosts, workspace tools, evaluations, engineering evidence.",
    },
    {
      stage: "operate",
      detail:
        "Service Desk Toolbox completes technician work; AI Triage improves routing; Knowledge governs documentation; Iris orchestrates context, durable work, specialists, approval-gated action.",
    },
  ],
  cohesive:
    "One governed operating loop from human signal to proven value. The defensible asset is not a chatbot. It is domain-specific apps + evidence-preserving decision flows + governed AI + agentic delivery inside deterministic controls + shared human-control design language.",
  honestClaim:
    "Coherent portfolio with strong product depth and a credible control-plane architecture — not yet one uniformly integrated or enforced platform.",
  layers: [
    { name: "Signal", detail: "Spark + operational evidence" },
    { name: "Decision", detail: "Client Toolbox + Vantage" },
    { name: "Control", detail: "accessAI" },
    { name: "Delivery", detail: "Proxima + development standard" },
    { name: "Work", detail: "Service Desk + Iris" },
  ],
  guardrails: [
    "Tenant safety",
    "Bounded agents",
    "Deterministic evidence",
    "Human control",
  ],
  agentAuthority:
    "Agents may advise, draft, test, and reconcile. Humans retain merge, deploy, external-send, destructive-action, billing, and autonomy-promotion.",
  currentTruth:
    "Strong products; uneven shared enforcement. accessAI is substantial but pre-GA as a universal control plane.",
  operatingEvidence: {
    lifecycle: "Portfolio convergence",
    adoption: "Product-level evidence, one baseline pending",
    production: "Mixed live / pre-GA / target",
    ownership: "Leadership + named product owners",
    risk: "Uneven shared-contract enforcement",
  },
  namedSeams: [
    "Cadre",
    "Spark",
    "Spot",
    "Navigate",
    "Vantage",
    "Knowledge",
    "AI Triage",
  ],
};

export const productBriefs: ProductBrief[] = [
  {
    id: "client-toolbox",
    name: "Client Toolbox",
    owner: "John",
    tagline:
      "Evidence-backed vITM workspace converting identity, endpoint, security, network, licensing, and service data into a scoped client portfolio, explainable health, prioritized opportunities, and QBR-ready decisions.",
    chips: [
      "Assigned client book",
      "Explainable controls",
      "QBR lifecycle",
      "Evidence provenance",
    ],
    loopStages: ["sense", "decide", "operate"],
    capabilities: [
      "Assigned client book",
      "Client 360",
      "Transparent standards (every score → control, observation, source, evidence age, coverage, confidence)",
      "Risk / opportunity",
      "QBR lifecycle",
      "Governed AI teammate “Buddy” (source systems remain authoritative)",
    ],
    primaryCapability:
      "One evidence spine from source system to QBR. Honest gaps reduce confidence instead of reading clean.",
    stack: [
      "React",
      "TypeScript",
      "Vite",
      "Azure SWA",
      "Entra ID",
      "Supabase",
      "PostgreSQL RLS",
      "Rewst collectors",
      "Azure AI Foundry",
      "Teams",
    ],
    flow: [
      "Collect",
      "Reconcile identities",
      "Score",
      "Review",
      "Communicate QBR",
    ],
    engineeringNotes:
      "One issue per PR; locked builds, migration replay, typecheck, lint, tests, SWA smoke, security contracts, screenshots, perf budgets.",
    securityNotes:
      "Entra roles, signed principals, RLS, service-only mutations, scoped machine creds, audit.",
    readiness: {
      lifecycle: "Toolbox Next staging",
      adoption: "Assigned-client workflow, baseline pending",
      production: "Live collection and QBR workspace",
      ownership: "John",
      risk: "Portfolio-wide outcome linkage incomplete",
    },
    proven: [
      "Collection",
      "Provenance",
      "Controls",
      "Workspaces",
      "QBR",
    ],
    preGa: [],
    target: ["Universal outcome linkage to Vantage"],
  },
  {
    id: "service-desk-toolbox",
    name: "Service Desk Toolbox + Incident Buddy",
    owner: "Toby",
    tagline:
      "Technician app that routes Halo tickets to governed automations and uses Incident Buddy for 10-domain investigations, then writes results back.",
    chips: [
      "20+ automation forms",
      "Rewst-hosted shell",
      "Halo-connected work",
      "10-domain investigation",
    ],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Application shell",
      "20+ guided forms via Rewst (identity, Exchange, provisioning, security, service)",
      "Halo ticket linking",
      "Incident Buddy across identity, access, mail, endpoint, security, network, automation, ticket, client, infrastructure",
      "Automation program metrics",
      "Teams bot is intentionally narrow (chat + EOD numbers)",
    ],
    primaryCapability:
      "Raise ticket quality with cross-system context. Human reviews findings before Halo writeback.",
    stack: [
      "Custom Toolbox shell",
      "Rewst host / auth / forms",
      "Halo SOR",
      "Azure AI Foundry",
      "Teams",
    ],
    flow: [
      "Intake Halo",
      "Route",
      "Investigate 10 domains",
      "Human review",
      "Record + measure",
    ],
    readiness: {
      lifecycle: "Operational product",
      adoption: "20+ forms in use",
      production: "Live technician app",
      ownership: "Toby",
      risk: "Portfolio outcome backbone still target",
    },
    proven: ["Shell", "Catalog", "Ticket linking", "Incident Buddy"],
    preGa: [],
    target: ["Portfolio outcome backbone"],
  },
  {
    id: "iris",
    name: "Iris",
    owner: "John",
    tagline:
      "One assistant that understands company, client, ticket, meeting, and operational context, then researches, creates, remembers, schedules, investigates, and takes approved action from Teams or Iris OS.",
    chips: [
      "Teams + Iris OS",
      "Company-grounded answers",
      "Durable skills",
      "Approved action",
    ],
    loopStages: ["sense", "operate"],
    capabilities: [
      "Teams + Iris OS (chat, role-composed home, apps, pins, files, skills, voice, search, PWA)",
      "Grounds in handbook, people, approved Teams channels, MeetingOS, live Halo, ticket history, client records",
      "Research / create with citations, OCR, signed expiring artifacts",
      "Reminders, memory, skills, chains",
      "Specialists (Incident Buddy, vITM tools)",
      "Governed action via brokers (mail, calendar, MeetingOS, Halo, Rewst) with payload-bound approval and audit",
    ],
    primaryCapability:
      "Personal AI with company context and permission to act.",
    stack: [
      "Bot Framework",
      "Adaptive Cards",
      "React",
      "TypeScript",
      "Vite",
      "Cuelume",
      "PWA SWA",
      "iris-sdk",
      "Azure Functions Node 22 v4",
      "Durable Functions",
      "Azure AI Foundry",
      "Azure Tables",
      "Blob",
      "AI Search",
      "Rewst",
      "Halo",
      "Graph",
      "accessAI",
    ],
    flow: [
      "Ask",
      "Resolve identity / scope",
      "Ground",
      "Execute",
      "Govern + learn",
    ],
    readiness: {
      lifecycle: "Integrated product, federation pre-GA",
      adoption: "Teams + Iris OS in use",
      production: "Live assistant; accessAI federation pre-GA",
      ownership: "John",
      risk: "accessAI federation",
    },
    proven: ["Manager", "Teams", "Iris OS"],
    preGa: ["accessAI federation"],
    target: ["Full agent-OS citizenship"],
  },
  {
    id: "proxima",
    name: "Proxima",
    owner: "Shared platform",
    tagline:
      "Turns approved Vantage work and GitHub evidence into reviewed branches, draft PRs, green CI, traceable delivery records, and concise human decisions.",
    chips: [
      "Vantage-governed intent",
      "GitHub-native delivery",
      "CI-bound completion",
      "Draft-mode autonomy",
    ],
    loopStages: ["build"],
    capabilities: [
      "Steward approved Vantage work",
      "Review PR estate (small unambiguous fixes only)",
      "Build drafts in a fresh clone bound to true head SHA",
      "Repair against real CI (up to two passes; model never self-declares success)",
      "Reconcile to Vantage / Halo via signed Rewst bridge",
      "Teams surfaces decisions, not noise",
    ],
    primaryCapability:
      "Agentic delivery inside a deterministic shell. Humans retain merge, deploy, risky, and cost-incurring action.",
    stack: [
      "Forge monorepo",
      "pnpm",
      "Turbo",
      "Node",
      "Python",
      "Docker",
      "GitHub App / CLI",
      "Azure CLI",
      "Supabase CLI",
    ],
    flow: [
      "Intake",
      "Claim",
      "Implement",
      "Verify exact SHA",
      "Repair + reconcile",
    ],
    engineeringNotes:
      "CI is automatic; production is governed. Draft-mode autonomy — the model never self-declares success.",
    readiness: {
      lifecycle: "Draft-mode, autonomy pre-GA",
      adoption: "Delivery loop in use for approved work",
      production: "Draft delivery live; autonomy maturity pre-GA",
      ownership: "Shared platform",
      risk: "Autonomy promotion still human-gated",
    },
    proven: ["Draft delivery loop"],
    preGa: ["Autonomy maturity"],
    target: ["Portfolio conformance operator"],
  },
  {
    id: "accessai",
    name: "accessAI",
    owner: "R&D",
    tagline:
      "Defines which identities, models, agents, tools, policies, compute destinations, and deployment bindings may operate; records execution, cost, audit, evaluation, promotion, rollback.",
    chips: [
      "Multi-model governance",
      "Tenant-safe execution",
      "Agent delivery control",
      "Cost + audit + evaluation",
    ],
    loopStages: ["govern"],
    capabilities: [
      "Multi-provider (Azure OpenAI, Anthropic, OpenAI, Foundry)",
      "Entra / MSAL JWT, API keys, tenant resolution, API RBAC, Postgres RLS",
      "Recipes / harnesses / destinations",
      "Builtin and Foundry execution with memory, tools, MCP, policy, approvals, kill switches",
      "Append-only audit, evals, promotion, cost, telemetry, rollback",
      "Central Exchange + Agent Factory",
    ],
    primaryCapability:
      "Control plane defines what/why; providers execute how. Shared infrastructure IP — not an end-user assistant or foundation model. Not sellable-GA yet (no releases/tags, 0.0.0 packages, incomplete golden path, no live second-tenant acceptance).",
    stack: [
      "Node 22",
      "TypeScript",
      "Hono",
      "React 19",
      "Vite 8",
      "Tailwind 4",
      "PostgreSQL 16 + pgvector",
      "Forced RLS",
      "Azure Container Apps",
      "SWA",
      "Key Vault",
      "Vitest",
      "Playwright",
      "CodeQL",
      "ZAP",
      "Trivy",
    ],
    flow: [
      "Discover",
      "Bind",
      "Authorize fail-closed",
      "Execute",
      "Promote or roll back",
    ],
    engineeringNotes:
      "Progressive deploy 5% → 25% → manually approved 100%.",
    securityNotes:
      "Forced RLS, fail-closed authorization, append-only audit, kill switches, tenant-safe execution.",
    readiness: {
      lifecycle: "Substantial control plane, pre-GA",
      adoption: "Not sellable-GA; no live second-tenant acceptance",
      production: "Broad implementation; universal use pre-GA",
      ownership: "R&D",
      risk: "Portfolio-wide enforcement is target state",
    },
    proven: ["Broad control-plane implementation"],
    preGa: ["Sellability / universal use"],
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
