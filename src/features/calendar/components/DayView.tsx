import { format, isSameDay, isToday } from "date-fns";
import type { CalendarItem } from "../types";
import { EventChip } from "./EventChip";
import { cn } from "@/lib/utils";

interface DayViewProps {
  currentDate: Date;
  items: CalendarItem[];
  onSelectEvent: (item: CalendarItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ currentDate, items, onSelectEvent }: DayViewProps) {
  const dayItems = items.filter((item) => isSameDay(item.startAt, currentDate));
  const allDayItems = dayItems.filter((item) => item.isAllDay);
  const timedItems = dayItems.filter((item) => !item.isAllDay);
  const today = isToday(currentDate);

  function getItemsForHour(hour: number): CalendarItem[] {
    return timedItems.filter((item) => item.startAt.getHours() === hour);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        <div className="text-xs text-muted-foreground">
          {format(currentDate, "EEEE")}
        </div>
        <div
          className={cn(
            "text-2xl font-bold",
            today ? "text-primary" : "text-foreground",
          )}
        >
          {format(currentDate, "MMMM d, yyyy")}
        </div>
      </div>

      {/* All-day events */}
      {allDayItems.length > 0 && (
        <div className="px-4 py-2 border-b border-border space-y-1 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            All Day
          </span>
          {allDayItems.map((item) => (
            <EventChip key={item.id} item={item} onClick={onSelectEvent} />
          ))}
        </div>
      )}

      {/* Hourly grid */}
      <div className="flex-1 overflow-auto">
        {HOURS.map((hour) => {
          const hourItems = getItemsForHour(hour);
          return (
            <div
              key={hour}
              className="flex border-b border-border min-h-[48px]"
            >
              <div className="w-16 flex-shrink-0 px-2 py-1 text-xs text-muted-foreground text-right pr-3 border-r border-border">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
              </div>
              <div className="flex-1 p-0.5 space-y-0.5">
                {hourItems.map((item) => (
                  <EventChip
                    key={item.id}
                    item={item}
                    onClick={onSelectEvent}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
