import { format } from "date-fns";
import type { CalendarItem } from "../types";
import { cn } from "@/lib/utils";

const SOURCE_STYLES: Record<string, string> = {
  event: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  task: "bg-green-500/20 text-green-700 dark:text-green-300",
  follow_up: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  blog: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  campaign: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  workflow: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
};

const COLOR_STYLES: Record<string, string> = {
  sky: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  blue: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  indigo: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  violet: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
  purple: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  pink: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  rose: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
  red: "bg-red-500/20 text-red-700 dark:text-red-300",
  orange: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  amber: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  yellow: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  lime: "bg-lime-500/20 text-lime-700 dark:text-lime-300",
  green: "bg-green-500/20 text-green-700 dark:text-green-300",
  emerald: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  teal: "bg-teal-500/20 text-teal-700 dark:text-teal-300",
  cyan: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
};

export function getEventColorClasses(item: CalendarItem): string {
  if (item.source === "event") {
    return COLOR_STYLES[item.color] ?? COLOR_STYLES.sky;
  }
  return SOURCE_STYLES[item.source] ?? SOURCE_STYLES.event;
}

interface EventChipProps {
  item: CalendarItem;
  compact?: boolean;
  onClick?: (item: CalendarItem) => void;
}

export function EventChip({ item, compact = false, onClick }: EventChipProps) {
  const colorClasses = getEventColorClasses(item);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(item);
      }}
      className={cn(
        "w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate transition-opacity hover:opacity-80",
        colorClasses,
        compact && "py-0",
      )}
      title={`${item.title}${!item.isAllDay ? ` - ${format(item.startAt, "h:mm a")}` : ""}`}
    >
      {!compact && !item.isAllDay && (
        <span className="opacity-70 mr-1">{format(item.startAt, "h:mm")}</span>
      )}
      {item.title}
    </button>
  );
}
