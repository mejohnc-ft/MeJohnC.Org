/* eslint-disable react-refresh/only-export-components */
import {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useSupabaseClient } from "./supabase";
import { getSiteContent } from "./supabase-queries";
import { captureException } from "./sentry";

// SEO Settings interface (matches Settings page)
interface SEOSettings {
  siteName: string;
  siteUrl: string;
  defaultDescription: string;
  ogImage: string;
  twitterHandle: string;
  linkedinUrl: string;
  githubUrl: string;
  location: { city: string; state: string; country: string };
}

// Default fallback values
const DEFAULT_SEO: SEOSettings = {
  siteName: import.meta.env.VITE_PLATFORM_NAME || "Business OS",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://businessos.app",
  defaultDescription:
    import.meta.env.VITE_SITE_DESCRIPTION ||
    "Your website and business tools in one platform.",
  ogImage: "/og-image.png",
  twitterHandle: import.meta.env.VITE_TWITTER_HANDLE || "",
  linkedinUrl: import.meta.env.VITE_LINKEDIN_URL || "",
  githubUrl: import.meta.env.VITE_GITHUB_URL || "",
  location: { city: "", state: "", country: "" },
};

// Global cache for SEO settings (avoids refetching on every page)
let cachedSEO: SEOSettings | null = null;
let cachePromise: Promise<SEOSettings> | null = null;

// Context for SEO settings
const SEOContext = createContext<SEOSettings>(DEFAULT_SEO);

export function SEOProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabaseClient();
  const [settings, setSettings] = useState<SEOSettings>(
    cachedSEO || DEFAULT_SEO,
  );

  useEffect(() => {
    async function loadSettings() {
      // Use cached if available
      if (cachedSEO) {
        setSettings(cachedSEO);
        return;
      }

      // Use existing promise if loading
      if (cachePromise) {
        const result = await cachePromise;
        setSettings(result);
        return;
      }

      // Fetch from database
      cachePromise = (async () => {
        try {
          const data = await getSiteContent("seo", supabase);
          if (data?.content) {
            const parsed = JSON.parse(data.content);
            const merged = { ...DEFAULT_SEO, ...parsed };
            cachedSEO = merged;
            return merged;
          }
        } catch (err) {
          captureException(
            err instanceof Error ? err : new Error(String(err)),
            { context: "SEO.loadSettings" },
          );
        }
        cachedSEO = DEFAULT_SEO;
        return DEFAULT_SEO;
      })();

      const result = await cachePromise;
      setSettings(result);
    }

    loadSettings();
  }, [supabase]);

  return <SEOContext.Provider value={settings}>{children}</SEOContext.Provider>;
}

export function useSEOSettings() {
  return useContext(SEOContext);
}

// Clear cache (call after saving settings)
export function clearSEOCache() {
  cachedSEO = null;
  cachePromise = null;
}

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noIndex?: boolean;
}

