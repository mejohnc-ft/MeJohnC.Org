import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import { STORAGE_BUCKET, SUPABASE_ERROR_CODES } from './constants';
import {
  AppSuiteSchema,
  AppWithSuiteSchema,
  BlogPostSchema,
  ProjectSchema,
  WorkHistoryEntrySchema,
  NewsCategorySchema,
  NewsSourceSchema,
  NewsArticleSchema,
  NewsFilterSchema,
  NewsDashboardTabSchema,
  parseResponse,
  parseArrayResponse,
  type AppSuite,
  type App,
  type AppWithSuite,
  type BlogPost,
  type SiteContent,
  type Project,
  type ContactLink,
  type WorkHistoryEntry,
  type CaseStudy,
  type Timeline,
  type TimelineEntry,
  type NewsCategory,
  type NewsSource,
  type NewsArticle,
  type NewsFilter,
  type NewsDashboardTab,
  type TabConfig,
} from './schemas';

// Re-export types for consumers
export type {
  AppSuite,
  App,
  AppWithSuite,
  BlogPost,
  SiteContent,
  Project,
  ContactLink,
  WorkHistoryEntry,
  CaseStudy,
  Timeline,
  TimelineEntry,
  NewsCategory,
  NewsSource,
  NewsArticle,
  NewsFilter,
  NewsDashboardTab,
  TabConfig,
};

// Re-export enums
export type ContactIcon = 'email' | 'linkedin' | 'github' | 'twitter' | 'calendar';

// App Suites
export async function getAppSuites(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('app_suites')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return parseArrayResponse(AppSuiteSchema, data, 'getAppSuites');
}

export async function getAppSuiteBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('app_suites')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(AppSuiteSchema, data, 'getAppSuiteBySlug');
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
  return parseArrayResponse(AppWithSuiteSchema, data, 'getApps');
}

export async function getAppsBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('apps')
    .select('*, suite:app_suites(*)')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(AppWithSuiteSchema, data, 'getAppsBySlug');
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
  return parseArrayResponse(BlogPostSchema, data, 'getBlogPosts');
}

export async function getBlogPostBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(BlogPostSchema, data, 'getBlogPostBySlug');
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
  return parseArrayResponse(ProjectSchema, data, 'getProjects');
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

// ============================================
// NEWS CATEGORIES
// ============================================

export async function getNewsCategories(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_categories')
    .select('*')
    .order('order_index');

  return handleQueryResult(data, error, {
    operation: 'getNewsCategories',
    returnFallback: true,
    fallback: [] as NewsCategory[],
  });
}

export async function getNewsCategoryBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(NewsCategorySchema, data, 'getNewsCategoryBySlug');
}

export async function createNewsCategory(
  category: Omit<NewsCategory, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data as NewsCategory;
}

