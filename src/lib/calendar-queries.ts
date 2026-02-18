import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, supabase } from "./supabase";
import { handleQueryResult } from "./errors";
import {
  CalendarEventSchema,
  parseResponse,
  type CalendarEvent,
} from "./schemas";
import type { CalendarItem } from "@/features/calendar/types";
import { parseISO } from "date-fns";

// ============================================
// NATIVE CALENDAR EVENTS - CRUD
// ============================================

export async function getCalendarEvents(
  startDate: string,
  endDate: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("calendar_events")
    .select("*")
    .or(`start_at.gte.${startDate},end_at.gte.${startDate}`)
    .lte("start_at", endDate)
    .order("start_at");

  return handleQueryResult(data, error, {
    operation: "getCalendarEvents",
    returnFallback: true,
    fallback: [] as CalendarEvent[],
  });
}

export async function getCalendarEventById(
  id: string,
  client: SupabaseClient = getSupabase(),
) {
  const { data, error } = await client
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return parseResponse(CalendarEventSchema, data, "getCalendarEventById");
}

export async function createCalendarEvent(
  event: Omit<CalendarEvent, "id" | "created_at" | "updated_at">,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("calendar_events")
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(CalendarEventSchema, data, "createCalendarEvent");
}

export async function updateCalendarEvent(
  id: string,
  event: Partial<CalendarEvent>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("calendar_events")
    .update({ ...event, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(CalendarEventSchema, data, "updateCalendarEvent");
}

export async function deleteCalendarEvent(
  id: string,
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// AGGREGATION QUERIES (read-only from other sources)
// ============================================

export async function getCalendarTaskEvents(
  startDate: string,
  endDate: string,
  client: SupabaseClient = getSupabase(),
): Promise<CalendarItem[]> {
  const { data, error } = await client
    .from("tasks")
    .select("id, title, description, due_date, status")
    .not("due_date", "is", null)
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .not("status", "eq", "cancelled");

  if (error || !data) return [];

  return data.map((task) => ({
    id: `task-${task.id}`,
    title: task.title,
    description: task.description,
    startAt: parseISO(task.due_date),
    endAt: null,
    isAllDay: true,
    color: "green",
    source: "task" as const,
    sourceId: task.id,
    sourceRoute: `/admin/tasks/${task.id}`,
    editable: false,
  }));
}

export async function getCalendarFollowUpEvents(
  startDate: string,
  endDate: string,
  client: SupabaseClient = getSupabase(),
): Promise<CalendarItem[]> {
  const { data, error } = await client
    .from("follow_ups")
    .select("id, title, description, due_at, status, contact_id")
    .gte("due_at", startDate)
    .lte("due_at", endDate)
    .eq("status", "pending");

  if (error || !data) return [];

  return data.map((fu) => ({
    id: `followup-${fu.id}`,
    title: fu.title,
    description: fu.description,
    startAt: parseISO(fu.due_at),
    endAt: null,
    isAllDay: false,
    color: "blue",
    source: "follow_up" as const,
    sourceId: fu.id,
    sourceRoute: `/admin/crm/${fu.contact_id}`,
    editable: false,
  }));
}

export async function getCalendarBlogEvents(
  startDate: string,
  endDate: string,
  client: SupabaseClient = getSupabase(),
): Promise<CalendarItem[]> {
  const { data, error } = await client
    .from("blog_posts")
    .select("id, title, scheduled_for")
    .eq("status", "scheduled")
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", startDate)
    .lte("scheduled_for", endDate);

  if (error || !data) return [];

  return data.map((post) => ({
    id: `blog-${post.id}`,
    title: `Blog: ${post.title}`,
    description: null,
    startAt: parseISO(post.scheduled_for!),
    endAt: null,
    isAllDay: false,
    color: "emerald",
    source: "blog" as const,
    sourceId: post.id,
    sourceRoute: `/admin/blog/${post.id}`,
    editable: false,
  }));
}

export async function getCalendarCampaignEvents(
  startDate: string,
  endDate: string,
  client: SupabaseClient = getSupabase(),
): Promise<CalendarItem[]> {
  const { data, error } = await client
    .from("email_campaigns")
    .select("id, name, scheduled_for")
    .eq("status", "scheduled")
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", startDate)
    .lte("scheduled_for", endDate);

  if (error || !data) return [];

  return data.map((campaign) => ({
    id: `campaign-${campaign.id}`,
    title: `Campaign: ${campaign.name}`,
    description: null,
    startAt: parseISO(campaign.scheduled_for!),
    endAt: null,
    isAllDay: false,
    color: "orange",
    source: "campaign" as const,
    sourceId: campaign.id,
    sourceRoute: "/admin/marketing",
    editable: false,
  }));
}

export async function getCalendarWorkflowEvents(
  startDate: string,
  endDate: string,
  client: SupabaseClient = getSupabase(),
): Promise<CalendarItem[]> {
  const { data, error } = await client
    .from("scheduled_workflow_runs")
    .select("id, workflow_id, scheduled_at, status")
    .gte("scheduled_at", startDate)
    .lte("scheduled_at", endDate)
    .eq("status", "pending");

  if (error || !data) return [];

  return data.map((run) => ({
    id: `workflow-${run.id}`,
    title: `Workflow Run`,
    description: null,
    startAt: parseISO(run.scheduled_at),
    endAt: null,
    isAllDay: false,
    color: "purple",
    source: "workflow" as const,
    sourceId: run.id,
    sourceRoute: `/admin/workflows`,
    editable: false,
  }));
}

// ============================================
// UNIFIED QUERY
// ============================================

export async function getAllCalendarItems(
  startDate: string,
  endDate: string,
  client: SupabaseClient = getSupabase(),
): Promise<CalendarItem[]> {
  const nativeEvents = getCalendarEvents(startDate, endDate, client);

  const [native, tasks, followUps, blogs, campaigns, workflows] =
    await Promise.all([
      nativeEvents.then((events) =>
        events.map(
          (e): CalendarItem => ({
            id: e.id,
            title: e.title,
            description: e.description,
            startAt: parseISO(e.start_at),
            endAt: e.end_at ? parseISO(e.end_at) : null,
            isAllDay: e.is_all_day,
            color: e.color,
            source: "event",
            sourceId: e.id,
            editable: true,
          }),
        ),
      ),
      getCalendarTaskEvents(startDate, endDate, client),
      getCalendarFollowUpEvents(startDate, endDate, client),
      getCalendarBlogEvents(startDate, endDate, client),
      getCalendarCampaignEvents(startDate, endDate, client),
      getCalendarWorkflowEvents(startDate, endDate, client),
    ]);

  const all = [
    ...native,
    ...tasks,
    ...followUps,
    ...blogs,
    ...campaigns,
    ...workflows,
  ];

  all.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return all;
}
