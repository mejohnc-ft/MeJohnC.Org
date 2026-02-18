import { isSameMonth, isToday } from "date-fns";
import type { CalendarItem } from "../types";
import { EventChip } from "./EventChip";
import { cn } from "@/lib/utils";

interface DayCellProps {
  date: Date;
  currentMonth: Date;
  items: CalendarItem[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (item: CalendarItem) => void;
  isSelected: boolean;
}

const MAX_VISIBLE = 3;

export function DayCell({
  date,
  currentMonth,
  items,
  onSelectDate,
  onSelectEvent,
  isSelected,
}: DayCellProps) {
  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const overflow = items.length - MAX_VISIBLE;

  return (
    <div
      onClick={() => onSelectDate(date)}
      className={cn(
        "min-h-[100px] border-r border-b border-border p-1 cursor-pointer transition-colors",
        !inMonth && "bg-muted/30",
        isSelected && "bg-primary/5",
        "hover:bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={cn(
            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
            today && "bg-primary text-primary-foreground",
            !today && inMonth && "text-foreground",
            !today && !inMonth && "text-muted-foreground",
          )}
        >
          {date.getDate()}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.slice(0, MAX_VISIBLE).map((item) => (
          <EventChip
            key={item.id}
            item={item}
            compact
            onClick={onSelectEvent}
          />
        ))}
        {overflow > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectDate(date);
            }}
            className="text-xs text-muted-foreground hover:text-foreground pl-1"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}
