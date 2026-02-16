import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import type {
  Runbook,
  RunbookCreate,
  RunbookUpdate,
  RunbookQueryOptions,
} from './runbooks-schemas';

export type {
  Runbook,
  RunbookCreate,
  RunbookUpdate,
  RunbookQueryOptions,
};

// ============================================
// RUNBOOKS
// ============================================

export async function getRunbooks(
  options: RunbookQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('runbooks')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.type) {
    query = query.eq('type', options.type);
  }

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.priority) {
    query = query.eq('priority', options.priority);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,content.ilike.%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getRunbooks',
    returnFallback: true,
    fallback: [] as Runbook[],
  });
}

export async function getRunbookById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('runbooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Runbook;
}

export async function createRunbook(
  runbook: RunbookCreate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('runbooks')
    .insert(runbook)
    .select()
    .single();

  if (error) throw error;
  return data as Runbook;
}

export async function updateRunbook(
  id: string,
  updates: RunbookUpdate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('runbooks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Runbook;
}

export async function deleteRunbook(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('runbooks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// UTILITIES
// ============================================

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function markAsReviewed(
  id: string,
  client: SupabaseClient = getSupabase()
) {
  return updateRunbook(id, { last_reviewed_at: new Date().toISOString() }, client);
}
