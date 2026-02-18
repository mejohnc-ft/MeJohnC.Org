import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  LayoutList,
  Columns,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarView } from "../types";
import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onNewEvent: () => void;
}

const VIEW_OPTIONS: {
  value: CalendarView;
  label: string;
  icon: typeof CalendarIcon;
}[] = [
  { value: "month", label: "Month", icon: LayoutGrid },
  { value: "week", label: "Week", icon: Columns },
  { value: "day", label: "Day", icon: CalendarIcon },
  { value: "agenda", label: "Agenda", icon: LayoutList },
];

export function CalendarHeader({
  currentDate,
  viewMode,
  onDateChange,
  onViewChange,
  onNewEvent,
}: CalendarHeaderProps) {
  function navigateBack() {
    switch (viewMode) {
      case "month":
        onDateChange(subMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(subWeeks(currentDate, 1));
        break;
      case "day":
      case "agenda":
        onDateChange(subDays(currentDate, 1));
        break;
    }
  }

  function navigateForward() {
    switch (viewMode) {
      case "month":
        onDateChange(addMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(addWeeks(currentDate, 1));
        break;
      case "day":
      case "agenda":
        onDateChange(addDays(currentDate, 1));
        break;
    }
  }

  function getTitle(): string {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "week":
        return format(currentDate, "MMMM yyyy");
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "agenda":
        return format(currentDate, "MMMM d, yyyy");
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
      {/* Left: nav controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </Button>
        <button
          onClick={navigateBack}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={navigateForward}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold text-foreground ml-2">
          {getTitle()}
        </h2>
      </div>

      {/* Right: view toggle + new event */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => onViewChange(opt.value)}
                title={opt.label}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1",
                  viewMode === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <Button size="sm" onClick={onNewEvent} className="gap-1.5">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Event</span>
        </Button>
      </div>
    </div>
  );
}
