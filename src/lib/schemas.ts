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
  source_url: z.string().nullable(),  // The source's own article page (for link-blogs)
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

// ============================================
// AGENT SCHEMAS
// ============================================

// Agent Commands (input queue)
export const AgentCommandTypeSchema = z.enum(['chat', 'task', 'cancel']);
export const AgentCommandStatusSchema = z.enum(['pending', 'received', 'processing', 'completed', 'failed', 'cancelled']);
export const AgentCommandSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  command_type: AgentCommandTypeSchema,
  content: z.string(),
  status: AgentCommandStatusSchema,
  user_id: z.string(),
  user_email: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  received_at: z.string().nullable(),
  completed_at: z.string().nullable(),
});
export type AgentCommand = z.infer<typeof AgentCommandSchema>;

// Agent Responses (output stream)
export const AgentResponseTypeSchema = z.enum(['message', 'tool_use', 'tool_result', 'progress', 'error', 'complete', 'confirmation_request']);
export const AgentResponseSchema = z.object({
  id: z.string().uuid(),
  command_id: z.string().uuid().nullable(),
  session_id: z.string().uuid(),
  response_type: AgentResponseTypeSchema,
  content: z.string().nullable(),
  tool_name: z.string().nullable(),
  tool_input: z.record(z.unknown()).nullable(),
  tool_result: z.record(z.unknown()).nullable(),
  is_streaming: z.boolean(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
});
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Agent Tasks
export const AgentTaskTypeSchema = z.enum(['scheduled', 'triggered', 'manual']);
export const AgentTaskStatusSchema = z.enum(['active', 'paused', 'completed', 'failed', 'disabled']);
export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  task_type: AgentTaskTypeSchema,
  schedule: z.string().nullable(),
  config: z.record(z.unknown()).nullable(),
  status: AgentTaskStatusSchema,
  last_run_at: z.string().nullable(),
  next_run_at: z.string().nullable(),
  last_error: z.string().nullable(),
  run_count: z.number(),
  max_retries: z.number(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentTask = z.infer<typeof AgentTaskSchema>;

// Agent Task Runs
export const AgentTaskRunStatusSchema = z.enum(['running', 'completed', 'failed', 'cancelled']);
export const AgentTaskRunSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid().nullable(),
  status: AgentTaskRunStatusSchema,
  started_at: z.string(),
  completed_at: z.string().nullable(),
  output: z.string().nullable(),
  error: z.string().nullable(),
  metrics: z.record(z.unknown()).nullable(),
  triggered_by: z.string().nullable(),
});
export type AgentTaskRun = z.infer<typeof AgentTaskRunSchema>;

// Agent Sessions
export const AgentSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  user_email: z.string(),
  title: z.string().nullable(),
  is_active: z.boolean(),
  message_count: z.number(),
  last_message_at: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentSession = z.infer<typeof AgentSessionSchema>;

// Agent Config
export const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  value: z.unknown(),
  description: z.string().nullable(),
  is_secret: z.boolean(),
  updated_at: z.string(),
  updated_by: z.string().nullable(),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Agent Confirmations
export const AgentConfirmationStatusSchema = z.enum(['pending', 'approved', 'rejected', 'expired']);
export const AgentConfirmationSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  command_id: z.string().uuid().nullable(),
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
  description: z.string(),
  status: AgentConfirmationStatusSchema,
  expires_at: z.string(),
  responded_at: z.string().nullable(),
  created_at: z.string(),
});
export type AgentConfirmation = z.infer<typeof AgentConfirmationSchema>;

// ============================================
// BOOKMARK SCHEMAS
// ============================================

// Bookmarks
export const BookmarkSourceSchema = z.enum(['twitter', 'pocket', 'raindrop', 'manual', 'other']);
export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  source: BookmarkSourceSchema,
  source_id: z.string().nullable(),
  source_url: z.string().nullable(),
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  author: z.string().nullable(),
  author_handle: z.string().nullable(),
  author_avatar_url: z.string().nullable(),
  tags: z.array(z.string()),
  category: z.string().nullable(),
  ai_summary: z.string().nullable(),
  ai_tags: z.array(z.string()),
  ai_category: z.string().nullable(),
  ai_processed_at: z.string().nullable(),
  is_read: z.boolean(),
  is_archived: z.boolean(),
  is_favorite: z.boolean(),
  is_public: z.boolean(),
  image_url: z.string().nullable(),
  favicon_url: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  published_at: z.string().nullable(),
  imported_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

// Bookmark Collections
export const BookmarkCollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  cover_image: z.string().nullable(),
  color: z.string(),
  is_public: z.boolean(),
  is_smart: z.boolean(),
  smart_rules: z.record(z.unknown()).nullable(),
  sort_order: z.number(),
  item_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BookmarkCollection = z.infer<typeof BookmarkCollectionSchema>;

