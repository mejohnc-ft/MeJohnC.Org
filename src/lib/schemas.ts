import { z } from "zod";
import { captureException } from "./sentry";

// ============================================
// TENANT SCHEMAS (Multi-tenant support)
// ============================================

/**
 * Default tenant ID for standalone mode.
 * @deprecated Do not use for new code — pass tenantId from useTenantSupabase() or ServiceContext instead (#297).
 * Retained only for Zod schema .default() calls.
 */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// Tenant Types
export const TenantTypeSchema = z.enum([
  "platform",
  "organization",
  "account",
  "user",
]);
export type TenantType = z.infer<typeof TenantTypeSchema>;

// Tenant Schema
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  type: TenantTypeSchema,
  hierarchy_path: z.string().nullable(),
  parent_id: z.string().uuid().nullable(),
  settings: z.record(z.unknown()).nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Tenant = z.infer<typeof TenantSchema>;

// Default tenant ID constant is used directly in schemas below

// ============================================
// APP SCHEMAS
// ============================================

// App Suites
export const AppSuiteSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AppSuite = z.infer<typeof AppSuiteSchema>;

// Apps
export const AppStatusSchema = z.enum([
  "planned",
  "in_development",
  "available",
  "archived",
]);
export const AppSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const BlogPostStatusSchema = z.enum(["draft", "published", "scheduled"]);
export const BlogPostSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  key: z.string(),
  title: z.string(),
  content: z.string(),
  updated_at: z.string(),
});
export type SiteContent = z.infer<typeof SiteContentSchema>;

// Projects
export const ProjectStatusSchema = z.enum(["draft", "published", "scheduled"]);
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const ContactIconSchema = z.enum([
  "email",
  "linkedin",
  "github",
  "twitter",
  "calendar",
]);
export const ContactLinkSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  title: z.string(),
  company: z.string(),
  period: z.string(),
  highlights: z
    .array(z.string())
    .nullable()
    .transform((v) => v ?? []),
  tech: z
    .array(z.string())
    .nullable()
    .transform((v) => v ?? []),
  order_index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkHistoryEntry = z.infer<typeof WorkHistoryEntrySchema>;

// Case Studies
export const CaseStudySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const TimelineChartTypeSchema = z.enum(["growth", "linear", "decline"]);
export const TimelineSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  context: string,
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
  context: string,
): T[] {
  const arraySchema = z.array(schema);
  const result = arraySchema.safeParse(data);
  if (!result.success) {
    captureException(
      new Error(`Array schema validation failed for ${context}`),
      {
        context,
        errors: result.error.errors,
      },
    );
    throw new Error(`Invalid response format from ${context}`);
  }
  return result.data;
}

// ============================================
// NEWS FEED SCHEMAS
// ============================================

// News Categories
export const NewsCategoryColorSchema = z.enum([
  "blue",
  "green",
  "purple",
  "orange",
  "red",
  "yellow",
]);
export const NewsCategorySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const NewsSourceTypeSchema = z.enum(["rss", "api"]);
export const NewsSourceSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export type NewsSourceWithCategory = z.infer<
  typeof NewsSourceWithCategorySchema
>;

// News Articles
export const NewsArticleSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  source_id: z.string().uuid(),
  external_id: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  url: z.string(),
  source_url: z.string().nullable(), // The source's own article page (for link-blogs)
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
export const NewsFilterTypeSchema = z.enum([
  "include_keyword",
  "exclude_keyword",
  "include_topic",
  "exclude_source",
]);
export const NewsFilterSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  filter_type: NewsFilterTypeSchema,
  value: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NewsFilter = z.infer<typeof NewsFilterSchema>;

// News Dashboard Tabs
export const NewsDashboardTabTypeSchema = z.enum([
  "filter",
  "category",
  "source",
  "saved_search",
  "custom",
]);

// Tab config schemas for different tab types
export const TabConfigFilterSchema = z.object({
  filter: z.enum(["all", "unread", "bookmarked", "curated", "archived"]),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const AgentCommandTypeSchema = z.enum(["chat", "task", "cancel"]);
export const AgentCommandStatusSchema = z.enum([
  "pending",
  "received",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export const AgentCommandSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const AgentResponseTypeSchema = z.enum([
  "message",
  "tool_use",
  "tool_result",
  "progress",
  "error",
  "complete",
  "confirmation_request",
]);
export const AgentResponseSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const AgentTaskTypeSchema = z.enum(["scheduled", "triggered", "manual"]);
export const AgentTaskStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "failed",
  "disabled",
]);
export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const AgentTaskRunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const AgentTaskRunSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const AgentConfirmationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
]);
export const AgentConfirmationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
// AGENT PLATFORM SCHEMAS (Phase 1 tables)
// ============================================

