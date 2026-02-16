import { z } from 'zod';

// ============================================
// CONFIGS SCHEMAS
// ============================================

export const CONFIG_TYPES = ['file', 'snippet', 'setting', 'template'] as const;
export const CONFIG_FORMATS = ['json', 'yaml', 'toml', 'javascript', 'typescript', 'markdown', 'text', 'env'] as const;
export const CONFIG_CATEGORIES = ['build', 'lint', 'deploy', 'auth', 'database', 'styling', 'testing', 'other'] as const;

export const ConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  source_path: z.string().nullable(),
  content: z.string().nullable(),
  format: z.string(),
  category: z.string(),
  version: z.string().nullable(),
  is_active: z.boolean(),
  tags: z.array(z.string()).nullable().transform(v => v ?? []),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Config = z.infer<typeof ConfigSchema>;

export type ConfigCreate = Omit<Config, 'id' | 'created_at' | 'updated_at'>;

export type ConfigUpdate = Partial<Omit<Config, 'id' | 'created_at'>>;

// ============================================
// QUERY OPTIONS
// ============================================

export interface ConfigQueryOptions {
  type?: string;
  format?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
