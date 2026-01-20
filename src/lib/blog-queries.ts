import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import {
  BlogPostSchema,
  parseResponse,
  parseArrayResponse,
  type BlogPost,
} from './schemas';

// Re-export types for consumers
export type {
  BlogPost,
};

// ============================================
// BLOG POSTS
// ============================================

export async function getBlogPosts(includeUnpublished = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (!includeUnpublished) {
    // Show published posts and scheduled posts whose time has passed
    const now = new Date().toISOString();
    query = query.or(`status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return parseArrayResponse(BlogPostSchema, data, 'getBlogPosts');
}

export async function getBlogPostBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(BlogPostSchema, data, 'getBlogPostBySlug');
}

export async function getBlogPostById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function createBlogPost(
  post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('blog_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function updateBlogPost(
  id: string,
  post: Partial<BlogPost>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('blog_posts')
    .update(post)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function deleteBlogPost(id: string, client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkDeleteBlogPosts(ids: string[], client: SupabaseClient = getSupabase()) {
  const { error } = await client
    .from('blog_posts')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUpdateBlogPostStatus(
  ids: string[],
  status: BlogPost['status'],
  client: SupabaseClient = supabase
) {
  const updateData: Partial<BlogPost> = { status };

  // If publishing, set published_at if not already set
  if (status === 'published') {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await client
    .from('blog_posts')
    .update(updateData)
    .in('id', ids);

  if (error) throw error;
}