// Platform Agent Types
export const PlatformAgentTypeSchema = z.enum([
  "autonomous",
  "supervised",
  "tool",
]);
export type PlatformAgentType = z.infer<typeof PlatformAgentTypeSchema>;

export const PlatformAgentStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
]);
export type PlatformAgentStatus = z.infer<typeof PlatformAgentStatusSchema>;

export const AgentPlatformSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: PlatformAgentTypeSchema,
  status: PlatformAgentStatusSchema,
  capabilities: z
    .array(z.string())
    .nullable()
    .transform((v) => v ?? []),
  api_key_prefix: z.string().nullable(),
  health_status: z.string().nullable(),
  rate_limit_rpm: z.number().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  last_seen_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentPlatform = z.infer<typeof AgentPlatformSchema>;

// Workflow Types
export const WorkflowTriggerTypeSchema = z.enum([
  "manual",
  "scheduled",
  "webhook",
  "event",
]);
export type WorkflowTriggerType = z.infer<typeof WorkflowTriggerTypeSchema>;

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  trigger_type: WorkflowTriggerTypeSchema,
  trigger_config: z.record(z.unknown()).nullable(),
  steps: z
    .array(z.record(z.unknown()))
    .nullable()
    .transform((v) => v ?? []),
  is_active: z.boolean(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

// Workflow Run Types
export const WorkflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;

export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  status: WorkflowRunStatusSchema,
  trigger_type: z.string().nullable(),
  trigger_data: z.record(z.unknown()).nullable(),
  step_results: z
    .array(z.record(z.unknown()))
    .nullable()
    .transform((v) => v ?? []),
  error: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

// Integration Types
export const IntegrationServiceTypeSchema = z.enum([
  "oauth2",
  "api_key",
  "webhook",
  "custom",
]);
export type IntegrationServiceType = z.infer<
  typeof IntegrationServiceTypeSchema
>;

export const IntegrationStatusSchema = z.enum(["active", "inactive", "error"]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const IntegrationSchema = z.object({
  id: z.string().uuid(),
  service_name: z.string(),
  service_type: IntegrationServiceTypeSchema,
  display_name: z.string(),
  description: z.string().nullable(),
  icon_url: z.string().nullable(),
  config: z.record(z.unknown()).nullable(),
  status: IntegrationStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

// Agent-Integration Access
export const AgentIntegrationSchema = z.object({
  agent_id: z.string().uuid(),
  integration_id: z.string().uuid(),
  granted_scopes: z
    .array(z.string())
    .nullable()
    .transform((v) => v ?? []),
  granted_at: z.string(),
  granted_by: z.string().nullable(),
});
export type AgentIntegration = z.infer<typeof AgentIntegrationSchema>;

// Audit Log Entry (Phase 1 partitioned table)
export const AuditLogActorTypeSchema = z.enum([
  "user",
  "agent",
  "system",
  "scheduler",
]);
export type AuditLogActorType = z.infer<typeof AuditLogActorTypeSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  actor_type: AuditLogActorTypeSchema,
  actor_id: z.string().nullable(),
  action: z.string(),
  resource_type: z.string().nullable(),
  resource_id: z.string().nullable(),
  details: z.record(z.unknown()).nullable(),
  correlation_id: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

// Scheduled Workflow Runs
export const ScheduledWorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  scheduled_at: z.string(),
  dispatched_at: z.string().nullable(),
  status: z.string(),
  response_status: z.number().nullable(),
  error: z.string().nullable(),
});
export type ScheduledWorkflowRun = z.infer<typeof ScheduledWorkflowRunSchema>;

// ============================================
// BOOKMARK SCHEMAS
// ============================================

// Bookmarks
export const BookmarkSourceSchema = z.enum([
  "twitter",
  "pocket",
  "raindrop",
  "manual",
  "other",
]);
export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export type BookmarkCollectionItem = z.infer<
  typeof BookmarkCollectionItemSchema
>;

// Bookmark Import Jobs
export const BookmarkImportJobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "partial",
]);
export const BookmarkImportJobSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const ContactTypeSchema = z.enum([
  "lead",
  "prospect",
  "client",
  "partner",
  "vendor",
  "personal",
  "other",
]);
export const ContactStatusSchema = z.enum(["active", "inactive", "archived"]);

