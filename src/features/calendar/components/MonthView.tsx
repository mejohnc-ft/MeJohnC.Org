import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import type { CalendarItem } from "../types";
import { DayCell } from "./DayCell";

interface MonthViewProps {
  currentDate: Date;
  items: CalendarItem[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (item: CalendarItem) => void;
}

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({
  currentDate,
  items,
  selectedDate,
  onSelectDate,
  onSelectEvent,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function getItemsForDay(day: Date): CalendarItem[] {
    return items.filter((item) => isSameDay(item.startAt, day));
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_HEADERS.map((header) => (
          <div
            key={header}
            className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center border-r border-border last:border-r-0"
          >
            {header}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto border-l border-t border-border">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            date={day}
            currentMonth={currentDate}
            items={getItemsForDay(day)}
            onSelectDate={onSelectDate}
            onSelectEvent={onSelectEvent}
            isSelected={isSameDay(day, selectedDate)}
          />
        ))}
      </div>
    </div>
  );
}
