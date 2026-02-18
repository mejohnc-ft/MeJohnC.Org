import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
} from "date-fns";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import {
  getAllCalendarItems,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/calendar-queries";
import type { CalendarEventSource, CalendarEventColor } from "@/lib/schemas";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import AdminLayout from "@/components/AdminLayout";
import type { CalendarItem, CalendarView } from "../types";
import { CalendarHeader } from "../components/CalendarHeader";
import { MiniCalendar } from "../components/MiniCalendar";
import { SourceLegend } from "../components/SourceLegend";
import { MonthView } from "../components/MonthView";
import { WeekView } from "../components/WeekView";
import { DayView } from "../components/DayView";
import { AgendaView } from "../components/AgendaView";
import { EventDetailPanel } from "../components/EventDetailPanel";
import { EventForm, type EventFormData } from "../components/EventForm";

const ALL_SOURCES: CalendarEventSource[] = [
  "event",
  "task",
  "follow_up",
  "blog",
  "campaign",
  "workflow",
];

const CalendarPage = () => {
  useSEO({ title: "Calendar", noIndex: true });
  const navigate = useNavigate();
  const { supabase } = useAuthenticatedSupabase();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>("month");
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleSources, setVisibleSources] = useState<
    Set<CalendarEventSource>
  >(new Set(ALL_SOURCES));

  // Compute date range: full month + overflow weeks for month view
  function getDateRange(): { startDate: string; endDate: string } {
    const start = startOfWeek(startOfMonth(addMonths(currentDate, -1)));
    const end = endOfWeek(endOfMonth(addMonths(currentDate, 1)));
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const items = await getAllCalendarItems(startDate, endDate, supabase);
      setCalendarItems(items);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "CalendarPage.fetchData" },
      );
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter items by visible sources
  const filteredItems = calendarItems.filter((item) =>
    visibleSources.has(item.source),
  );

  function handleToggleSource(source: CalendarEventSource) {
    setVisibleSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    if (viewMode === "month") {
      setViewMode("day");
      setCurrentDate(date);
    }
  }

  function handleSelectEvent(item: CalendarItem) {
    setSelectedEvent(item);
  }

  function handleNewEvent() {
    setEditingEvent(null);
    setShowEventForm(true);
  }

  function handleEditEvent(item: CalendarItem) {
    setEditingEvent(item);
    setShowEventForm(true);
    setSelectedEvent(null);
  }

  async function handleDeleteEvent(item: CalendarItem) {
    if (!supabase || !item.editable) return;
    try {
      await deleteCalendarEvent(item.sourceId, supabase);
      setSelectedEvent(null);
      await fetchData();
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "CalendarPage.handleDeleteEvent" },
      );
    }
  }

  async function handleSubmitEvent(data: EventFormData) {
    if (!supabase) return;
    setIsSubmitting(true);
    try {
      if (editingEvent) {
        await updateCalendarEvent(
          editingEvent.sourceId,
          {
            title: data.title,
            description: data.description || null,
            start_at: data.start_at,
            end_at: data.end_at || null,
            is_all_day: data.is_all_day,
            color: data.color,
            location: data.location || null,
          },
          supabase,
        );
      } else {
        await createCalendarEvent(
          {
            tenant_id: "00000000-0000-0000-0000-000000000001",
            title: data.title,
            description: data.description || null,
            start_at: data.start_at,
            end_at: data.end_at || null,
            is_all_day: data.is_all_day,
            color: data.color,
            location: data.location || null,
            tags: [],
            metadata: {},
            created_by: "admin",
          },
          supabase,
        );
      }
      setShowEventForm(false);
      setEditingEvent(null);
      await fetchData();
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "CalendarPage.handleSubmitEvent" },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderView() {
    switch (viewMode) {
      case "month":
        return (
          <MonthView
            currentDate={currentDate}
            items={filteredItems}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onSelectEvent={handleSelectEvent}
          />
        );
      case "week":
        return (
          <WeekView
            currentDate={currentDate}
            items={filteredItems}
            onSelectDate={handleSelectDate}
            onSelectEvent={handleSelectEvent}
          />
        );
      case "day":
        return (
          <DayView
            currentDate={currentDate}
            items={filteredItems}
            onSelectEvent={handleSelectEvent}
          />
        );
      case "agenda":
        return (
          <AgendaView items={filteredItems} onSelectEvent={handleSelectEvent} />
        );
    }
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          onDateChange={setCurrentDate}
          onViewChange={setViewMode}
          onNewEvent={handleNewEvent}
        />

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar */}
          <div className="w-56 flex-shrink-0 border-r border-border overflow-auto hidden lg:block">
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setCurrentDate(date);
              }}
            />
            <div className="border-t border-border" />
            <SourceLegend
              visibleSources={visibleSources}
              onToggleSource={handleToggleSource}
            />
          </div>

          {/* Main calendar area */}
          <div className="flex-1 flex flex-col min-w-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-muted-foreground flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading calendar...
                </div>
              </div>
            ) : (
              renderView()
            )}
          </div>

          {/* Right detail panel */}
          {selectedEvent && (
            <div className="w-72 flex-shrink-0 hidden md:block">
              <EventDetailPanel
                item={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onNavigate={(path) => navigate(path)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Event form modal */}
      {showEventForm && (
        <EventForm
          initialData={
            editingEvent
              ? {
                  id: editingEvent.sourceId,
                  title: editingEvent.title,
                  description: editingEvent.description,
                  start_at: editingEvent.startAt.toISOString(),
                  end_at: editingEvent.endAt?.toISOString() ?? undefined,
                  is_all_day: editingEvent.isAllDay,
                  color: editingEvent.color as CalendarEventColor,
                }
              : undefined
          }
          defaultDate={selectedDate}
          onSubmit={handleSubmitEvent}
          onCancel={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
          isLoading={isSubmitting}
        />
      )}
    </AdminLayout>
  );
};

export default CalendarPage;
