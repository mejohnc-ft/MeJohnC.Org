/**
 * Success Roadmap tracks for the Work tab timeline.
 * AI Products is first and selected by default. Endpoint Logistics
 * preserves the existing provisioning / Immy.Bot / Autopilot story.
 */

export const TIMELINE_TRACKS = [
  {
    id: "ai-products",
    label: "AI Products",
    heading: "AI products I lead or ship",
    summary:
      "I built an app platform, several individual apps, and an agent and compute federation platform. Two of the app platforms I stewarded from idea through to completion. Not yet one platform.",
  },
  {
    id: "endpoint-logistics",
    label: "Endpoint Logistics",
    heading: "Provisioning: Automation & Logistics Transformation",
    summary:
      "COVID backlog through Immy.Bot, one-touch provisioning, and Autopilot / 3PL.",
  },
] as const;

export type TimelineTrackId = (typeof TIMELINE_TRACKS)[number]["id"];

export const DEFAULT_TIMELINE_TRACK: TimelineTrackId = "ai-products";
export const DEFAULT_TIMELINE_SLUG = "provisioning-roadmap";

export function isTimelineTrackId(
  value: string | null | undefined,
): value is TimelineTrackId {
  return TIMELINE_TRACKS.some((track) => track.id === value);
}

export function resolveTimelineTrack(
  value: string | null | undefined,
): TimelineTrackId {
  return isTimelineTrackId(value) ? value : DEFAULT_TIMELINE_TRACK;
}

export interface TimelineItem {
  id: string;
  label: string;
  phase: string;
  summary: string | null;
  content: string | null;
  dot_position: number;
  track: TimelineTrackId;
  entry_key: string | null;
}

/** Live Endpoint Logistics copy (Supabase fallback when the DB is empty). */
export const defaultLogisticsEntries: TimelineItem[] = [
  {
    id: "2022-2023",
    label: "2022-2023",
    phase: "Recovery & Foundation",
    summary:
      "Cleared COVID backlog, created inventory sheets, standardized SOPs & SLAs",
    content: `Starting at centrexIT in 2022, I inherited a provisioning backlog of over 72 tickets accumulated during the COVID-19 pandemic. It had blown our teams, office, and operational standards apart. Within 6 months, I systematically cleared this backlog by implementing standardized workflows and creating comprehensive inventory tracking sheets. I partnered with the Director of Operations to reintroduce media sanitization protocols that had lapsed and established the SOPs and SLAs that would become the foundation for all future automation work. This phase was about building trust, understanding the systems, and laying the groundwork for what was to come.`,
    dot_position: 15,
    track: "endpoint-logistics",
    entry_key: "2022-2023",
  },
  {
    id: "2024",
    label: "2024",
    phase: "Automation & Knowledge",
    summary: "Completed Immy.Bot buildout, standardized Provisioning KB",
    content: `2024 marked the shift from manual processes to intelligent automation. I completed the full Immy.Bot buildout, enabling automated software deployments and configurations across our entire client base. The Provisioning Knowledge Base was standardized and made accessible, transforming tribal knowledge into documented, searchable resources. This year laid the technical foundation that would enable the dramatic improvements seen in 2025.`,
    dot_position: 24,
    track: "endpoint-logistics",
    entry_key: "2024",
  },
  {
    id: "2025",
    label: "2025",
    phase: "Optimization & Growth",
    summary:
      "One-touch provisions for 75%+ clients, <2 day turnaround, record-breaking October, systems automation & observability",
    content: `2025 was the year it all clicked. We delivered in-house, one-touch provisioning for 75%+ of our clients and cut turnaround to under two business days—down from weeks in prior years. October 2025 was our biggest provisioning month ever.

We also launched a new Inventory system with a much better UX and started stacking automations on top of Immy.Bot—tying inventory, ticketing, and provisioning into a single, measurable workflow form in Rewst for our Provisioning Engineer. I handed off day-to-day provisioning to a new hire, built the Provisioning ToolBox (15 KB pieces), and closed out the year with fully automated provisioning plus inventory intake.`,
    dot_position: 50,
    track: "endpoint-logistics",
    entry_key: "2025",
  },
  {
    id: "2026+",
    label: "2026+",
    phase: "Future State",
    summary:
      "Autopilot/White glove for all clients, 3PL integration, office-free logistics",
    content: `Looking ahead, the vision is complete automation independence. Every client will have Autopilot or White Glove configuration ready from day one. Third-party logistics (3PL) integration will reduce costs while maintaining our rigorous SLAs. The ultimate goal: eliminate any reliance on physical office space for inventory and logistics, enabling a fully distributed, resilient provisioning operation.`,
    dot_position: 75,
    track: "endpoint-logistics",
    entry_key: "2026+",
  },
];

