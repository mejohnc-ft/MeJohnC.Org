import { z } from 'zod';

// ============================================
// INFRASTRUCTURE SCHEMAS
// ============================================

export const INFRA_TYPES = ['service', 'server', 'database', 'cdn', 'dns', 'domain', 'repository', 'ci-cd', 'monitoring'] as const;
export const INFRA_PROVIDERS = ['netlify', 'supabase', 'github', 'cloudflare', 'sentry', 'clerk', 'ghost', 'vercel', 'aws', 'other'] as const;
export const INFRA_STATUSES = ['active', 'degraded', 'inactive'] as const;
export const INFRA_ENVIRONMENTS = ['production', 'staging', 'development'] as const;

export const InfraNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  provider: z.string(),
  url: z.string().nullable(),
  status: z.string(),
  tier: z.string().nullable(),
  region: z.string().nullable(),
  config_notes: z.string().nullable(),
  environment: z.string(),
  connected_to: z.array(z.string()).nullable().transform(v => v ?? []),
  monthly_cost: z.union([z.number(), z.string()]).nullable().transform(v => v !== null ? Number(v) : null),
  tags: z.array(z.string()).nullable().transform(v => v ?? []),
  created_at: z.string(),
  updated_at: z.string(),
});
export type InfraNode = z.infer<typeof InfraNodeSchema>;

export type InfraNodeCreate = Omit<InfraNode, 'id' | 'created_at' | 'updated_at'>;

export type InfraNodeUpdate = Partial<Omit<InfraNode, 'id' | 'created_at'>>;

// ============================================
// QUERY OPTIONS
// ============================================

export interface InfraQueryOptions {
  type?: string;
  provider?: string;
  status?: string;
  environment?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