// Contacts
export const ContactSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  "email_sent",
  "email_received",
  "call_outbound",
  "call_inbound",
  "meeting",
  "video_call",
  "message",
  "linkedin_message",
  "note",
  "task_completed",
  "website_visit",
  "form_submission",
  "other",
]);
export const SentimentSchema = z.enum(["positive", "neutral", "negative"]);

// Interactions
export const InteractionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  contact_id: z.string().uuid(),
  interaction_type: InteractionTypeSchema,
  subject: z.string().nullable(),
  content: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  outcome: z.string().nullable(),
  sentiment: SentimentSchema.nullable(),
  related_url: z.string().nullable(),
  attachments: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      type: z.string().optional(),
    }),
  ),
  occurred_at: z.string(),
  created_at: z.string(),
  created_by: z.string().nullable(),
});
export type Interaction = z.infer<typeof InteractionSchema>;

// Follow-up Types
export const FollowUpTypeSchema = z.enum([
  "reminder",
  "call",
  "email",
  "meeting",
  "task",
  "review",
]);
export const FollowUpStatusSchema = z.enum([
  "pending",
  "completed",
  "skipped",
  "snoozed",
]);
export const FollowUpPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);

// Follow-ups
export const FollowUpSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  list_type: z.enum(["static", "smart"]),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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
export const DealStatusSchema = z.enum(["open", "won", "lost"]);
export const DealSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
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

// ============================================
// METRICS
// ============================================

// Metrics Source Types
export const MetricsSourceTypeSchema = z.enum([
  "github",
  "analytics",
  "supabase",
  "webhook",
  "custom",
]);
export const MetricsAuthTypeSchema = z.enum([
  "none",
  "api_key",
  "oauth",
  "bearer",
]);

export const MetricsSourceSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  slug: z.string(),
  source_type: MetricsSourceTypeSchema,
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string(),
  endpoint_url: z.string().nullable(),
  auth_type: MetricsAuthTypeSchema.nullable(),
  auth_config: z.record(z.unknown()).optional(),
  headers: z.record(z.unknown()).optional(),
  refresh_interval_minutes: z.number(),
  last_refresh_at: z.string().nullable(),
  next_refresh_at: z.string().nullable(),
  last_error: z.string().nullable(),
  error_count: z.number(),
  is_active: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MetricsSource = z.infer<typeof MetricsSourceSchema>;

// Metrics Data Types
export const MetricsDataTypeSchema = z.enum([
  "counter",
  "gauge",
  "histogram",
  "summary",
]);

export const MetricsDataSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  source_id: z.string().uuid(),
  metric_name: z.string(),
  metric_type: MetricsDataTypeSchema,
  value: z.number(),
  unit: z.string().nullable(),
  dimensions: z.record(z.unknown()).optional(),
  recorded_at: z.string(),
  created_at: z.string(),
});
export type MetricsData = z.infer<typeof MetricsDataSchema>;

// Dashboard Widget Types
export const DashboardWidgetSchema = z.object({
  id: z.string(),
  type: z.enum(["line", "bar", "area", "stat", "table"]),
  title: z.string(),
  source_id: z.string().uuid().nullable(),
  metric_name: z.string().nullable(),
  chart_type: z.string().nullable(),
  options: z.record(z.unknown()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
});
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;

export const MetricsDashboardSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  layout: z.array(DashboardWidgetSchema),
  default_time_range: z.string(),
  refresh_interval_seconds: z.number(),
  is_default: z.boolean(),
  is_public: z.boolean(),
  created_by: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MetricsDashboard = z.infer<typeof MetricsDashboardSchema>;

// Aggregated Metrics (for time series)
export const AggregatedMetricSchema = z.object({
  time_bucket: z.string(),
  avg_value: z.number(),
  min_value: z.number(),
  max_value: z.number(),
  sum_value: z.number(),
  count: z.number(),
});
export type AggregatedMetric = z.infer<typeof AggregatedMetricSchema>;

// Metrics Stats
export const MetricsStatsSchema = z.object({
  total_sources: z.number(),
  active_sources: z.number(),
  total_data_points: z.number(),
  dashboards_count: z.number(),
  last_refresh: z.string().nullable(),
});
export type MetricsStats = z.infer<typeof MetricsStatsSchema>;

// ============================================
// SITE BUILDER SCHEMAS
// ============================================

// Component Types
export const SiteBuilderComponentTypeSchema = z.enum([
  "hero",
  "features",
  "testimonials",
  "cta",
  "text",
  "image",
  "video",
  "spacer",
  "divider",
  "grid",
  "columns",
  "accordion",
  "tabs",
  "gallery",
  "stats",
  "team",
  "pricing",
  "faq",
  "contact",
]);

// Page Status
export const SiteBuilderPageStatusSchema = z.enum(["draft", "published"]);

// Site Builder Page
export const SiteBuilderPageSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: SiteBuilderPageStatusSchema,
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  og_image: z.string().nullable(),
  published_at: z.string().nullable(),
  created_by: z.string(),
  updated_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SiteBuilderPage = z.infer<typeof SiteBuilderPageSchema>;

// Page Version
export const SiteBuilderPageVersionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  page_id: z.string().uuid(),
  version_number: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  components: z.array(z.record(z.unknown())),
  created_by: z.string(),
  created_at: z.string(),
});
export type SiteBuilderPageVersion = z.infer<
  typeof SiteBuilderPageVersionSchema
