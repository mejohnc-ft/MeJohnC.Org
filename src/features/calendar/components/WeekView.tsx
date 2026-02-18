import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
} from "date-fns";
import type { CalendarItem } from "../types";
import { EventChip } from "./EventChip";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  currentDate: Date;
  items: CalendarItem[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (item: CalendarItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({
  currentDate,
  items,
  onSelectDate,
  onSelectEvent,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const allDayItems = items.filter((item) => item.isAllDay);
  const timedItems = items.filter((item) => !item.isAllDay);

  function getTimedItemsForDayHour(day: Date, hour: number): CalendarItem[] {
    return timedItems.filter(
      (item) =>
        isSameDay(item.startAt, day) && item.startAt.getHours() === hour,
    );
  }

  function getAllDayItemsForDay(day: Date): CalendarItem[] {
    return allDayItems.filter((item) => isSameDay(item.startAt, day));
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header row with day names */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border flex-shrink-0">
        <div className="border-r border-border" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={cn(
              "px-2 py-1.5 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/50",
              isToday(day) && "bg-primary/5",
            )}
          >
            <div className="text-xs text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-lg font-semibold",
                isToday(day) ? "text-primary" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day section */}
      {allDayItems.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border flex-shrink-0">
          <div className="border-r border-border px-1 py-1 text-[10px] text-muted-foreground">
            all-day
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="border-r border-border last:border-r-0 p-0.5 space-y-0.5"
            >
              {getAllDayItemsForDay(day).map((item) => (
                <EventChip
                  key={item.id}
                  item={item}
                  compact
                  onClick={onSelectEvent}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Hourly grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-r border-b border-border px-1 py-1 text-[10px] text-muted-foreground text-right pr-2 h-12">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
              </div>
              {days.map((day) => {
                const hourItems = getTimedItemsForDayHour(day, hour);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "border-r border-b border-border last:border-r-0 p-0.5 h-12",
                      isToday(day) && "bg-primary/[0.02]",
                    )}
                  >
                    {hourItems.map((item) => (
                      <EventChip
                        key={item.id}
                        item={item}
                        onClick={onSelectEvent}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