/** Lightweight AI Product pills so the DB and fallback share the same track. */
export const defaultAiProductEntries: TimelineItem[] = [
  {
    id: "ai-service-desk-toolbox",
    label: "Service Delivery",
    phase: "Technician automations",
    summary:
      "Ticket-linked automations for identity, mail, and access; humans review before writeback.",
    content: null,
    dot_position: 70,
    track: "ai-products",
    entry_key: "service-desk-toolbox",
  },
  {
    id: "ai-client-toolbox",
    label: "Portfolio Management",
    phase: "Evidence-backed client reviews",
    summary:
      "A workspace that turns identity, endpoint, and security evidence into a client book you can explain.",
    content: null,
    dot_position: 78,
    track: "ai-products",
    entry_key: "client-toolbox",
  },
  {
    id: "ai-deep-research",
    label: "Deep Research / Technical investigations",
    phase: "Technical investigations",
    summary:
      "Investigation assistant for incidents and technical questions; people review findings before writeback.",
    content: null,
    dot_position: 66,
    track: "ai-products",
    entry_key: "deep-research",
  },
  {
    id: "ai-iris",
    label: "Multimodal Enterprise Agent",
    phase: "Governed employee AI",
    summary:
      "The assistant people talk to, with durable skills and approval-gated action.",
    content: null,
    dot_position: 82,
    track: "ai-products",
    entry_key: "iris",
  },
  {
    id: "ai-iris-os",
    label: "Agentic Application OS Platform",
    phase: "Application OS",
    summary:
      "The agentic application OS I stewarded: the shell where governed agents and apps run.",
    content: null,
    dot_position: 86,
    track: "ai-products",
    entry_key: "iris-os",
  },
  {
    id: "ai-accessai",
    label: "Agent and Compute Federation Platform",
    phase: "AI control plane",
    summary:
      "Identities, models, agents, tools, cost, audit, evaluation, and rollback. Not an end-user assistant.",
    content: null,
    dot_position: 56,
    track: "ai-products",
    entry_key: "accessai",
  },
  {
    id: "ai-proxima",
    label: "DevOps Teammate",
    phase: "Governed agentic engineering",
    summary:
      "Draft branch, draft PR, and green CI for approved work; humans still merge.",
    content: null,
    dot_position: 62,
    track: "ai-products",
    entry_key: "proxima",
  },
];

export const defaultTimelineData: TimelineItem[] = [
  ...defaultAiProductEntries,
  ...defaultLogisticsEntries,
];

export function normalizeTimelineTrack(
  track: string | null | undefined,
): TimelineTrackId {
  return track === "ai-products" ? "ai-products" : "endpoint-logistics";
}

export function entriesForTrack(
  entries: TimelineItem[],
  track: TimelineTrackId,
): TimelineItem[] {
  return entries.filter((entry) => entry.track === track);
}

export function productOrderKeys(entries: TimelineItem[]): string[] {
  return entries
    .filter((entry) => entry.track === "ai-products" && entry.entry_key)
    .map((entry) => entry.entry_key as string);
}
