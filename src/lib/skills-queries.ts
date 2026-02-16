import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import type {
  Skill,
  SkillCreate,
  SkillUpdate,
  SkillQueryOptions,
} from './skills-schemas';

export type {
  Skill,
  SkillCreate,
  SkillUpdate,
  SkillQueryOptions,
};

// ============================================
// SKILLS
// ============================================

export async function getSkills(
  options: SkillQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('skills')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.type) {
    query = query.eq('type', options.type);
  }

  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,invocation.ilike.%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getSkills',
    returnFallback: true,
    fallback: [] as Skill[],
  });
}

export async function getSkillById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('skills')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Skill;
}

export async function createSkill(
  skill: SkillCreate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('skills')
    .insert(skill)
    .select()
    .single();

  if (error) throw error;
  return data as Skill;
}

export async function updateSkill(
  id: string,
  updates: SkillUpdate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('skills')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Skill;
}

export async function deleteSkill(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('skills')
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
