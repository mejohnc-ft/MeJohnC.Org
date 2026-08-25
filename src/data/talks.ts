/**
 * Public talks for the Content tab.
 *
 * Titles and dates are not invented. When John posts a talk, add it here
 * (or later via CMS) with an ISO `occurredAt` timestamp.
 */
export interface Talk {
  id: string;
  title: string;
  occurredAt: string;
  format?: "Conference session" | "Webinar" | "Community contribution";
  venue?: string;
  url?: string;
  summary?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export const talks: Talk[] = [
  {
    id: "centrex-it-automation-adoption-webinar",
    title:
      "Stop waiting, start now, scale fast: CentrexIT's playbook for automation adoption",
    occurredAt: "2026-08-20",
    format: "Webinar",
    venue: "Rewst webinar interview",
    url: "https://rewst.io/resources/webinar/stop-waiting-start-now-scale-fast-centrexits-playbook",
    summary:
      "Discussed how centrexIT moved from one-off scripts to a repeatable automation program through measurement, technician adoption, and reusable workflows.",
    imageUrl:
      "https://go.rewst.io/hubfs/CentrexIT-Webinar-August-2026%20%281%29.png",
    imageAlt:
      "Rewst webinar artwork for centrexIT's automation adoption playbook",
  },
  {
    id: "rewst-flow-2026-community-live",
    title: "Rewst Community Live Open Mic — FLOW 2026",
    occurredAt: "2026-06",
    format: "Conference session",
    venue: "FLOW 2026 · Nashville, Tennessee",
    url: "https://www.youtube.com/watch?v=EInZA_rqaYE&list=PLDWjfoX6CSp_wWBMPvS3XLEUn4GU-gWqB&index=11",
    summary:
      "Presented centrexIT's service-delivery workspace and AI-assisted incident investigation alongside the automation team at FLOW 2026.",
    imageUrl: "https://i.ytimg.com/vi/EInZA_rqaYE/maxresdefault.jpg",
    imageAlt: "Rewst Community Live Open Mic at FLOW 2026",
  },
  {
    id: "rewst-m365-license-reporting-community-contribution",
    title: "How to automate M365 license cost reports in Rewst",
    occurredAt: "2026-05-13",
    format: "Community contribution",
    venue: "Rewst Community Creations",
    url: "https://youtu.be/458APcbS9aY?si=zhBEF5i19aBrbFmN",
    summary:
      "Demonstrated a multi-tenant workflow that combines license inventory, cost validation, and Microsoft 365 usage into a client-ready report.",
    imageUrl: "https://i.ytimg.com/vi/458APcbS9aY/maxresdefault.jpg",
    imageAlt:
      "How to automate Microsoft 365 license cost reports in Rewst video",
  },
];

export function sortTalksByDateDesc(items: Talk[]): Talk[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.occurredAt);
    const bTime = Date.parse(b.occurredAt);
    const aValid = Number.isFinite(aTime) ? aTime : 0;
    const bValid = Number.isFinite(bTime) ? bTime : 0;
    return bValid - aValid;
  });
}

export function formatTalkTimestamp(isoDate: string): string {
  const parsed = Date.parse(isoDate);
  if (!Number.isFinite(parsed)) return isoDate;

  const monthPrecision = /^\d{4}-\d{2}$/.test(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    ...(monthPrecision ? {} : { day: "numeric" as const }),
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
