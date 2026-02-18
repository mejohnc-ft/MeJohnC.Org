import { format, isToday, startOfDay } from "date-fns";
import type { CalendarItem } from "../types";
import { getEventColorClasses } from "./EventChip";
import { cn } from "@/lib/utils";

interface AgendaViewProps {
  items: CalendarItem[];
  onSelectEvent: (item: CalendarItem) => void;
}

export function AgendaView({ items, onSelectEvent }: AgendaViewProps) {
  // Group items by day
  const grouped = items.reduce<Map<string, CalendarItem[]>>((acc, item) => {
    const key = startOfDay(item.startAt).toISOString();
    const existing = acc.get(key) ?? [];
    existing.push(item);
    acc.set(key, existing);
    return acc;
  }, new Map());

  const sortedDays = Array.from(grouped.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
  );

  if (sortedDays.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No upcoming events in this range.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {sortedDays.map(([dayKey, dayItems]) => {
        const day = new Date(dayKey);
        const today = isToday(day);

        return (
          <div key={dayKey}>
            <div
              className={cn(
                "sticky top-0 bg-background/95 backdrop-blur-sm px-2 py-1 mb-2 border-b border-border",
                today && "border-primary/30",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  today ? "text-primary" : "text-foreground",
                )}
              >
                {today ? "Today" : format(day, "EEEE")}
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                {format(day, "MMMM d, yyyy")}
              </span>
            </div>
            <div className="space-y-1.5 pl-2">
              {dayItems.map((item) => {
                const colorClasses = getEventColorClasses(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectEvent(item)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-1 h-8 rounded-full flex-shrink-0",
                        colorClasses.split(" ")[0]?.replace("/20", ""),
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.isAllDay
                          ? "All day"
                          : `${format(item.startAt, "h:mm a")}${item.endAt ? ` - ${format(item.endAt, "h:mm a")}` : ""}`}
                        {item.source !== "event" && (
                          <span className="ml-2 capitalize">
                            {item.source.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
