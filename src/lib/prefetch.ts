import {
  getApps,
  getAppSuites,
  getProjects,
  getSiteContent,
  getBlogPosts,
} from "./supabase-queries";
import { captureException } from "./sentry";

// Cache for prefetched data
const prefetchCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type PrefetchKey = "projects" | "software" | "content";

// Check if cached data is still valid
function isCacheValid(key: string): boolean {
  const cached = prefetchCache.get(key);
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL;
}

// Prefetch functions for each tab
const prefetchFunctions: Record<PrefetchKey, () => Promise<void>> = {
  projects: async () => {
    if (isCacheValid("projects")) return;
    try {
      const [projectsData, contentData] = await Promise.all([
        getProjects(),
        getSiteContent("projects"),
      ]);
      prefetchCache.set("projects", {
        data: { projects: projectsData, content: contentData },
        timestamp: Date.now(),
      });
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "prefetch.projects",
      });
    }
  },

  software: async () => {
    if (isCacheValid("software")) return;
    try {
      const [appsData, suitesData] = await Promise.all([
        getApps(),
        getAppSuites(),
      ]);
      prefetchCache.set("software", {
        data: { apps: appsData, suites: suitesData },
        timestamp: Date.now(),
      });
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "prefetch.software",
      });
    }
  },

  content: async () => {
    if (isCacheValid("content")) return;
    try {
      const localPosts = await getBlogPosts(false);
      prefetchCache.set("content", {
        data: { localPosts },
        timestamp: Date.now(),
      });
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "prefetch.content",
      });
    }
  },
};

// Prefetch data for a specific tab
export function prefetchTabData(tabKey: PrefetchKey): void {
  const prefetchFn = prefetchFunctions[tabKey];
  if (prefetchFn) {
    prefetchFn();
  }
}
