import { z } from 'zod';
import { captureException } from './sentry';

// App Suites
export const AppSuiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AppSuite = z.infer<typeof AppSuiteSchema>;

// Apps
export const AppStatusSchema = z.enum(['planned', 'in_development', 'available', 'archived']);
export const AppSchema = z.object({
  id: z.string().uuid(),
  suite_id: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  icon_url: z.string().nullable(),
  external_url: z.string().nullable(),
  demo_url: z.string().nullable(),
  tech_stack: z.array(z.string()).nullable(),
  status: AppStatusSchema,
  order_index: z.number(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  og_image: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type App = z.infer<typeof AppSchema>;

export const AppWithSuiteSchema = AppSchema.extend({
  suite: AppSuiteSchema.nullable(),
});
export type AppWithSuite = z.infer<typeof AppWithSuiteSchema>;

// Blog Posts
export const BlogPostStatusSchema = z.enum(['draft', 'published', 'scheduled']);
export const BlogPostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  cover_image: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  status: BlogPostStatusSchema,
  published_at: z.string().nullable(),
  scheduled_for: z.string().nullable(),
  reading_time: z.number().nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  og_image: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BlogPost = z.infer<typeof BlogPostSchema>;

// Site Content
export const SiteContentSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  content: z.string(),
  updated_at: z.string(),
});
export type SiteContent = z.infer<typeof SiteContentSchema>;

// Projects
export const ProjectStatusSchema = z.enum(['draft', 'published', 'scheduled']);
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  cover_image: z.string().nullable(),
  external_url: z.string().nullable(),
  tech_stack: z.array(z.string()).nullable(),
  status: ProjectStatusSchema,
  scheduled_for: z.string().nullable(),
  order_index: z.number(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  og_image: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

// Contact Links
export const ContactIconSchema = z.enum(['email', 'linkedin', 'github', 'twitter', 'calendar']);
export const ContactLinkSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  href: z.string(),
  value: z.string().nullable(),
  description: z.string().nullable(),
  icon: ContactIconSchema,
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ContactLink = z.infer<typeof ContactLinkSchema>;

// Work History
export const WorkHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  company: z.string(),
  period: z.string(),
  highlights: z.array(z.string()).nullable().transform(v => v ?? []),
  tech: z.array(z.string()).nullable().transform(v => v ?? []),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkHistoryEntry = z.infer<typeof WorkHistoryEntrySchema>;

// Case Studies
export const CaseStudySchema = z.object({
  id: z.string().uuid(),
  metric: z.string(),
  title: z.string(),
  before_content: z.string(),
  after_content: z.string(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CaseStudy = z.infer<typeof CaseStudySchema>;

// Timelines
export const TimelineChartTypeSchema = z.enum(['growth', 'linear', 'decline']);
export const TimelineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  chart_type: TimelineChartTypeSchema,
  is_active: z.boolean(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Timeline = z.infer<typeof TimelineSchema>;

export const TimelineEntrySchema = z.object({
  id: z.string().uuid(),
  timeline_id: z.string().uuid(),
  label: z.string(),
  phase: z.string(),
  summary: z.string().nullable(),
  content: z.string().nullable(),
  dot_position: z.number(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const TimelineWithEntriesSchema = TimelineSchema.extend({
  entries: z.array(TimelineEntrySchema),
});
export type TimelineWithEntries = z.infer<typeof TimelineWithEntriesSchema>;

// Helper function to safely parse data with Zod
export function parseResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    captureException(new Error(`Schema validation failed for ${context}`), {
      context,
      errors: result.error.errors,
    });
    throw new Error(`Invalid response format from ${context}`);
  }
  return result.data;
}

// Helper function for arrays
export function parseArrayResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T[] {
  const arraySchema = z.array(schema);
  const result = arraySchema.safeParse(data);
  if (!result.success) {
    captureException(new Error(`Array schema validation failed for ${context}`), {
      context,
      errors: result.error.errors,
    });
    throw new Error(`Invalid response format from ${context}`);
  }
  return result.data;
}

// ============================================
// NEWS FEED SCHEMAS
// ============================================

// News Categories
export const NewsCategoryColorSchema = z.enum(['blue', 'green', 'purple', 'orange', 'red', 'yellow']);
export const NewsCategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: NewsCategoryColorSchema,
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NewsCategory = z.infer<typeof NewsCategorySchema>;

// News Sources
export const NewsSourceTypeSchema = z.enum(['rss', 'api']);
export const NewsSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  source_type: NewsSourceTypeSchema,
  url: z.string(),
  api_key: z.string().nullable(),
  category_slug: z.string().nullable(),
  is_active: z.boolean(),
  refresh_interval_minutes: z.number(),
  last_fetched_at: z.string().nullable(),
  fetch_error: z.string().nullable(),
  icon_url: z.string().nullable(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NewsSource = z.infer<typeof NewsSourceSchema>;

// News Source with Category (for joins)
export const NewsSourceWithCategorySchema = NewsSourceSchema.extend({
  category: NewsCategorySchema.nullable(),
});
export type NewsSourceWithCategory = z.infer<typeof NewsSourceWithCategorySchema>;

// News Articles
export const NewsArticleSchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  external_id: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  url: z.string(),
  image_url: z.string().nullable(),
  author: z.string().nullable(),
  published_at: z.string().nullable(),
  fetched_at: z.string(),
  is_read: z.boolean(),
  is_bookmarked: z.boolean(),
  is_archived: z.boolean(),
  admin_notes: z.string().nullable(),
  is_curated: z.boolean(),
  curated_at: z.string().nullable(),
  curated_summary: z.string().nullable(),
  curated_order: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

// News Article with Source (for display)
export const NewsArticleWithSourceSchema = NewsArticleSchema.extend({
  source: NewsSourceSchema.nullable(),
});
export type NewsArticleWithSource = z.infer<typeof NewsArticleWithSourceSchema>;

// News Filters
export const NewsFilterTypeSchema = z.enum(['include_keyword', 'exclude_keyword', 'include_topic', 'exclude_source']);
export const NewsFilterSchema = z.object({
  id: z.string().uuid(),
  filter_type: NewsFilterTypeSchema,
  value: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NewsFilter = z.infer<typeof NewsFilterSchema>;

// News Dashboard Tabs
export const NewsDashboardTabTypeSchema = z.enum(['filter', 'category', 'source', 'saved_search', 'custom']);

// Tab config schemas for different tab types
export const TabConfigFilterSchema = z.object({
  filter: z.enum(['all', 'unread', 'bookmarked', 'curated', 'archived']),
});

export const TabConfigCategorySchema = z.object({
  category_slug: z.string(),
});

export const TabConfigSourceSchema = z.object({
  source_id: z.string().uuid(),
});

export const TabConfigSavedSearchSchema = z.object({
  keywords: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

export const TabConfigCustomSchema = z.object({
  categories: z.array(z.string()).optional(),
  sources: z.array(z.string().uuid()).optional(),
  unread_only: z.boolean().optional(),
  bookmarked_only: z.boolean().optional(),
  keywords: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

// Union of all tab configs
export const TabConfigSchema = z.union([
  TabConfigFilterSchema,
  TabConfigCategorySchema,
  TabConfigSourceSchema,
  TabConfigSavedSearchSchema,
  TabConfigCustomSchema,
  z.object({}), // Empty config for 'all' filter
]);
export type TabConfig = z.infer<typeof TabConfigSchema>;

export const NewsDashboardTabSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  tab_type: NewsDashboardTabTypeSchema,
  config: z.record(z.unknown()), // JSONB stored as record, validated separately
  icon: z.string().nullable(),
  is_active: z.boolean(),
  is_pinned: z.boolean(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NewsDashboardTab = z.infer<typeof NewsDashboardTabSchema>;

// News Stats (for dashboard widgets)
export const NewsStatsSchema = z.object({
  total_articles: z.number(),
  unread_count: z.number(),
  bookmarked_count: z.number(),
  curated_count: z.number(),
  sources_count: z.number(),
  active_sources_count: z.number(),
  last_fetch: z.string().nullable(),
});
export type NewsStats = z.infer<typeof NewsStatsSchema>;