export function useSEO({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  noIndex = false,
}: SEOProps = {}) {
  const settings = useSEOSettings();

  const BASE_URL = settings.siteUrl;
  const DEFAULT_TITLE = `${settings.siteName} - AI Automation Engineer`;
  const DEFAULT_DESCRIPTION = settings.defaultDescription;
  const DEFAULT_IMAGE = settings.ogImage.startsWith("http")
    ? settings.ogImage
    : `${BASE_URL}${settings.ogImage}`;

  useEffect(() => {
    const fullTitle = title ? `${title} | ${settings.siteName}` : DEFAULT_TITLE;
    const fullDescription = description || DEFAULT_DESCRIPTION;
    const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
    const fullImage = image
      ? image.startsWith("http")
        ? image
        : `${BASE_URL}${image}`
      : DEFAULT_IMAGE;
    const authorName = author || settings.siteName;

    // Update document title
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (
      attribute: "name" | "property",
      key: string,
      content: string,
    ) => {
      let meta = document.querySelector(
        `meta[${attribute}="${key}"]`,
      ) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    setMeta("name", "description", fullDescription);
    if (noIndex) {
      setMeta("name", "robots", "noindex, nofollow");
    }

    // Open Graph tags
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", fullDescription);
    setMeta("property", "og:image", fullImage);
    setMeta("property", "og:url", fullUrl);
    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", settings.siteName);
    setMeta("property", "og:locale", "en_US");

    // Twitter Card tags
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", fullDescription);
    setMeta("name", "twitter:image", fullImage);
    if (settings.twitterHandle) {
      setMeta("name", "twitter:site", settings.twitterHandle);
      setMeta("name", "twitter:creator", settings.twitterHandle);
    }

    // Article-specific tags
    if (type === "article") {
      if (publishedTime) {
        setMeta("property", "article:published_time", publishedTime);
      }
      if (modifiedTime) {
        setMeta("property", "article:modified_time", modifiedTime);
      }
      if (authorName) {
        setMeta("property", "article:author", authorName);
      }
    }

    // Canonical URL
    let canonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = fullUrl;

    // Cleanup: reset to defaults when component unmounts
    return () => {
      document.title = DEFAULT_TITLE;
    };
    // BASE_URL, DEFAULT_TITLE, etc. are derived from settings, which is in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    description,
    image,
    url,
    type,
    publishedTime,
    modifiedTime,
    author,
    noIndex,
    settings,
  ]);
}

// JSON-LD structured data types
interface PersonSchema {
  type: "Person";
  name: string;
  jobTitle?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  email?: string;
  address?: {
    locality: string;
    region: string;
    country: string;
  };
}

interface ArticleSchema {
  type: "Article";
  headline: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  url?: string;
}

interface WebsiteSchema {
  type: "Website";
  name: string;
  url: string;
  description?: string;
}

interface BreadcrumbSchema {
  type: "BreadcrumbList";
  items: { name: string; url: string }[];
}

type SchemaData =
  | PersonSchema
  | ArticleSchema
  | WebsiteSchema
  | BreadcrumbSchema;

export function useJsonLd(schema: SchemaData | SchemaData[]) {
  const settings = useSEOSettings();
  const BASE_URL = settings.siteUrl;

  useEffect(() => {
    const schemas = Array.isArray(schema) ? schema : [schema];
    const scriptId = "json-ld-schema";

    // Remove existing script
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }

    const jsonLdData = schemas.map((s) => {
      switch (s.type) {
        case "Person":
          return {
            "@context": "https://schema.org",
            "@type": "Person",
            name: s.name,
            jobTitle: s.jobTitle,
            url: s.url || BASE_URL,
            image: s.image,
            sameAs: s.sameAs,
            email: s.email,
            address: s.address
              ? {
                  "@type": "PostalAddress",
                  addressLocality: s.address.locality,
                  addressRegion: s.address.region,
                  addressCountry: s.address.country,
                }
              : undefined,
          };

        case "Article":
          return {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: s.headline,
            description: s.description,
            image: s.image,
            datePublished: s.datePublished,
            dateModified: s.dateModified,
            author: {
              "@type": "Person",
              name: s.author || settings.siteName,
            },
            publisher: {
              "@type": "Person",
              name: settings.siteName,
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": s.url || BASE_URL,
            },
          };

        case "Website":
          return {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: s.name,
            url: s.url,
            description: s.description,
          };

        case "BreadcrumbList":
          return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: s.items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              item: item.url.startsWith("http")
                ? item.url
                : `${BASE_URL}${item.url}`,
            })),
          };
      }
    });

    // Create and insert script
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(
      jsonLdData.length === 1 ? jsonLdData[0] : jsonLdData,
    );
    document.head.appendChild(script);

    return () => {
      const toRemove = document.getElementById(scriptId);
      if (toRemove) {
        toRemove.remove();
      }
    };
    // BASE_URL is derived from settings, which is in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, settings]);
}

// Hook to get dynamic person schema from settings
export function usePersonSchema(): PersonSchema {
  const settings = useSEOSettings();

  const sameAs: string[] = [];
  if (settings.linkedinUrl) sameAs.push(settings.linkedinUrl);
  if (settings.githubUrl) sameAs.push(settings.githubUrl);
  if (settings.twitterHandle) {
    sameAs.push(
      `https://twitter.com/${settings.twitterHandle.replace("@", "")}`,
    );
  }

  return {
    type: "Person",
    name: settings.siteName,
    jobTitle: "AI Automation Engineer",
    url: settings.siteUrl,
    image: settings.ogImage.startsWith("http")
      ? settings.ogImage
      : `${settings.siteUrl}${settings.ogImage}`,
    sameAs,
    address: {
      locality: settings.location.city,
      region: settings.location.state,
      country: settings.location.country,
    },
  };
}

// Hook to get dynamic website schema from settings
export function useWebsiteSchema(): WebsiteSchema {
  const settings = useSEOSettings();

  return {
    type: "Website",
    name: settings.siteName,
    url: settings.siteUrl,
    description: settings.defaultDescription,
  };
}

// Legacy exports for backwards compatibility (static versions)
export const personSchema: PersonSchema = {
  type: "Person",
  name: DEFAULT_SEO.siteName,
  jobTitle: "AI Automation Engineer",
  url: DEFAULT_SEO.siteUrl,
  image: `${DEFAULT_SEO.siteUrl}${DEFAULT_SEO.ogImage}`,
  sameAs: [DEFAULT_SEO.linkedinUrl, DEFAULT_SEO.githubUrl].filter(Boolean),
  address: {
    locality: DEFAULT_SEO.location.city,
    region: DEFAULT_SEO.location.state,
    country: DEFAULT_SEO.location.country,
  },
};

export const websiteSchema: WebsiteSchema = {
  type: "Website",
  name: DEFAULT_SEO.siteName,
  url: DEFAULT_SEO.siteUrl,
  description: DEFAULT_SEO.defaultDescription,
};
