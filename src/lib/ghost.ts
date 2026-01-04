import GhostContentAPI from '@tryghost/content-api';
import { captureException } from './sentry';

const STORAGE_KEY = 'ghost_settings';

interface GhostSettings {
  url: string;
  contentApiKey: string;
}

// Get Ghost settings - env vars are primary, localStorage is optional override (dev only)
export function getGhostSettings(): GhostSettings | null {
  // Start with env variables
  const envSettings: GhostSettings = {
    url: import.meta.env.VITE_GHOST_URL || '',
    contentApiKey: import.meta.env.VITE_GHOST_CONTENT_API_KEY || '',
  };

  // Only allow localStorage override in development (security: prevents XSS credential injection)
  if (import.meta.env.DEV) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url?.trim() && parsed.contentApiKey?.trim()) {
          return {
            url: parsed.url.trim(),
            contentApiKey: parsed.contentApiKey.trim(),
          };
        }
      }
    } catch (e) {
      captureException(e instanceof Error ? e : new Error(String(e)), { context: 'Ghost.parseSettings' });
    }
  }

  // Return env settings if valid, otherwise null
  if (envSettings.url && envSettings.contentApiKey) {
    return envSettings;
  }

  return null;
}

// Save Ghost settings to localStorage (only if valid)
export function saveGhostSettings(settings: GhostSettings): void {
  const url = settings.url?.trim() || '';
  const contentApiKey = settings.contentApiKey?.trim() || '';

  if (url && contentApiKey) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, contentApiKey }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function createGhostClient() {
  const settings = getGhostSettings();

  if (!settings) {
    return null;
  }

  // Normalize URL
  let url = settings.url.trim();
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  url = url.replace(/\/$/, '');

  return new GhostContentAPI({
    url,
    key: settings.contentApiKey,
    version: 'v5.0'
  });
}

export type GhostPost = {
  id: string;
  uuid?: string;
  title: string;
  slug: string;
  html?: string;
  comment_id?: string;
  feature_image?: string | null;
  featured?: boolean;
  visibility?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
  custom_excerpt?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  custom_template?: string | null;
  canonical_url?: string | null;
  tags?: GhostTag[];
  primary_author?: GhostAuthor;
  primary_tag?: GhostTag;
  url?: string;
  excerpt?: string;
  reading_time?: number;
};

export type GhostTag = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  feature_image?: string | null;
  visibility?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  url?: string;
};

export type GhostAuthor = {
  id: string;
  name: string;
  slug: string;
  profile_image?: string | null;
  cover_image?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  url?: string;
};

export async function getGhostPosts(): Promise<GhostPost[]> {
  const ghost = createGhostClient();

  if (!ghost) {
    // No Ghost configured - return empty array
    return [];
  }

  return await ghost.posts
    .browse({
      limit: 'all',
      include: ['tags', 'authors'],
    })
    .catch((err) => {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Ghost.fetchPosts' });
      return [];
    });
}

export async function getGhostPostBySlug(slug: string): Promise<GhostPost | null> {
  const ghost = createGhostClient();

  if (!ghost) {
    return null;
  }

  return await ghost.posts
    .read(
      { slug },
      { include: ['tags', 'authors'] }
    )
    .catch((err) => {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Ghost.fetchPost' });
      return null;
    });
}

