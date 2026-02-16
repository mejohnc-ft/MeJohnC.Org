import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import type {
  InfraNode,
  InfraNodeCreate,
  InfraNodeUpdate,
  InfraQueryOptions,
} from './infrastructure-schemas';

export type {
  InfraNode,
  InfraNodeCreate,
  InfraNodeUpdate,
  InfraQueryOptions,
};

// ============================================
// INFRASTRUCTURE NODES
// ============================================

export async function getInfraNodes(
  options: InfraQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('infrastructure_nodes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.type) {
    query = query.eq('type', options.type);
  }

  if (options.provider) {
    query = query.eq('provider', options.provider);
  }

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.environment) {
    query = query.eq('environment', options.environment);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getInfraNodes',
    returnFallback: true,
    fallback: [] as InfraNode[],
  });
}

export async function getInfraNodeById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('infrastructure_nodes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as InfraNode;
}

export async function createInfraNode(
  node: InfraNodeCreate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('infrastructure_nodes')
    .insert(node)
    .select()
    .single();

  if (error) throw error;
  return data as InfraNode;
}

export async function updateInfraNode(
  id: string,
  updates: InfraNodeUpdate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('infrastructure_nodes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as InfraNode;
}

export async function deleteInfraNode(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('infrastructure_nodes')
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