>;

// Page Component
export const SiteBuilderPageComponentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  page_id: z.string().uuid(),
  component_type: SiteBuilderComponentTypeSchema,
  props: z.record(z.unknown()),
  order_index: z.number(),
  parent_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SiteBuilderPageComponent = z.infer<
  typeof SiteBuilderPageComponentSchema
>;

// Component Template
export const SiteBuilderComponentTemplateSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  description: z.string().nullable(),
  component_type: SiteBuilderComponentTypeSchema,
  preview_image: z.string().nullable(),
  props: z.record(z.unknown()),
  category: z.string().nullable(),
  is_active: z.boolean(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SiteBuilderComponentTemplate = z.infer<
  typeof SiteBuilderComponentTemplateSchema
>;

// Page with Components (for editor)
export const SiteBuilderPageWithComponentsSchema = SiteBuilderPageSchema.extend(
  {
    components: z.array(SiteBuilderPageComponentSchema),
  },
);
export type SiteBuilderPageWithComponents = z.infer<
  typeof SiteBuilderPageWithComponentsSchema
>;

// ============================================
// TASK SYSTEM SCHEMAS
// ============================================

// Task Categories
export const TaskCategorySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  icon: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type TaskCategory = z.infer<typeof TaskCategorySchema>;

// Tasks
export const TaskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
]);
export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  title: z.string(),
  description: z.string().nullable(),
  category_id: z.string().uuid().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigned_to: z.string().nullable(),
  assigned_to_email: z.string().nullable(),
  due_date: z.string().nullable(),
  is_overdue: z.boolean().nullable(),
  completed_at: z.string().nullable(),
  tags: z.array(z.string()),
  attachments: z.array(z.unknown()),
  metadata: z.record(z.unknown()).nullable(),
  sort_order: z.number(),
  parent_task_id: z.string().uuid().nullable(),
  created_by: z.string(),
  created_by_email: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

// Task with Category (for joins)
export const TaskWithCategorySchema = TaskSchema.extend({
  category: TaskCategorySchema.nullable(),
});
export type TaskWithCategory = z.infer<typeof TaskWithCategorySchema>;

// Task Comments
export const TaskCommentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  task_id: z.string().uuid(),
  comment: z.string(),
  author: z.string(),
  author_email: z.string(),
  is_internal: z.boolean(),
  attachments: z.array(z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type TaskComment = z.infer<typeof TaskCommentSchema>;

// Task Reminders
export const TaskReminderTypeSchema = z.enum(["email", "notification", "both"]);
export const TaskReminderSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  task_id: z.string().uuid(),
  reminder_at: z.string(),
  reminder_type: TaskReminderTypeSchema,
  is_sent: z.boolean(),
  sent_at: z.string().nullable(),
  created_at: z.string(),
});
export type TaskReminder = z.infer<typeof TaskReminderSchema>;

// Task Stats
export const TaskStatsSchema = z.object({
  total_tasks: z.number(),
  todo_count: z.number(),
  in_progress_count: z.number(),
  review_count: z.number(),
  done_count: z.number(),
  overdue_count: z.number(),
  high_priority_count: z.number(),
  urgent_priority_count: z.number(),
});
export type TaskStats = z.infer<typeof TaskStatsSchema>;

