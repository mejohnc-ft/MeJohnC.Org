import { format } from "date-fns";
import { X, Clock, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarItem } from "../types";
import { getEventColorClasses } from "./EventChip";
import { cn } from "@/lib/utils";

interface EventDetailPanelProps {
  item: CalendarItem;
  onClose: () => void;
  onEdit: (item: CalendarItem) => void;
  onDelete: (item: CalendarItem) => void;
  onNavigate: (path: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  event: "Calendar Event",
  task: "Task",
  follow_up: "CRM Follow-up",
  blog: "Blog Post",
  campaign: "Email Campaign",
  workflow: "Workflow Run",
};

export function EventDetailPanel({
  item,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
}: EventDetailPanelProps) {
  const colorClasses = getEventColorClasses(item);

  return (
    <div className="h-full flex flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {SOURCE_LABELS[item.source] ?? "Event"}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Color bar + title */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-1 h-6 rounded-full flex-shrink-0 mt-0.5",
              colorClasses.split(" ")[0]?.replace("/20", ""),
            )}
          />
          <h2 className="text-lg font-semibold text-foreground leading-tight">
            {item.title}
          </h2>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            {item.isAllDay
              ? format(item.startAt, "EEEE, MMMM d, yyyy")
              : `${format(item.startAt, "EEE, MMM d, yyyy h:mm a")}${item.endAt ? ` - ${format(item.endAt, "h:mm a")}` : ""}`}
          </span>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        )}

        {/* Source link */}
        {item.sourceRoute && (
          <button
            onClick={() => onNavigate(item.sourceRoute!)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View in {SOURCE_LABELS[item.source]}</span>
          </button>
        )}

        {/* Source badge */}
        <div className="pt-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
              colorClasses,
            )}
          >
            {SOURCE_LABELS[item.source]}
          </span>
        </div>
      </div>

      {/* Actions (only for native events) */}
      {item.editable && (
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
            className="flex-1 gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(item)}
            className="gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
