import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import type {
  Config,
  ConfigCreate,
  ConfigUpdate,
  ConfigQueryOptions,
} from './configs-schemas';

export type {
  Config,
  ConfigCreate,
  ConfigUpdate,
  ConfigQueryOptions,
};

// ============================================
// CONFIGS
// ============================================

export async function getConfigs(
  options: ConfigQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('configs')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.type) {
    query = query.eq('type', options.type);
  }

  if (options.format) {
    query = query.eq('format', options.format);
  }

  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.isActive !== undefined) {
    query = query.eq('is_active', options.isActive);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,source_path.ilike.%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getConfigs',
    returnFallback: true,
    fallback: [] as Config[],
  });
}

export async function getConfigById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Config;
}

export async function createConfig(
  config: ConfigCreate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('configs')
    .insert(config)
    .select()
    .single();

  if (error) throw error;
  return data as Config;
}

export async function updateConfig(
  id: string,
  updates: ConfigUpdate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('configs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Config;
}

export async function deleteConfig(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// UTILITIES
// ============================================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
