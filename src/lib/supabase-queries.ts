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
  NewsDashboardTabSchema,
  AgentCommandSchema,
  AgentResponseSchema,
  AgentTaskSchema,
  AgentTaskRunSchema,
  AgentSessionSchema,
  AgentConfigSchema,
  AgentConfirmationSchema,
  BookmarkSchema,
  BookmarkCollectionSchema,
  BookmarkCollectionItemSchema,
  BookmarkImportJobSchema,
  BookmarkCategorySchema,
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
  type AgentCommand,
  type AgentResponse,
  type AgentTask,
  type AgentTaskRun,
  type AgentSession,
  type AgentConfig,
  type AgentConfirmation,
  type Bookmark,
  type BookmarkCollection,
  type BookmarkCollectionItem,
  type BookmarkImportJob,
  type BookmarkCategory,
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
  AgentCommand,
  AgentResponse,
  AgentTask,
  AgentTaskRun,
  AgentSession,
  AgentConfig,
  AgentConfirmation,
  Bookmark,
  BookmarkCollection,
  BookmarkCollectionItem,
  BookmarkImportJob,
  BookmarkCategory,
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

// ============================================
// AGENT COMMANDS
// ============================================

export async function getAgentCommands(
  sessionId?: string,
  status?: AgentCommand['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_commands')
    .select('*')
    .order('created_at', { ascending: false });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentCommands',
    returnFallback: true,
    fallback: [] as AgentCommand[],
  });
}

export async function getAgentCommandById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_commands')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(AgentCommandSchema, data, 'getAgentCommandById');
}

export async function getPendingAgentCommands(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_commands')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getPendingAgentCommands',
    returnFallback: true,
    fallback: [] as AgentCommand[],
  });
}

export async function createAgentCommand(
  command: Omit<AgentCommand, 'id' | 'created_at' | 'received_at' | 'completed_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_commands')
    .insert(command)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentCommandSchema, data, 'createAgentCommand');
}

export async function updateAgentCommandStatus(
  id: string,
  status: AgentCommand['status'],
  client: SupabaseClient = supabase
) {
  const update: Partial<AgentCommand> = { status };

  if (status === 'received') {
    update.received_at = new Date().toISOString();
  } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('agent_commands')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentCommandSchema, data, 'updateAgentCommandStatus');
}

// ============================================
// AGENT RESPONSES
// ============================================

export async function getAgentResponses(
  sessionId?: string,
  commandId?: string,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_responses')
    .select('*')
    .order('created_at', { ascending: true });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  if (commandId) {
    query = query.eq('command_id', commandId);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentResponses',
    returnFallback: true,
    fallback: [] as AgentResponse[],
  });
}

export async function createAgentResponse(
  response: Omit<AgentResponse, 'id' | 'created_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_responses')
    .insert(response)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentResponseSchema, data, 'createAgentResponse');
}

// ============================================
// AGENT TASKS
// ============================================

export async function getAgentTasks(
  status?: AgentTask['status'],
  taskType?: AgentTask['task_type'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (taskType) {
    query = query.eq('task_type', taskType);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentTasks',
    returnFallback: true,
    fallback: [] as AgentTask[],
  });
}

export async function getAgentTaskById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskSchema, data, 'getAgentTaskById');
}

export async function getScheduledAgentTasks(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_tasks')
    .select('*')
    .eq('status', 'active')
    .eq('task_type', 'scheduled')
    .order('next_run_at', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getScheduledAgentTasks',
    returnFallback: true,
    fallback: [] as AgentTask[],
  });
}

export async function createAgentTask(
  task: Omit<AgentTask, 'id' | 'created_at' | 'updated_at' | 'last_run_at' | 'last_error' | 'run_count'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_tasks')
    .insert({ ...task, run_count: 0 })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskSchema, data, 'createAgentTask');
}

