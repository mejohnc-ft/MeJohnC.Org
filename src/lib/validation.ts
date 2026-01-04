import { z } from 'zod';

// Common schemas
const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must be 100 characters or less')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

const urlSchema = z.string()
  .url('Must be a valid URL')
  .or(z.literal(''))
  .optional()
  .nullable();

const techStackSchema = z.array(z.string()).default([]);

// App validation
export const appSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  slug: slugSchema,
  tagline: z.string().max(200, 'Tagline must be 200 characters or less').optional().nullable(),
  description: z.string().optional().nullable(),
  icon_url: urlSchema,
  external_url: urlSchema,
  demo_url: urlSchema,
  tech_stack: techStackSchema,
  status: z.enum(['planned', 'in_development', 'available', 'archived']),
  order_index: z.number().int().default(0),
  suite_id: z.string().uuid().optional().nullable(),
  meta_title: z.string().max(60, 'Meta title must be 60 characters or less').optional().nullable(),
  meta_description: z.string().max(160, 'Meta description must be 160 characters or less').optional().nullable(),
  og_image: urlSchema,
});

export type AppInput = z.infer<typeof appSchema>;

// Blog post validation
export const blogPostSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  slug: slugSchema,
  excerpt: z.string().max(500, 'Excerpt must be 500 characters or less').optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  cover_image: urlSchema,
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().datetime().optional().nullable(),
  scheduled_for: z.string().datetime().optional().nullable(),
  reading_time: z.number().int().positive().optional().nullable(),
  meta_title: z.string().max(60, 'Meta title must be 60 characters or less').optional().nullable(),
  meta_description: z.string().max(160, 'Meta description must be 160 characters or less').optional().nullable(),
  og_image: urlSchema,
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

// Project validation
export const projectSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  slug: slugSchema,
  tagline: z.string().max(200, 'Tagline must be 200 characters or less').optional().nullable(),
  description: z.string().optional().nullable(),
  cover_image: urlSchema,
  external_url: urlSchema,
  tech_stack: techStackSchema,
  status: z.enum(['draft', 'published', 'scheduled']),
  scheduled_for: z.string().datetime().optional().nullable(),
  order_index: z.number().int().default(0),
  meta_title: z.string().max(60, 'Meta title must be 60 characters or less').optional().nullable(),
  meta_description: z.string().max(160, 'Meta description must be 160 characters or less').optional().nullable(),
  og_image: urlSchema,
});

export type ProjectInput = z.infer<typeof projectSchema>;

// App Suite validation
export const appSuiteSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  slug: slugSchema,
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  order_index: z.number().int().default(0),
});

export type AppSuiteInput = z.infer<typeof appSuiteSchema>;

// Contact link validation
export const contactLinkSchema = z.object({
  label: z.string()
    .min(1, 'Label is required')
    .max(50, 'Label must be 50 characters or less'),
  href: z.string().min(1, 'Link is required'),
  value: z.string().max(100, 'Value must be 100 characters or less').optional().nullable(),
  description: z.string().max(200, 'Description must be 200 characters or less').optional().nullable(),
  icon: z.string().default('email'),
  order_index: z.number().int().default(0),
});

export type ContactLinkInput = z.infer<typeof contactLinkSchema>;

// Work history validation
export const workHistorySchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  company: z.string()
    .min(1, 'Company is required')
    .max(100, 'Company must be 100 characters or less'),
  period: z.string()
    .min(1, 'Period is required')
    .max(50, 'Period must be 50 characters or less'),
  highlights: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
  order_index: z.number().int().default(0),
});

export type WorkHistoryInput = z.infer<typeof workHistorySchema>;

// Case study validation
export const caseStudySchema = z.object({
  metric: z.string()
    .min(1, 'Metric is required')
    .max(50, 'Metric must be 50 characters or less'),
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  before_content: z.string()
    .min(1, 'Before content is required'),
  after_content: z.string()
    .min(1, 'After content is required'),
  order_index: z.number().int().default(0),
});

export type CaseStudyInput = z.infer<typeof caseStudySchema>;

// Timeline validation
export const timelineSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  slug: slugSchema,
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  chart_type: z.enum(['growth', 'wave', 'steps', 'peak']).default('growth'),
});

export type TimelineInput = z.infer<typeof timelineSchema>;

// Timeline entry validation
export const timelineEntrySchema = z.object({
  timeline_id: z.string().uuid('Invalid timeline ID'),
  label: z.string()
    .min(1, 'Label is required')
    .max(50, 'Label must be 50 characters or less'),
  phase: z.string().max(50, 'Phase must be 50 characters or less').optional().nullable(),
  summary: z.string().max(200, 'Summary must be 200 characters or less').optional().nullable(),
  content: z.string().optional().nullable(),
  dot_position: z.number().min(0).max(100).default(50),
  order_index: z.number().int().default(0),
});

export type TimelineEntryInput = z.infer<typeof timelineEntrySchema>;

// Helper function to validate and return errors
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return { success: false, errors };
}

// Helper to get first error message
export function getFirstError(errors: Record<string, string>): string {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : 'Validation failed';
}
