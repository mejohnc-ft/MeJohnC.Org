import type { CalendarEventSource } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface SourceConfig {
  label: string;
  dotClass: string;
}

const SOURCES: Record<CalendarEventSource, SourceConfig> = {
  event: { label: "Events", dotClass: "bg-sky-500" },
  task: { label: "Tasks", dotClass: "bg-green-500" },
  follow_up: { label: "Follow-ups", dotClass: "bg-blue-500" },
  blog: { label: "Blog Posts", dotClass: "bg-emerald-500" },
  campaign: { label: "Campaigns", dotClass: "bg-orange-500" },
  workflow: { label: "Workflows", dotClass: "bg-purple-500" },
};

interface SourceLegendProps {
  visibleSources: Set<CalendarEventSource>;
  onToggleSource: (source: CalendarEventSource) => void;
}

export function SourceLegend({
  visibleSources,
  onToggleSource,
}: SourceLegendProps) {
  return (
    <div className="p-3 space-y-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
        Sources
      </h3>
      {(Object.entries(SOURCES) as [CalendarEventSource, SourceConfig][]).map(
        ([source, config]) => {
          const active = visibleSources.has(source);
          return (
            <button
              key={source}
              onClick={() => onToggleSource(source)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1 rounded text-sm transition-colors",
                active
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground/50 hover:text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity",
                  config.dotClass,
                  !active && "opacity-30",
                )}
              />
              <span>{config.label}</span>
            </button>
          );
        },
      )}
    </div>
  );
}