export async function updateAgentTask(
  id: string,
  task: Partial<AgentTask>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_tasks')
    .update({ ...task, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskSchema, data, 'updateAgentTask');
}

export async function deleteAgentTask(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('agent_tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// AGENT TASK RUNS
// ============================================

export async function getAgentTaskRuns(
  taskId?: string,
  status?: AgentTaskRun['status'],
  limit = 50,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_task_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (taskId) {
    query = query.eq('task_id', taskId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentTaskRuns',
    returnFallback: true,
    fallback: [] as AgentTaskRun[],
  });
}

export async function createAgentTaskRun(
  run: Omit<AgentTaskRun, 'id' | 'started_at' | 'completed_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_task_runs')
    .insert(run)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskRunSchema, data, 'createAgentTaskRun');
}

export async function updateAgentTaskRun(
  id: string,
  run: Partial<AgentTaskRun>,
  client: SupabaseClient = supabase
) {
  const update = { ...run };
  if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('agent_task_runs')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentTaskRunSchema, data, 'updateAgentTaskRun');
}

// ============================================
// AGENT SESSIONS
// ============================================

export async function getAgentSessions(
  userId?: string,
  activeOnly = false,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_sessions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentSessions',
    returnFallback: true,
    fallback: [] as AgentSession[],
  });
}

export async function getAgentSessionById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(AgentSessionSchema, data, 'getAgentSessionById');
}

export async function createAgentSession(
  session: Omit<AgentSession, 'id' | 'created_at' | 'updated_at' | 'message_count' | 'last_message_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_sessions')
    .insert({ ...session, message_count: 0 })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentSessionSchema, data, 'createAgentSession');
}

export async function updateAgentSession(
  id: string,
  session: Partial<AgentSession>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_sessions')
    .update({ ...session, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentSessionSchema, data, 'updateAgentSession');
}

export async function closeAgentSession(id: string, client: SupabaseClient = supabase) {
  return updateAgentSession(id, { is_active: false }, client);
}

// ============================================
// AGENT CONFIG
// ============================================

export async function getAgentConfig(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_config')
    .select('*')
    .order('key');

  return handleQueryResult(data, error, {
    operation: 'getAgentConfig',
    returnFallback: true,
    fallback: [] as AgentConfig[],
  });
}

export async function getAgentConfigByKey(key: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('agent_config')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== SUPABASE_ERROR_CODES.NOT_FOUND) throw error;
  return data ? parseResponse(AgentConfigSchema, data, 'getAgentConfigByKey') : null;
}

export async function upsertAgentConfig(
  key: string,
  value: unknown,
  description?: string,
  isSecret = false,
  updatedBy?: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_config')
    .upsert(
      {
        key,
        value,
        description,
        is_secret: isSecret,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentConfigSchema, data, 'upsertAgentConfig');
}

export async function deleteAgentConfig(key: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('agent_config')
    .delete()
    .eq('key', key);

  if (error) throw error;
}

// ============================================
// AGENT CONFIRMATIONS
// ============================================

export async function getAgentConfirmations(
  sessionId?: string,
  status?: AgentConfirmation['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('agent_confirmations')
    .select('*')
    .order('created_at', { ascending: false });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getAgentConfirmations',
    returnFallback: true,
    fallback: [] as AgentConfirmation[],
  });
}

export async function getPendingAgentConfirmations(
  sessionId: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('agent_confirmations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  return handleQueryResult(data, error, {
    operation: 'getPendingAgentConfirmations',
    returnFallback: true,
    fallback: [] as AgentConfirmation[],
  });
}

export async function createAgentConfirmation(
  confirmation: Omit<AgentConfirmation, 'id' | 'created_at' | 'responded_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_confirmations')
    .insert(confirmation)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentConfirmationSchema, data, 'createAgentConfirmation');
}