// ============================================
// MARKETING SCHEMAS
// ============================================

// Email Subscriber Status
export const EmailSubscriberStatusSchema = z.enum([
  "active",
  "unsubscribed",
  "bounced",
  "complained",
]);

// Email Subscribers
export const EmailSubscriberSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  status: EmailSubscriberStatusSchema,
  lists: z.array(z.string()),
  tags: z.array(z.string()),
  custom_fields: z.record(z.unknown()).nullable(),
  subscribed_at: z.string(),
  unsubscribed_at: z.string().nullable(),
  last_email_sent_at: z.string().nullable(),
  last_email_opened_at: z.string().nullable(),
  last_email_clicked_at: z.string().nullable(),
  total_emails_sent: z.number(),
  total_emails_opened: z.number(),
  total_emails_clicked: z.number(),
  source: z.string().nullable(),
  source_detail: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  referrer: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EmailSubscriber = z.infer<typeof EmailSubscriberSchema>;

// Email Lists
export const EmailListSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  is_public: z.boolean(),
  double_opt_in: z.boolean(),
  subscriber_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EmailList = z.infer<typeof EmailListSchema>;

// Email Campaign Status
export const EmailCampaignStatusSchema = z.enum([
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "cancelled",
]);

// Email Campaigns
export const EmailCampaignSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  subject: z.string(),
  preview_text: z.string().nullable(),
  template_id: z.string().uuid().nullable(),
  html_content: z.string().nullable(),
  text_content: z.string().nullable(),
  list_ids: z.array(z.string().uuid()).nullable(),
  segment_rules: z.record(z.unknown()).nullable(),
  exclude_tags: z.array(z.string()).nullable(),
  status: EmailCampaignStatusSchema,
  scheduled_for: z.string().nullable(),
  sent_at: z.string().nullable(),
  recipients_count: z.number(),
  sent_count: z.number(),
  delivered_count: z.number(),
  opened_count: z.number(),
  clicked_count: z.number(),
  bounced_count: z.number(),
  complained_count: z.number(),
  unsubscribed_count: z.number(),
  is_ab_test: z.boolean(),
  ab_test_config: z.record(z.unknown()).nullable(),
  created_by: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EmailCampaign = z.infer<typeof EmailCampaignSchema>;

// Email Template Types
export const EmailTemplateTypeSchema = z.enum([
  "newsletter",
  "transactional",
  "promotional",
  "custom",
]);

// Email Templates
export const EmailTemplateSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  template_type: EmailTemplateTypeSchema,
  subject_template: z.string().nullable(),
  preview_text_template: z.string().nullable(),
  html_content: z.string(),
  text_content: z.string().nullable(),
  variables: z.record(z.unknown()).nullable(),
  thumbnail_url: z.string().nullable(),
  is_active: z.boolean(),
  usage_count: z.number(),
  last_used_at: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

// Email Event Types
export const EmailEventTypeSchema = z.enum([
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "unsubscribed",
]);

// Email Events
export const EmailEventSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  event_type: EmailEventTypeSchema,
  subscriber_id: z.string().uuid().nullable(),
  campaign_id: z.string().uuid().nullable(),
  link_url: z.string().nullable(),
  bounce_type: z.string().nullable(),
  bounce_reason: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  provider_message_id: z.string().nullable(),
  provider_event_id: z.string().nullable(),
  provider_metadata: z.record(z.unknown()).nullable(),
  occurred_at: z.string(),
  created_at: z.string(),
});
export type EmailEvent = z.infer<typeof EmailEventSchema>;

// NPS Survey Status
export const NPSSurveyStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "closed",
]);

// NPS Surveys
export const NPSSurveySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  name: z.string(),
  question: z.string(),
  target_segment: z.string().nullable(),
  segment_rules: z.record(z.unknown()).nullable(),
  status: NPSSurveyStatusSchema,
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  responses_count: z.number(),
  promoters_count: z.number(),
  passives_count: z.number(),
  detractors_count: z.number(),
  nps_score: z.number().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NPSSurvey = z.infer<typeof NPSSurveySchema>;

// NPS Response Category
export const NPSCategorySchema = z.enum(["promoter", "passive", "detractor"]);

