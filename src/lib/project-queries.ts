import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import {
  ProjectSchema,
  parseArrayResponse,
  type Project,
} from './schemas';

// Re-export types for consumers
export type {
  Project,
};

// ============================================
// PROJECTS
// ============================================

export async function getProjects(includeUnpublished = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('projects')
    .select('*')
    .order('order_index');

  if (!includeUnpublished) {
    // Show published projects and scheduled projects whose time has passed
    const now = new Date().toISOString();
    query = query.or(`status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return parseArrayResponse(ProjectSchema, data, 'getProjects');
}

export async function getProjectBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as Project;
}

export async function getProjectById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Project;
}

export async function createProject(
  project: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  id: string,
  project: Partial<Project>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('projects')
    .update(project)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkDeleteProjects(ids: string[], client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('projects')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUpdateProjectStatus(
  ids: string[],
  status: Project['status'],
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('projects')
    .update({ status })
    .in('id', ids);

  if (error) throw error;
}
