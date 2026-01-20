import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import { SUPABASE_ERROR_CODES } from './constants';
import {
  WorkHistoryEntrySchema,
  parseArrayResponse,
  type SiteContent,
  type ContactLink,
  type WorkHistoryEntry,
  type CaseStudy,
  type Timeline,
  type TimelineEntry,
} from './schemas';

// Re-export types for consumers
export type {
  SiteContent,
  ContactLink,
  WorkHistoryEntry,
  CaseStudy,
  Timeline,
  TimelineEntry,
};

// Re-export enums
export type ContactIcon = 'email' | 'linkedin' | 'github' | 'twitter' | 'calendar';

export type TimelineChartType = 'growth' | 'linear' | 'decline';

export interface TimelineWithEntries extends Timeline {
  entries: TimelineEntry[];
}

// ============================================
// SITE CONTENT
// ============================================

export async function getSiteContent(key: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('site_content')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== SUPABASE_ERROR_CODES.NOT_FOUND) throw error;
  return data as SiteContent | null;
}

export async function upsertSiteContent(
  key: string,
  content: { title: string; content: string },
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('site_content')
    .upsert({ key, ...content, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();

  if (error) throw error;
  return data as SiteContent;
}

// ============================================
// CONTACT LINKS
// ============================================

export async function getContactLinks(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('contact_links')
    .select('*')
    .order('order_index');

  return handleQueryResult(data, error, {
    operation: 'getContactLinks',
    returnFallback: true,
    fallback: [] as ContactLink[],
  });
}

export async function getContactLinkById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('contact_links')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ContactLink;
}

export async function createContactLink(
  link: Omit<ContactLink, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('contact_links')
    .insert(link)
    .select()
    .single();

  if (error) throw error;
  return data as ContactLink;
}

export async function updateContactLink(
  id: string,
  link: Partial<ContactLink>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('contact_links')
    .update({ ...link, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ContactLink;
}

export async function deleteContactLink(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('contact_links')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderContactLinks(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  // Update each item's order_index based on position in array
  const updates = orderedIds.map((id, index) =>
    client
      .from('contact_links')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// WORK HISTORY
// ============================================

export async function getWorkHistory(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('work_history')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return parseArrayResponse(WorkHistoryEntrySchema, data, 'getWorkHistory');
}

export async function getWorkHistoryById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('work_history')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as WorkHistoryEntry;
}

export async function createWorkHistoryEntry(
  entry: Omit<WorkHistoryEntry, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('work_history')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data as WorkHistoryEntry;
}

export async function updateWorkHistoryEntry(
  id: string,
  entry: Partial<WorkHistoryEntry>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('work_history')
    .update({ ...entry, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as WorkHistoryEntry;
}

export async function deleteWorkHistoryEntry(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('work_history')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderWorkHistory(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('work_history')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// CASE STUDIES
// ============================================

export async function getCaseStudies(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('case_studies')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return data as CaseStudy[];
}

export async function getCaseStudyById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('case_studies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CaseStudy;
}

export async function createCaseStudy(
  study: Omit<CaseStudy, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('case_studies')
    .insert(study)
    .select()
    .single();

  if (error) throw error;
  return data as CaseStudy;
}

export async function updateCaseStudy(
  id: string,
  study: Partial<CaseStudy>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('case_studies')
    .update({ ...study, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CaseStudy;
}

export async function deleteCaseStudy(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('case_studies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderCaseStudies(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('case_studies')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// TIMELINES
// ============================================

export async function getTimelines(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('timelines')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  return handleQueryResult(data, error, {
    operation: 'getTimelines',
    returnFallback: true,
    fallback: [] as Timeline[],
  });
}

export async function getTimelineBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('timelines')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as Timeline;
}

export async function getTimelineWithEntries(slug: string, client: SupabaseClient = getSupabase()): Promise<TimelineWithEntries | null> {
  const { data: timeline, error: timelineError } = await client
    .from('timelines')
    .select('*')
    .eq('slug', slug)
    .single();

  const timelineResult = handleQueryResult(timeline, timelineError, {
    operation: 'getTimelineWithEntries.timeline',
    returnFallback: true,
    fallback: null,
  });

  if (!timelineResult) return null;

  const { data: entries, error: entriesError } = await client
    .from('timeline_entries')
    .select('*')
    .eq('timeline_id', timelineResult.id)
    .order('order_index');

  const entriesResult = handleQueryResult(entries, entriesError, {
    operation: 'getTimelineWithEntries.entries',
    returnFallback: true,
    fallback: [] as TimelineEntry[],
  });

  return {
    ...timelineResult,
    entries: entriesResult,
  } as TimelineWithEntries;
}

export async function getTimelineById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('timelines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Timeline;
}

export async function createTimeline(
  timeline: Omit<Timeline, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('timelines')
    .insert(timeline)
    .select()
    .single();

  if (error) throw error;
  return data as Timeline;
}

export async function updateTimeline(
  id: string,
  timeline: Partial<Timeline>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('timelines')
    .update({ ...timeline, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Timeline;
}

export async function deleteTimeline(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('timelines')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// TIMELINE ENTRIES
// ============================================

export async function getTimelineEntries(timelineId: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('timeline_entries')
    .select('*')
    .eq('timeline_id', timelineId)
    .order('order_index');

  return handleQueryResult(data, error, {
    operation: 'getTimelineEntries',
    returnFallback: true,
    fallback: [] as TimelineEntry[],
  });
}

export async function getTimelineEntryById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('timeline_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as TimelineEntry;
}

export async function createTimelineEntry(
  entry: Omit<TimelineEntry, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('timeline_entries')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data as TimelineEntry;
}

export async function updateTimelineEntry(
  id: string,
  entry: Partial<TimelineEntry>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('timeline_entries')
    .update({ ...entry, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as TimelineEntry;
}

export async function deleteTimelineEntry(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('timeline_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderTimelineEntries(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('timeline_entries')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}
