#!/usr/bin/env node
/**
 * Sitemap Generator
 * Generates sitemap.xml at build time with all static and dynamic routes.
 * Run with: node scripts/generate-sitemap.js
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://mejohnc.org';

// Static routes with their priorities and change frequencies
const staticRoutes = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/portfolio', priority: 0.9, changefreq: 'weekly' },
  { path: '/about', priority: 0.8, changefreq: 'monthly' },
  { path: '/projects/territories', priority: 0.7, changefreq: 'monthly' },
  { path: '/portfolio?tab=work', priority: 0.8, changefreq: 'weekly' },
  { path: '/portfolio?tab=projects', priority: 0.8, changefreq: 'weekly' },
  { path: '/portfolio?tab=software', priority: 0.8, changefreq: 'weekly' },
  { path: '/portfolio?tab=content', priority: 0.8, changefreq: 'daily' },
];

async function fetchDynamicRoutes() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('[Sitemap] No Supabase credentials - skipping dynamic routes');
    return { blogPosts: [], apps: [] };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Fetch published blog posts
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    // Fetch available apps
    const { data: apps } = await supabase
      .from('apps')
      .select('slug, updated_at')
      .eq('status', 'available');

    return {
      blogPosts: blogPosts || [],
      apps: apps || [],
    };
  } catch (error) {
    console.error('[Sitemap] Error fetching dynamic routes:', error);
    return { blogPosts: [], apps: [] };
  }
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function generateSitemapXml(routes) {
  const urlEntries = routes
    .map(
      (route) => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>${route.lastmod ? `\n    <lastmod>${route.lastmod}</lastmod>` : ''}
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

async function main() {
  console.log('[Sitemap] Generating sitemap.xml...');

  // Start with static routes
  const allRoutes = [...staticRoutes];

  // Fetch dynamic routes
  const { blogPosts, apps } = await fetchDynamicRoutes();

  // Add blog post routes
  for (const post of blogPosts) {
    allRoutes.push({
      path: `/blog/${post.slug}`,
      priority: 0.7,
      changefreq: 'monthly',
      lastmod: post.updated_at ? formatDate(post.updated_at) : undefined,
    });
  }

  // Add app routes
  for (const app of apps) {
    allRoutes.push({
      path: `/apps/${app.slug}`,
      priority: 0.6,
      changefreq: 'monthly',
      lastmod: app.updated_at ? formatDate(app.updated_at) : undefined,
    });
  }

  // Generate XML
  const sitemapXml = generateSitemapXml(allRoutes);

  // Write to public directory
  const outputPath = resolve(__dirname, '../public/sitemap.xml');
  writeFileSync(outputPath, sitemapXml, 'utf-8');

  console.log(`[Sitemap] Generated ${allRoutes.length} URLs`);
  console.log(`[Sitemap] Written to ${outputPath}`);
}

main().catch(console.error);