export async function updateNewsCategory(
  id: string,
  category: Partial<NewsCategory>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_categories')
    .update({ ...category, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsCategory;
}

export async function deleteNewsCategory(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderNewsCategories(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('news_categories')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// NEWS SOURCES
// ============================================

export async function getNewsSources(includeInactive = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('news_sources')
    .select('*')
    .order('order_index');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsSources',
    returnFallback: true,
    fallback: [] as NewsSource[],
  });
}

export async function getNewsSourceById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(NewsSourceSchema, data, 'getNewsSourceById');
}

export async function createNewsSource(
  source: Omit<NewsSource, 'id' | 'created_at' | 'updated_at' | 'last_fetched_at' | 'fetch_error'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_sources')
    .insert(source)
    .select()
    .single();

  if (error) throw error;
  return data as NewsSource;
}

export async function updateNewsSource(
  id: string,
  source: Partial<NewsSource>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_sources')
    .update({ ...source, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsSource;
}

export async function deleteNewsSource(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_sources')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderNewsSources(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('news_sources')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function updateNewsSourceFetchStatus(
  id: string,
  status: { last_fetched_at: string; fetch_error: string | null },
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('news_sources')
    .update({ ...status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// NEWS ARTICLES
// ============================================

export interface NewsArticleQueryOptions {
  sourceId?: string;
  categorySlug?: string;
  isRead?: boolean;
  isBookmarked?: boolean;
  isCurated?: boolean;
  isArchived?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getNewsArticles(
  options: NewsArticleQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('news_articles')
    .select('*, source:news_sources(*)')
    .order('published_at', { ascending: false, nullsFirst: false });

  // Apply filters
  if (options.sourceId) {
    query = query.eq('source_id', options.sourceId);
  }

  if (options.isRead !== undefined) {
    query = query.eq('is_read', options.isRead);
  }

  if (options.isBookmarked !== undefined) {
    query = query.eq('is_bookmarked', options.isBookmarked);
  }

  if (options.isCurated !== undefined) {
    query = query.eq('is_curated', options.isCurated);
  }

  if (options.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  } else {
    // By default, exclude archived articles
    query = query.eq('is_archived', false);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  // Pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsArticles',
    returnFallback: true,
    fallback: [] as (NewsArticle & { source: NewsSource | null })[],
  });
}

export async function getNewsArticleById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_articles')
    .select('*, source:news_sources(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as NewsArticle & { source: NewsSource | null };
}

export async function getCuratedArticles(limit = 20, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_articles')
    .select('*, source:news_sources(*)')
    .eq('is_curated', true)
    .eq('is_archived', false)
    .order('curated_order', { ascending: true, nullsFirst: false })
    .order('curated_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getCuratedArticles',
    returnFallback: true,
    fallback: [] as (NewsArticle & { source: NewsSource | null })[],
  });
}

export async function createNewsArticle(
  article: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_articles')
    .insert(article)
    .select()
    .single();

  if (error) throw error;
  return data as NewsArticle;
}

export async function upsertNewsArticle(
  article: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  // Upsert by source_id + external_id
  const { data, error } = await client
    .from('news_articles')
    .upsert(article, { onConflict: 'source_id,external_id', ignoreDuplicates: true })
    .select()
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows returned" on duplicate
  return data as NewsArticle | null;
}

export async function updateNewsArticle(
  id: string,
  article: Partial<NewsArticle>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_articles')
    .update({ ...article, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsArticle;
}

export async function markArticleRead(id: string, client: SupabaseClient = supabase) {
  return updateNewsArticle(id, { is_read: true }, client);
}

export async function markArticlesRead(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;
}

export async function toggleArticleBookmark(id: string, isBookmarked: boolean, client: SupabaseClient = supabase) {
  return updateNewsArticle(id, { is_bookmarked: isBookmarked }, client);
}

export async function curateArticle(
  id: string,
  curated: boolean,
  summary?: string,
  client: SupabaseClient = supabase
) {
  const update: Partial<NewsArticle> = {
    is_curated: curated,
    curated_at: curated ? new Date().toISOString() : null,
    curated_summary: summary ?? null,
  };

  return updateNewsArticle(id, update, client);
}

export async function archiveArticles(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;
}

export async function deleteNewsArticle(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function bulkDeleteNewsArticles(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

// ============================================
// NEWS FILTERS
// ============================================

export async function getNewsFilters(activeOnly = true, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('news_filters')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsFilters',
    returnFallback: true,
    fallback: [] as NewsFilter[],
  });
}

export async function createNewsFilter(
  filter: Omit<NewsFilter, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_filters')
    .insert(filter)
    .select()
    .single();

  if (error) throw error;
  return data as NewsFilter;
}

export async function updateNewsFilter(
  id: string,
  filter: Partial<NewsFilter>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_filters')
    .update({ ...filter, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsFilter;
}

export async function deleteNewsFilter(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_filters')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// NEWS DASHBOARD TABS
// ============================================

export async function getNewsDashboardTabs(activeOnly = true, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('news_dashboard_tabs')
    .select('*')
    .order('order_index');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsDashboardTabs',
    returnFallback: true,
    fallback: [] as NewsDashboardTab[],
  });
}

export async function getNewsDashboardTabById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_dashboard_tabs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(NewsDashboardTabSchema, data, 'getNewsDashboardTabById');
}

export async function createNewsDashboardTab(
  tab: Omit<NewsDashboardTab, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_dashboard_tabs')
    .insert(tab)
    .select()
    .single();

  if (error) throw error;
  return data as NewsDashboardTab;
}

export async function updateNewsDashboardTab(
  id: string,
  tab: Partial<NewsDashboardTab>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_dashboard_tabs')
    .update({ ...tab, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsDashboardTab;
}

export async function deleteNewsDashboardTab(id: string, client: SupabaseClient = supabase) {
  // First check if it's pinned
  const tab = await getNewsDashboardTabById(id, client);
  if (tab.is_pinned) {
    throw new Error('Cannot delete a pinned tab');
  }

  const { error } = await client
    .from('news_dashboard_tabs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderNewsDashboardTabs(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('news_dashboard_tabs')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// NEWS STATS
// ============================================

export async function getNewsStats(client: SupabaseClient = getSupabase()) {
  // Run multiple count queries in parallel
  const [
    totalResult,
    unreadResult,
    bookmarkedResult,
    curatedResult,
    sourcesResult,
    activeSourcesResult,
    lastFetchResult,
  ] = await Promise.all([
    client.from('news_articles').select('id', { count: 'exact', head: true }),
    client.from('news_articles').select('id', { count: 'exact', head: true }).eq('is_read', false).eq('is_archived', false),
    client.from('news_articles').select('id', { count: 'exact', head: true }).eq('is_bookmarked', true),
    client.from('news_articles').select('id', { count: 'exact', head: true }).eq('is_curated', true),
    client.from('news_sources').select('id', { count: 'exact', head: true }),
    client.from('news_sources').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('news_sources').select('last_fetched_at').order('last_fetched_at', { ascending: false }).limit(1).single(),
  ]);

  return {
    total_articles: totalResult.count ?? 0,
    unread_count: unreadResult.count ?? 0,
    bookmarked_count: bookmarkedResult.count ?? 0,
    curated_count: curatedResult.count ?? 0,
    sources_count: sourcesResult.count ?? 0,
    active_sources_count: activeSourcesResult.count ?? 0,
    last_fetch: lastFetchResult.data?.last_fetched_at ?? null,
  };
}
