import type { CalendarEventSource } from "@/lib/schemas";

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarItem {
  id: string;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  isAllDay: boolean;
  color: string;
  source: CalendarEventSource;
  sourceId: string;
  sourceRoute?: string;
  editable: boolean;
}
