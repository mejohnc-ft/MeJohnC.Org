/**
 * Career progress tracks for the Work tab. The legacy `ai-products` id is
 * retained for compatibility with existing timeline rows, but the public
 * track now tells the AI and automation adoption story. Product briefs live
 * on the Products tab.
 */

import {
  SERVICE_HOURS_RETURNED,
  SERVICE_HOURS_PERIOD,
} from "./career-evidence";

export const TIMELINE_TRACKS = [
  {
    id: "endpoint-logistics",
    label: "Provisioning & Logistics",
    heading: "From frontline support to an automated operating model",
    summary:
      "Three months in Tier 1, 18 months learning provisioning manually, then process redesign, platform automation, and concurrent lead, logistics, and field-support responsibility.",
  },
  {
    id: "ai-products",
    label: "AI & Automation",
    heading: "From in-role automation to full-time AI engineering",
    summary:
      "Automation began inside provisioning in 2023, accelerated on a platform in 2024, became the primary role in 2025, and expanded into measured team adoption in 2026.",
  },
] as const;

export type TimelineTrackId = (typeof TIMELINE_TRACKS)[number]["id"];

export const DEFAULT_TIMELINE_TRACK: TimelineTrackId = "endpoint-logistics";
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
    id: "2022",
    label: "2022",
    phase: "Tier 1 to Provisioning",
    summary:
      "Three months in frontline support, then into hands-on provisioning and backlog recovery.",
    content: `I started with three months in Tier 1 before moving into provisioning. The work was still highly manual, which gave me direct exposure to technician handoffs, client needs, inventory movement, configuration work, and quality-control failure points. Within six months I cleared a 72-ticket COVID backlog while rebuilding SOPs, SLAs, inventory tracking, knowledge, and media-sanitization controls.`,
    dot_position: 15,
    track: "endpoint-logistics",
    entry_key: "2022",
  },
  {
    id: "2022-2023",
    label: "2022–2023",
    phase: "Manual Process Transformed",
    summary:
      "Used roughly 18 months of hands-on provisioning context to redesign the process end to end.",
    content: `After roughly 18 months performing provisioning manually, I had enough operating context to redesign the process rather than automate assumptions. I standardized the knowledge, controls, and handoffs first, then began automation work inside the provisioning role in 2023. That is where my automation practice began.`,
    dot_position: 32,
    track: "endpoint-logistics",
    entry_key: "2022-2023",
  },
  {
    id: "2024",
    label: "2024",
    phase: "Platform Acceleration & Dual Lead",
    summary:
      "Accelerated the redesigned process on Immy.Bot while carrying provisioning, logistics, and field-support scope.",
    content: `I accelerated software deployment and configuration work on Immy.Bot while continuing to manage the provisioning operating model. Field Support Engineer and Provisioning Lead were concurrent functions: provisioning determined much of the equipment, configuration, inventory, and readiness required by onsite engineers, and I served as the primary logistics coordinator across that handoff. Automation increased the leverage of the role while people retained quality control.`,
    dot_position: 55,
    track: "endpoint-logistics",
    entry_key: "2024",
  },
  {
    id: "2025",
    label: "2025",
    phase: "Handoff & Scaled Model",
    summary:
      "Moved into AI Automation Engineering full-time while the provisioning system continued through handoff and reuse.",
    content: `In 2025, AI Automation Engineer became my full-time role. Day-to-day provisioning moved to a new owner while the operating model, knowledge, controls, and automation patterns remained. This is the transition point from transforming the operation I owned to applying the same method across other teams and departments.`,
    dot_position: 78,
    track: "endpoint-logistics",
    entry_key: "2025",
  },
];

/**
 * AI and automation adoption history. `ai-products` is the legacy persisted
 * track id; public labels and copy intentionally describe role progress rather
 * than the product catalog.
 */
export const defaultAiAutomationEntries: TimelineItem[] = [
  {
    id: "ai-automation-in-role",
    label: "2023",
    phase: "Automation Began In-Role",
    summary:
      "Began applying automation inside provisioning after redesigning the manual process.",
    content:
      "Automation started as part of my provisioning responsibility in 2023. The sequence is important: I first learned the work manually, redesigned the operating process, and then automated the stable parts. The formal full-time role followed in 2025.",
    dot_position: 18,
    track: "ai-products",
    entry_key: "ai-automation-in-role",
  },
  {
    id: "ai-automation-platform",
    label: "2024",
    phase: "Platform Acceleration",
    summary:
      "Used Immy.Bot to scale repeatable deployment and configuration work while retaining operating ownership.",
    content:
      "The work accelerated on Immy.Bot in 2024. I was still carrying provisioning-lead, logistics, and field-support responsibilities, so the automation was grounded in the full delivery chain rather than built from outside the operation. People retained quality control while the platform carried more repeatable work.",
    dot_position: 38,
    track: "ai-products",
    entry_key: "ai-automation-platform",
  },
  {
    id: "ai-automation-full-time",
    label: "2025",
    phase: "Full-Time AI Automation Engineer",
    summary:
      "Made AI and automation the primary role and extended the operating method across teams.",
    content:
      "In 2025, AI Automation Engineer became my formal full-time role. I moved from transforming provisioning to working forward-deployed across service and client teams: finding constraints, designing the workflow and authority model, contributing hands-on, driving adoption, and turning proven field patterns into reusable standards and products.",
    dot_position: 60,
    track: "ai-products",
    entry_key: "ai-automation-full-time",
  },
  {
    id: "ai-automation-adoption",
    label: "2026 YTD",
    phase: "Adoption at Scale",
    summary:
      "Expanded governed tools across a 15-person service team and measured service time returned.",
    content: `Service-delivery automation returned ${SERVICE_HOURS_RETURNED} hours in ${SERVICE_HOURS_PERIOD}. That is measured operational time returned, not a cash-savings or headcount-reduction claim. The service toolset is trending toward roughly one FTE of capacity across a team of 15; additional portfolio and strategy capacity remains explicitly labeled as projection.`,
    dot_position: 85,
    track: "ai-products",
    entry_key: "ai-automation-adoption",
  },
];

export const defaultTimelineData: TimelineItem[] = [
  ...defaultLogisticsEntries,
  ...defaultAiAutomationEntries,
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
