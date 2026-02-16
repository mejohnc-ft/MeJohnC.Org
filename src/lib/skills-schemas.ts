import { z } from 'zod';

// ============================================
// SKILLS SCHEMAS
// ============================================

export const SKILL_TYPES = ['skill', 'agent', 'mcp-server', 'script', 'automation'] as const;
export const SKILL_CATEGORIES = ['development', 'deployment', 'testing', 'content', 'data', 'other'] as const;
export const SKILL_STATUSES = ['active', 'inactive', 'draft'] as const;

export const SkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  source: z.string().nullable(),
  invocation: z.string().nullable(),
  category: z.string(),
  dependencies: z.array(z.string()).nullable().transform(v => v ?? []),
  status: z.string(),
  tags: z.array(z.string()).nullable().transform(v => v ?? []),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Skill = z.infer<typeof SkillSchema>;

export type SkillCreate = Omit<Skill, 'id' | 'created_at' | 'updated_at'>;

export type SkillUpdate = Partial<Omit<Skill, 'id' | 'created_at'>>;

// ============================================
// QUERY OPTIONS
// ============================================

export interface SkillQueryOptions {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