// NPS Responses
export const NPSResponseSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  survey_id: z.string().uuid(),
  email: z.string().nullable(),
  subscriber_id: z.string().uuid().nullable(),
  score: z.number(),
  feedback: z.string().nullable(),
  category: NPSCategorySchema,
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  referrer: z.string().nullable(),
  responded_at: z.string(),
  created_at: z.string(),
});
export type NPSResponse = z.infer<typeof NPSResponseSchema>;

// Content Suggestion Types
export const ContentSuggestionTypeSchema = z.enum([
  "email_subject",
  "email_body",
  "social_post",
  "blog_title",
  "landing_page_copy",
]);
export const ContentSuggestionStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "used",
]);

// Content Suggestions
export const ContentSuggestionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().default(DEFAULT_TENANT_ID),
  content_type: ContentSuggestionTypeSchema,
  prompt: z.string(),
  context: z.record(z.unknown()).nullable(),
  suggestions: z.array(z.unknown()),
  model: z.string().nullable(),
  status: ContentSuggestionStatusSchema,
  selected_suggestion: z.number().nullable(),
  used_in_campaign_id: z.string().uuid().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
});
export type ContentSuggestion = z.infer<typeof ContentSuggestionSchema>;

// Marketing Stats
export const MarketingStatsSchema = z.object({
  total_subscribers: z.number(),
  active_subscribers: z.number(),
  total_campaigns: z.number(),
  sent_campaigns: z.number(),
  avg_open_rate: z.number(),
  avg_click_rate: z.number(),
  nps_score: z.number().nullable(),
  recent_nps_responses: z.number(),
});
export type MarketingStats = z.infer<typeof MarketingStatsSchema>;

// ============================================
// AGENT PLATFORM PHASE 4 SCHEMAS
// ============================================

// Capability Definitions
export const CapabilityDefinitionSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  created_at: z.string(),
});
export type CapabilityDefinition = z.infer<typeof CapabilityDefinitionSchema>;

// Agent Skills (junction table)
export const AgentSkillSchema = z.object({
  agent_id: z.string().uuid(),
  capability_name: z.string(),
  proficiency: z.number().min(0).max(100),
  granted_at: z.string(),
  granted_by: z.string().nullable(),
});
export type AgentSkill = z.infer<typeof AgentSkillSchema>;

// Agent Skill with capability details (for joins)
export const AgentSkillWithCapabilitySchema = AgentSkillSchema.extend({
  capability_definitions: CapabilityDefinitionSchema.nullable(),
});
export type AgentSkillWithCapability = z.infer<
  typeof AgentSkillWithCapabilitySchema
>;

// Event Types
export const EventTypeSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  schema: z.record(z.unknown()).nullable(),
  is_built_in: z.boolean(),
  created_at: z.string(),
});
export type EventType = z.infer<typeof EventTypeSchema>;

// Event Subscriptions
export const EventSubscriberTypeSchema = z.enum([
  "workflow",
  "agent",
  "webhook",
]);
export type EventSubscriberType = z.infer<typeof EventSubscriberTypeSchema>;

export const EventSubscriptionSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  subscriber_type: EventSubscriberTypeSchema,
  subscriber_id: z.string(),
  config: z.record(z.unknown()).nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EventSubscription = z.infer<typeof EventSubscriptionSchema>;

// Events
export const EventSourceTypeSchema = z.enum([
  "agent",
  "workflow",
  "system",
  "webhook",
  "user",
]);
export type EventSourceType = z.infer<typeof EventSourceTypeSchema>;

export const EventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  payload: z.record(z.unknown()),
  source_type: EventSourceTypeSchema,
  source_id: z.string().nullable(),
  correlation_id: z.string().nullable(),
  dispatched_to: z.array(z.record(z.unknown())).nullable(),
  created_at: z.string(),
});
export type Event = z.infer<typeof EventSchema>;

// Integration Actions
export const IntegrationActionSchema = z.object({
  id: z.string().uuid(),
  integration_id: z.string().uuid(),
  action_name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  parameter_schema: z.record(z.unknown()),
  default_config: z.record(z.unknown()),
  requires_auth: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type IntegrationAction = z.infer<typeof IntegrationActionSchema>;

// Step Templates
export const StepTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  step_type: z.enum([
    "agent_command",
    "wait",
    "condition",
    "integration_action",
  ]),
  config: z.record(z.unknown()),
  timeout_ms: z.number(),
  retries: z.number(),
  on_failure: z.enum(["continue", "stop", "skip"]),
  integration_action_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StepTemplate = z.infer<typeof StepTemplateSchema>;
