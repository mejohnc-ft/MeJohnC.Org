import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import {
  AppSuiteSchema,
  AppWithSuiteSchema,
  parseResponse,
  parseArrayResponse,
  type AppSuite,
  type App,
  type AppWithSuite,
} from './schemas';

// Re-export types for consumers
export type {
  AppSuite,
  App,
  AppWithSuite,
};

// ============================================
// APP SUITES
// ============================================

export async function getAppSuites(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('app_suites')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return parseArrayResponse(AppSuiteSchema, data, 'getAppSuites');
}

export async function getAppSuiteBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('app_suites')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(AppSuiteSchema, data, 'getAppSuiteBySlug');
}

export async function createAppSuite(
  suite: Omit<AppSuite, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('app_suites')
    .insert(suite)
    .select()
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function updateAppSuite(
  id: string,
  suite: Partial<AppSuite>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('app_suites')
    .update(suite)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function deleteAppSuite(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('app_suites')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// APPS
// ============================================

export async function getApps(includeUnpublished = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('apps')
    .select('*, suite:app_suites(*)')
    .order('order_index');

  if (!includeUnpublished) {
    // Show available, in_development, and planned apps (not archived)
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query;

  if (error) throw error;
  return parseArrayResponse(AppWithSuiteSchema, data, 'getApps');
}

export async function getAppsBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('apps')
    .select('*, suite:app_suites(*)')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(AppWithSuiteSchema, data, 'getAppsBySlug');
}

export async function getAppsBySuiteSlug(suiteSlug: string, client: SupabaseClient = getSupabase()) {
  const suite = await getAppSuiteBySlug(suiteSlug, client);

  const { data, error } = await client
    .from('apps')
    .select('*')
    .eq('suite_id', suite.id)
    .neq('status', 'archived')
    .order('order_index');

  if (error) throw error;
  return { suite, apps: data as App[] };
}

export async function getAppById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('apps')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as App;
}

export async function createApp(
  app: Omit<App, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('apps')
    .insert(app)
    .select()
    .single();

  if (error) throw error;
  return data as App;
}

export async function updateApp(
  id: string,
  app: Partial<App>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('apps')
    .update(app)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as App;
}

export async function deleteApp(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('apps')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkDeleteApps(ids: string[], client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('apps')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUpdateAppStatus(
  ids: string[],
  status: App['status'],
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('apps')
    .update({ status })
    .in('id', ids);

  if (error) throw error;
}
