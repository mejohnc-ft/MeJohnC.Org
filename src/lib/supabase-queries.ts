import { supabase } from './supabase';

// Types
export interface AppSuite {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface App {
  id: string;
  suite_id: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  external_url: string | null;
  demo_url: string | null;
  tech_stack: string[] | null;
  status: 'draft' | 'published' | 'archived';
  order_index: number;
  created_at: string;
  updated_at: string;
  suite?: AppSuite;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  tags: string[] | null;
  status: 'draft' | 'published';
  published_at: string | null;
  reading_time: number | null;
  created_at: string;
  updated_at: string;
}

// App Suites
export async function getAppSuites() {
  const { data, error } = await supabase
    .from('app_suites')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return data as AppSuite[];
}

export async function getAppSuiteBySlug(slug: string) {
  const { data, error } = await supabase
    .from('app_suites')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function createAppSuite(suite: Omit<AppSuite, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('app_suites')
    .insert(suite)
    .select()
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function updateAppSuite(id: string, suite: Partial<AppSuite>) {
  const { data, error } = await supabase
    .from('app_suites')
    .update(suite)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AppSuite;
}

export async function deleteAppSuite(id: string) {
  const { error } = await supabase
    .from('app_suites')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Apps
export async function getApps(includeUnpublished = false) {
  let query = supabase
    .from('apps')
    .select('*, suite:app_suites(*)')
    .order('order_index');

  if (!includeUnpublished) {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as (App & { suite: AppSuite | null })[];
}

export async function getAppsBySlug(slug: string) {
  const { data, error } = await supabase
    .from('apps')
    .select('*, suite:app_suites(*)')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as App & { suite: AppSuite | null };
}

export async function getAppsBySuiteSlug(suiteSlug: string) {
  const suite = await getAppSuiteBySlug(suiteSlug);

  const { data, error } = await supabase
    .from('apps')
    .select('*')
    .eq('suite_id', suite.id)
    .eq('status', 'published')
    .order('order_index');

  if (error) throw error;
  return { suite, apps: data as App[] };
}

export async function createApp(app: Omit<App, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('apps')
    .insert(app)
    .select()
    .single();

  if (error) throw error;
  return data as App;
}

export async function updateApp(id: string, app: Partial<App>) {
  const { data, error } = await supabase
    .from('apps')
    .update(app)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as App;
}

export async function deleteApp(id: string) {
  const { error } = await supabase
    .from('apps')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Blog Posts
export async function getBlogPosts(includeUnpublished = false) {
  let query = supabase
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (!includeUnpublished) {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as BlogPost[];
}

export async function getBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function getBlogPostById(id: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function createBlogPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function updateBlogPost(id: string, post: Partial<BlogPost>) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update(post)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Re-export from markdown.ts to avoid duplication
export { calculateReadingTime } from './markdown';

// Helper: Generate slug from text
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Storage helpers
const STORAGE_BUCKET = 'mejohnc.org';

export async function uploadFile(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteFile(path: string) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) throw error;
}
