import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import { STORAGE_BUCKET, SUPABASE_ERROR_CODES } from './constants';

// Types
export interface AppSuite {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface App {
  id: string;
  suite_id: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  external_url: string | null;
  demo_url: string | null;
  tech_stack: string[] | null;
  status: 'planned' | 'in_development' | 'available' | 'archived';
  order_index: number;
  // SEO fields
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
  suite?: AppSuite;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  tags: string[] | null;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  scheduled_for: string | null;
  reading_time: number | null;
  // SEO fields
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteContent {
  id: string;
  key: string; // 'about', 'projects', etc.
  title: string;
  content: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  external_url: string | null;
  tech_stack: string[] | null;
  status: 'draft' | 'published' | 'scheduled';
  scheduled_for: string | null;
  order_index: number;
  // SEO fields
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
}

// Profile-related types
export type ContactIcon = 'email' | 'linkedin' | 'github' | 'twitter' | 'calendar';

export interface ContactLink {
  id: string;
  label: string;
  href: string;
  value: string | null;
  description: string | null;
  icon: ContactIcon;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface WorkHistoryEntry {
  id: string;
  title: string;
  company: string;
  period: string;
  highlights: string[];
  tech: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CaseStudy {
  id: string;
  metric: string;
  title: string;
  before_content: string;
  after_content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// App Suites
export async function getAppSuites(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('app_suites')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return data as AppSuite[];
}

export async function getAppSuiteBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('app_suites')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function createAppSuite(
  suite: Omit<AppSuite, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('app_suites')
    .insert(suite)
    .select()
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function updateAppSuite(
  id: string,
  suite: Partial<AppSuite>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('app_suites')
    .update(suite)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function deleteAppSuite(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('app_suites')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Apps
export async function getApps(includeUnpublished = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('apps')
    .select('*, suite:app_suites(*)')
    .order('order_index');

  if (!includeUnpublished) {
    // Show available, in_development, and planned apps (not archived)
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as (App & { suite: AppSuite | null })[];
}

export async function getAppsBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('apps')
    .select('*, suite:app_suites(*)')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as App & { suite: AppSuite | null };
}

export async function getAppsBySuiteSlug(suiteSlug: string, client: SupabaseClient = getSupabase()) {
  const suite = await getAppSuiteBySlug(suiteSlug, client);

  const { data, error } = await client
    .from('apps')
    .select('*')
    .eq('suite_id', suite.id)
    .neq('status', 'archived')
    .order('order_index');

  if (error) throw error;
  return { suite, apps: data as App[] };
}

export async function getAppById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('apps')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as App;
}

export async function createApp(
  app: Omit<App, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('apps')
    .insert(app)
    .select()
    .single();

  if (error) throw error;
  return data as App;
}

export async function updateApp(
  id: string,
  app: Partial<App>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('apps')
    .update(app)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as App;
}

export async function deleteApp(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('apps')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Blog Posts
export async function getBlogPosts(includeUnpublished = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (!includeUnpublished) {
    // Show published posts and scheduled posts whose time has passed
    const now = new Date().toISOString();
    query = query.or(`status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as BlogPost[];
}

export async function getBlogPostBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function getBlogPostById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function createBlogPost(
  post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('blog_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function updateBlogPost(
  id: string,
  post: Partial<BlogPost>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('blog_posts')
    .update(post)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function deleteBlogPost(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Site Content (About, Projects intro, etc.)
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

// Projects
export async function getProjects(includeUnpublished = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('projects')
    .select('*')
    .order('order_index');

  if (!includeUnpublished) {
    // Show published projects and scheduled projects whose time has passed
    const now = new Date().toISOString();
    query = query.or(`status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Project[];
}

export async function getProjectBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as Project;
}

export async function getProjectById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Project;
}

export async function createProject(
  project: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  id: string,
  project: Partial<Project>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('projects')
    .update(project)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Re-export from markdown.ts to avoid duplication
export { calculateReadingTime } from './markdown';

// Helper: Generate slug from text
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Storage helpers
export async function uploadFile(file: File, path: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = client.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteFile(path: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) throw error;
}

// Bulk Operations

// Blog Posts
export async function bulkDeleteBlogPosts(ids: string[], client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('blog_posts')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUpdateBlogPostStatus(
  ids: string[],
  status: BlogPost['status'],
  client: SupabaseClient = supabase
) {
  const updateData: Partial<BlogPost> = { status };

  // If publishing, set published_at if not already set
  if (status === 'published') {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await client
    .from('blog_posts')
    .update(updateData)
    .in('id', ids);

  if (error) throw error;
}

// Apps
export async function bulkDeleteApps(ids: string[], client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('apps')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUpdateAppStatus(
  ids: string[],
  status: App['status'],
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('apps')
    .update({ status })
    .in('id', ids);

  if (error) throw error;
}

// Projects
export async function bulkDeleteProjects(ids: string[], client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('projects')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUpdateProjectStatus(
  ids: string[],
  status: Project['status'],
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('projects')
    .update({ status })
    .in('id', ids);

  if (error) throw error;
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
  return data as WorkHistoryEntry[];
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

export type TimelineChartType = 'growth' | 'linear' | 'decline';

export interface Timeline {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  chart_type: TimelineChartType;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  id: string;
  timeline_id: string;
  label: string;
  phase: string;
  summary: string | null;
  content: string | null;
  dot_position: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineWithEntries extends Timeline {
  entries: TimelineEntry[];
}

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
