/**
 * Supabase Queries - Barrel Export File
 *
 * This file re-exports all query functions from domain-specific modules
 * for backward compatibility. New code should import directly from the
 * domain-specific files (e.g., '@/lib/news-queries', '@/lib/task-queries').
 *
 * Domain-specific query files:
 * - news-queries.ts: News categories, sources, articles, filters, dashboard tabs
 * - agent-queries.ts: Agent commands, responses, tasks, sessions, config
 * - app-queries.ts: App suites and apps
 * - blog-queries.ts: Blog posts
 * - project-queries.ts: Projects
 * - site-content-queries.ts: Site content, contact links, work history, case studies, timelines
 * - task-queries.ts: Tasks, categories, comments, reminders
 * - crm-queries.ts: Contacts, deals, pipelines, interactions
 * - bookmark-queries.ts: Bookmarks, collections, import jobs
 * - marketing-queries.ts: Email subscribers, campaigns, NPS surveys
 * - site-builder-queries.ts: Site builder pages, components, templates
 * - metrics-queries.ts: Metrics sources, dashboards, widgets
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { STORAGE_BUCKET } from "./constants";

// ============================================
// RE-EXPORTS FROM DOMAIN-SPECIFIC MODULES
// ============================================

// News domain
export * from "./news-queries";

// Agent domain
export * from "./agent-queries";

// App domain
export * from "./app-queries";

// Blog domain
export * from "./blog-queries";

// Project domain
export * from "./project-queries";

// Site content domain (Site Content, Contact Links, Work History, Case Studies, Timelines)
export * from "./site-content-queries";

// Re-export from markdown.ts to avoid duplication
export { calculateReadingTime } from "./markdown";

// ============================================
// SHARED UTILITIES
// ============================================

// Helper: Generate slug from text
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Storage helpers

/**
 * Build a tenant-prefixed storage path.
 * If tenantId is provided, the path becomes `{tenantId}/{path}`.
 * This isolates tenant uploads within a shared bucket.
 */
function tenantPath(path: string, tenantId?: string | null): string {
  if (!tenantId) return path;
  // Avoid double-prefixing
  if (path.startsWith(`${tenantId}/`)) return path;
  return `${tenantId}/${path}`;
}

export async function uploadFile(
  file: File,
  path: string,
  client: SupabaseClient = getSupabase(),
  tenantId?: string | null,
) {
  const fullPath = tenantPath(path, tenantId);
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(fullPath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = client.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteFile(
  path: string,
  client: SupabaseClient = getSupabase(),
  tenantId?: string | null,
) {
  const fullPath = tenantPath(path, tenantId);
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .remove([fullPath]);

  if (error) throw error;
}