// Bookmark Collection Items
export const BookmarkCollectionItemSchema = z.object({
  bookmark_id: z.string().uuid(),
  collection_id: z.string().uuid(),
  sort_order: z.number(),
  notes: z.string().nullable(),
  added_at: z.string(),
});
export type BookmarkCollectionItem = z.infer<typeof BookmarkCollectionItemSchema>;

// Bookmark Import Jobs
export const BookmarkImportJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'partial']);
export const BookmarkImportJobSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  status: BookmarkImportJobStatusSchema,
  file_path: z.string().nullable(),
  total_items: z.number(),
  processed_items: z.number(),
  imported_items: z.number(),
  skipped_items: z.number(),
  error_log: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});
export type BookmarkImportJob = z.infer<typeof BookmarkImportJobSchema>;

// Bookmark Categories
export const BookmarkCategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  icon: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type BookmarkCategory = z.infer<typeof BookmarkCategorySchema>;

// ============================================
// CRM SCHEMAS
// ============================================

// Contact Types
export const ContactTypeSchema = z.enum(['lead', 'prospect', 'client', 'partner', 'vendor', 'personal', 'other']);
export const ContactStatusSchema = z.enum(['active', 'inactive', 'archived']);

// Contacts
export const ContactSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  job_title: z.string().nullable(),
  website: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  twitter_handle: z.string().nullable(),
  github_username: z.string().nullable(),
  contact_type: ContactTypeSchema,
  status: ContactStatusSchema,
  lead_score: z.number(),
  source: z.string().nullable(),
  source_detail: z.string().nullable(),
  referrer_id: z.string().uuid().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  timezone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  custom_fields: z.record(z.unknown()).nullable(),
  last_contacted_at: z.string().nullable(),
  next_follow_up_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

// Interaction Types
export const InteractionTypeSchema = z.enum([
  'email_sent', 'email_received',
  'call_outbound', 'call_inbound',
  'meeting', 'video_call',
  'message', 'linkedin_message',
  'note', 'task_completed',
  'website_visit', 'form_submission',
  'other'
]);
export const SentimentSchema = z.enum(['positive', 'neutral', 'negative']);

// Interactions
export const InteractionSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  interaction_type: InteractionTypeSchema,
  subject: z.string().nullable(),
  content: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  outcome: z.string().nullable(),
  sentiment: SentimentSchema.nullable(),
  related_url: z.string().nullable(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
  })),
  occurred_at: z.string(),
  created_at: z.string(),
  created_by: z.string().nullable(),
});
export type Interaction = z.infer<typeof InteractionSchema>;

// Follow-up Types
export const FollowUpTypeSchema = z.enum(['reminder', 'call', 'email', 'meeting', 'task', 'review']);
export const FollowUpStatusSchema = z.enum(['pending', 'completed', 'skipped', 'snoozed']);
export const FollowUpPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

// Follow-ups
export const FollowUpSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  follow_up_type: FollowUpTypeSchema,
  due_at: z.string(),
  remind_at: z.string().nullable(),
  status: FollowUpStatusSchema,
  priority: FollowUpPrioritySchema,
  completed_at: z.string().nullable(),
  completed_by: z.string().nullable(),
  completion_notes: z.string().nullable(),
  is_recurring: z.boolean(),
  recurrence_rule: z.string().nullable(),
  parent_follow_up_id: z.string().uuid().nullable(),
  created_at: z.string(),
  created_by: z.string().nullable(),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

// Contact Lists
export const ContactListSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  list_type: z.enum(['static', 'smart']),
  smart_filter: z.record(z.unknown()).nullable(),
  color: z.string(),
  icon: z.string().nullable(),
  contact_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ContactList = z.infer<typeof ContactListSchema>;

// Pipelines
export const PipelineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  is_default: z.boolean(),
  created_at: z.string(),
});
export type Pipeline = z.infer<typeof PipelineSchema>;

// Pipeline Stages
export const PipelineStageSchema = z.object({
  id: z.string().uuid(),
  pipeline_id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  color: z.string(),
  sort_order: z.number(),
  is_won: z.boolean(),
  is_lost: z.boolean(),
  probability: z.number(),
});
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

// Deals
export const DealStatusSchema = z.enum(['open', 'won', 'lost']);
export const DealSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid().nullable(),
  name: z.string(),
  value: z.number().nullable(),
  currency: z.string(),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  status: DealStatusSchema,
  close_date: z.string().nullable(),
  lost_reason: z.string().nullable(),
  probability: z.number().nullable(),
  expected_revenue: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
});
export type Deal = z.infer<typeof DealSchema>;

// CRM Stats
export const CRMStatsSchema = z.object({
  total_contacts: z.number(),
  active_contacts: z.number(),
  leads: z.number(),
  clients: z.number(),
  open_deals: z.number(),
  total_deal_value: z.number(),
  pending_follow_ups: z.number(),
  overdue_follow_ups: z.number(),
});
export type CRMStats = z.infer<typeof CRMStatsSchema>;
