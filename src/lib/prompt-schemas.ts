import { z } from 'zod';

// ============================================
// PROMPT SCHEMAS
// ============================================

// Variable schema for template prompts
export const PromptVariableSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  default_value: z.string().optional(),
});
export type PromptVariable = z.infer<typeof PromptVariableSchema>;

// Main Prompt schema
export const PromptSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()).nullable().transform(v => v ?? []),
  model: z.string().nullable(),
  variables: z.array(PromptVariableSchema).nullable().transform(v => v ?? []),
  is_template: z.boolean(),
  is_favorite: z.boolean(),
  is_public: z.boolean(),
  use_count: z.number(),
  last_used_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Prompt = z.infer<typeof PromptSchema>;

// Prompt for creation (without auto-generated fields)
export type PromptCreate = Omit<Prompt, 'id' | 'created_at' | 'updated_at' | 'use_count' | 'last_used_at'>;

// Prompt for updates (all fields optional except what's needed)
export type PromptUpdate = Partial<Omit<Prompt, 'id' | 'created_at'>>;

// ============================================
// QUERY OPTIONS
// ============================================

export interface PromptQueryOptions {
  category?: string;
  tags?: string[];
  isFavorite?: boolean;
  isTemplate?: boolean;
  isPublic?: boolean;
  search?: string;
  model?: string;
  limit?: number;
  offset?: number;
}
