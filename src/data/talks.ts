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
  venue?: string;
  url?: string;
  summary?: string;
}

export const talks: Talk[] = [];

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
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