export async function respondToAgentConfirmation(
  id: string,
  approved: boolean,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('agent_confirmations')
    .update({
      status: approved ? 'approved' : 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;
  return parseResponse(AgentConfirmationSchema, data, 'respondToAgentConfirmation');
}

// ============================================
// BOOKMARKS
// ============================================

export interface BookmarkQueryOptions {
  source?: Bookmark['source'];
  category?: string;
  isRead?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  isPublic?: boolean;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export async function getBookmarks(
  options: BookmarkQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('bookmarks')
    .select('*')
    .order('imported_at', { ascending: false });

  if (options.source) {
    query = query.eq('source', options.source);
  }

  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.isRead !== undefined) {
    query = query.eq('is_read', options.isRead);
  }

  if (options.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  } else {
    query = query.eq('is_archived', false);
  }

  if (options.isFavorite !== undefined) {
    query = query.eq('is_favorite', options.isFavorite);
  }

  if (options.isPublic !== undefined) {
    query = query.eq('is_public', options.isPublic);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,content.ilike.%${options.search}%`);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getBookmarks',
    returnFallback: true,
    fallback: [] as Bookmark[],
  });
}

export async function getBookmarkById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmarks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(BookmarkSchema, data, 'getBookmarkById');
}

export async function getPublicBookmarks(limit = 50, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmarks')
    .select('*')
    .eq('is_public', true)
    .eq('is_archived', false)
    .order('imported_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getPublicBookmarks',
    returnFallback: true,
    fallback: [] as Bookmark[],
  });
}

export async function createBookmark(
  bookmark: Omit<Bookmark, 'id' | 'created_at' | 'updated_at' | 'imported_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmarks')
    .insert(bookmark)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkSchema, data, 'createBookmark');
}

export async function upsertBookmark(
  bookmark: Omit<Bookmark, 'id' | 'created_at' | 'updated_at' | 'imported_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmarks')
    .upsert(bookmark, { onConflict: 'source,source_id', ignoreDuplicates: true })
    .select()
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? parseResponse(BookmarkSchema, data, 'upsertBookmark') : null;
}

export async function updateBookmark(
  id: string,
  bookmark: Partial<Bookmark>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmarks')
    .update({ ...bookmark, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkSchema, data, 'updateBookmark');
}

export async function deleteBookmark(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmarks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function bulkDeleteBookmarks(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmarks')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function toggleBookmarkFavorite(id: string, isFavorite: boolean, client: SupabaseClient = supabase) {
  return updateBookmark(id, { is_favorite: isFavorite }, client);
}

export async function toggleBookmarkPublic(id: string, isPublic: boolean, client: SupabaseClient = supabase) {
  return updateBookmark(id, { is_public: isPublic }, client);
}

export async function archiveBookmarks(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmarks')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;
}

// ============================================
// BOOKMARK COLLECTIONS
// ============================================

export async function getBookmarkCollections(
  includePrivate = true,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('bookmark_collections')
    .select('*')
    .order('sort_order');

  if (!includePrivate) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getBookmarkCollections',
    returnFallback: true,
    fallback: [] as BookmarkCollection[],
  });
}

export async function getBookmarkCollectionBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_collections')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCollectionSchema, data, 'getBookmarkCollectionBySlug');
}

export async function getBookmarkCollectionById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_collections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCollectionSchema, data, 'getBookmarkCollectionById');
}

export async function createBookmarkCollection(
  collection: Omit<BookmarkCollection, 'id' | 'created_at' | 'updated_at' | 'item_count'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_collections')
    .insert({ ...collection, item_count: 0 })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCollectionSchema, data, 'createBookmarkCollection');
}

export async function updateBookmarkCollection(
  id: string,
  collection: Partial<BookmarkCollection>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_collections')
    .update({ ...collection, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCollectionSchema, data, 'updateBookmarkCollection');
}

export async function deleteBookmarkCollection(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmark_collections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderBookmarkCollections(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('bookmark_collections')
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// BOOKMARK COLLECTION ITEMS
// ============================================

export async function getBookmarksInCollection(
  collectionId: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('bookmark_collection_items')
    .select('*, bookmark:bookmarks(*)')
    .eq('collection_id', collectionId)
    .order('sort_order');

  return handleQueryResult(data, error, {
    operation: 'getBookmarksInCollection',
    returnFallback: true,
    fallback: [] as (BookmarkCollectionItem & { bookmark: Bookmark | null })[],
  });
}

export async function addBookmarkToCollection(
  bookmarkId: string,
  collectionId: string,
  notes?: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_collection_items')
    .insert({ bookmark_id: bookmarkId, collection_id: collectionId, notes })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCollectionItemSchema, data, 'addBookmarkToCollection');
}

export async function removeBookmarkFromCollection(
  bookmarkId: string,
  collectionId: string,
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('bookmark_collection_items')
    .delete()
    .eq('bookmark_id', bookmarkId)
    .eq('collection_id', collectionId);

  if (error) throw error;
}

export async function reorderBookmarksInCollection(
  collectionId: string,
  orderedBookmarkIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedBookmarkIds.map((bookmarkId, index) =>
    client
      .from('bookmark_collection_items')
      .update({ sort_order: index })
      .eq('collection_id', collectionId)
      .eq('bookmark_id', bookmarkId)
  );

  await Promise.all(updates);
}

// ============================================
// BOOKMARK IMPORT JOBS
// ============================================

export async function getBookmarkImportJobs(
  status?: BookmarkImportJob['status'],
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('bookmark_import_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getBookmarkImportJobs',
    returnFallback: true,
    fallback: [] as BookmarkImportJob[],
  });
}

export async function getBookmarkImportJobById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_import_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(BookmarkImportJobSchema, data, 'getBookmarkImportJobById');
}

export async function createBookmarkImportJob(
  job: Omit<BookmarkImportJob, 'id' | 'created_at' | 'started_at' | 'completed_at' | 'processed_items' | 'imported_items' | 'skipped_items' | 'error_log'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_import_jobs')
    .insert({
      ...job,
      processed_items: 0,
      imported_items: 0,
      skipped_items: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkImportJobSchema, data, 'createBookmarkImportJob');
}

export async function updateBookmarkImportJob(
  id: string,
  job: Partial<BookmarkImportJob>,
  client: SupabaseClient = supabase
) {
  const update = { ...job };

  if (job.status === 'processing' && !job.started_at) {
    update.started_at = new Date().toISOString();
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'partial') {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('bookmark_import_jobs')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkImportJobSchema, data, 'updateBookmarkImportJob');
}

// ============================================
// BOOKMARK CATEGORIES
// ============================================

export async function getBookmarkCategories(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_categories')
    .select('*')
    .order('sort_order');

  return handleQueryResult(data, error, {
    operation: 'getBookmarkCategories',
    returnFallback: true,
    fallback: [] as BookmarkCategory[],
  });
}

export async function getBookmarkCategoryBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCategorySchema, data, 'getBookmarkCategoryBySlug');
}

export async function createBookmarkCategory(
  category: Omit<BookmarkCategory, 'id' | 'created_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCategorySchema, data, 'createBookmarkCategory');
}

export async function updateBookmarkCategory(
  id: string,
  category: Partial<BookmarkCategory>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_categories')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(BookmarkCategorySchema, data, 'updateBookmarkCategory');
}

export async function deleteBookmarkCategory(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmark_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// BOOKMARK STATS
// ============================================

export async function getBookmarkStats(client: SupabaseClient = getSupabase()) {
  const [
    totalResult,
    unreadResult,
    favoritesResult,
    publicResult,
    collectionsResult,
    twitterResult,
    manualResult,
  ] = await Promise.all([
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('is_archived', false),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('is_read', false).eq('is_archived', false),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('is_favorite', true),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('is_public', true),
    client.from('bookmark_collections').select('id', { count: 'exact', head: true }),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('source', 'twitter'),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('source', 'manual'),
  ]);

  return {
    total_bookmarks: totalResult.count ?? 0,
    unread_count: unreadResult.count ?? 0,
    favorites_count: favoritesResult.count ?? 0,
    public_count: publicResult.count ?? 0,
    collections_count: collectionsResult.count ?? 0,
    twitter_count: twitterResult.count ?? 0,
    manual_count: manualResult.count ?? 0,
  };
}
