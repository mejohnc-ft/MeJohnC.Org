import { z } from 'zod';

// ============================================
// RUNBOOKS SCHEMAS
// ============================================

export const RUNBOOK_CATEGORIES = ['deployment', 'troubleshooting', 'onboarding', 'security', 'maintenance', 'architecture', 'api', 'other'] as const;
export const RUNBOOK_TYPES = ['runbook', 'guide', 'reference', 'decision-record'] as const;
export const RUNBOOK_STATUSES = ['current', 'outdated', 'draft'] as const;
export const RUNBOOK_PRIORITIES = ['critical', 'high', 'normal', 'low'] as const;

export const RunbookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  content: z.string().nullable(),
  category: z.string(),
  type: z.string(),
  status: z.string(),
  priority: z.string(),
  related_skills: z.array(z.string()).nullable().transform(v => v ?? []),
  related_infra: z.array(z.string()).nullable().transform(v => v ?? []),
  tags: z.array(z.string()).nullable().transform(v => v ?? []),
  last_reviewed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Runbook = z.infer<typeof RunbookSchema>;

export type RunbookCreate = Omit<Runbook, 'id' | 'created_at' | 'updated_at'>;

export type RunbookUpdate = Partial<Omit<Runbook, 'id' | 'created_at'>>;

// ============================================
// QUERY OPTIONS
// ============================================

export interface RunbookQueryOptions {
  category?: string;
  type?: string;
  status?: string;
  priority?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
