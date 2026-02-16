import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { handleQueryResult } from './errors';
import type {
  Prompt,
  PromptCreate,
  PromptUpdate,
  PromptQueryOptions,
} from './prompt-schemas';

// Re-export types
export type {
  Prompt,
  PromptCreate,
  PromptUpdate,
  PromptQueryOptions,
};

// ============================================
// PROMPTS
// ============================================

export async function getPrompts(
  options: PromptQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('prompts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.isFavorite) {
    query = query.eq('is_favorite', true);
  }

  if (options.isTemplate !== undefined) {
    query = query.eq('is_template', options.isTemplate);
  }

  if (options.isPublic !== undefined) {
    query = query.eq('is_public', options.isPublic);
  }

  if (options.model) {
    query = query.eq('model', options.model);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,content.ilike.%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getPrompts',
    returnFallback: true,
    fallback: [] as Prompt[],
  });
}

export async function getPromptById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('prompts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Prompt;
}

export async function getPromptBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('prompts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as Prompt;
}

export async function createPrompt(
  prompt: PromptCreate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('prompts')
    .insert(prompt)
    .select()
    .single();

  if (error) throw error;
  return data as Prompt;
}

export async function updatePrompt(
  id: string,
  updates: PromptUpdate,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('prompts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Prompt;
}

export async function deletePrompt(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('prompts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// UTILITIES
// ============================================

export async function togglePromptFavorite(
  id: string,
  isFavorite: boolean,
  client: SupabaseClient = getSupabase()
) {
  return updatePrompt(id, { is_favorite: isFavorite }, client);
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function renderPromptTemplate(
  content: string,
  variables: Record<string, string>
): string {
  let rendered = content;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}
