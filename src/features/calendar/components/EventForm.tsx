import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEvent, CalendarEventColor } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface EventFormProps {
  initialData?: Partial<CalendarEvent>;
  defaultDate?: Date;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface EventFormData {
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  color: CalendarEventColor;
  location: string;
}

const COLORS: {
  value: CalendarEventColor;
  label: string;
  className: string;
}[] = [
  { value: "sky", label: "Sky", className: "bg-sky-500" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "indigo", label: "Indigo", className: "bg-indigo-500" },
  { value: "violet", label: "Violet", className: "bg-violet-500" },
  { value: "purple", label: "Purple", className: "bg-purple-500" },
  { value: "pink", label: "Pink", className: "bg-pink-500" },
  { value: "rose", label: "Rose", className: "bg-rose-500" },
  { value: "red", label: "Red", className: "bg-red-500" },
  { value: "orange", label: "Orange", className: "bg-orange-500" },
  { value: "amber", label: "Amber", className: "bg-amber-500" },
  { value: "yellow", label: "Yellow", className: "bg-yellow-500" },
  { value: "lime", label: "Lime", className: "bg-lime-500" },
  { value: "green", label: "Green", className: "bg-green-500" },
  { value: "emerald", label: "Emerald", className: "bg-emerald-500" },
  { value: "teal", label: "Teal", className: "bg-teal-500" },
  { value: "cyan", label: "Cyan", className: "bg-cyan-500" },
];

function toLocalDatetimeString(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function getDateInputValue(value: string, allDay: boolean): string {
  if (!allDay) return value;
  return value.includes("T") ? value.split("T")[0] : value;
}

function buildStartIso(value: string, allDay: boolean): string {
  if (allDay) return new Date(value + "T00:00:00").toISOString();
  return new Date(value).toISOString();
}

function buildEndIso(value: string, allDay: boolean): string {
  if (!value) return "";
  if (allDay) return new Date(value + "T23:59:59").toISOString();
  return new Date(value).toISOString();
}

export function EventForm({
  initialData,
  defaultDate,
  onSubmit,
  onCancel,
  isLoading,
}: EventFormProps) {
  const now = defaultDate ?? new Date();
  const isEditing = !!initialData?.id;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [startAt, setStartAt] = useState(
    initialData?.start_at
      ? toLocalDatetimeString(new Date(initialData.start_at))
      : toLocalDatetimeString(now),
  );
  const [endAt, setEndAt] = useState(
    initialData?.end_at
      ? toLocalDatetimeString(new Date(initialData.end_at))
      : "",
  );
  const [isAllDay, setIsAllDay] = useState(initialData?.is_all_day ?? false);
  const [color, setColor] = useState<CalendarEventColor>(
    initialData?.color ?? "sky",
  );
  const [location, setLocation] = useState(initialData?.location ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      start_at: buildStartIso(startAt, isAllDay),
      end_at: buildEndIso(endAt, isAllDay),
      is_all_day: isAllDay,
      color,
      location: location.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Event" : "New Event"}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
              autoFocus
            />
          </div>

          {/* All day toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">All day</span>
          </label>

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Start
              </label>
              <Input
                type={isAllDay ? "date" : "datetime-local"}
                value={getDateInputValue(startAt, isAllDay)}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                End
              </label>
              <Input
                type={isAllDay ? "date" : "datetime-local"}
                value={getDateInputValue(endAt, isAllDay)}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Location
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional location"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all",
                    c.className,
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                      : "opacity-60 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading
                ? "Saving..."
                : isEditing
                  ? "Update Event"
                  : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
