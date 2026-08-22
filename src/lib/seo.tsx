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
import { toError } from "./errors";

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
  siteName: import.meta.env.VITE_PLATFORM_NAME || "MeJohnC",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://mejohnc.org",
  defaultDescription:
    import.meta.env.VITE_SITE_DESCRIPTION ||
    "Jonathan Christensen is an AI Automation Engineer in San Diego building governed agents, evidence-preserving IT workflows, and lab-ready systems for production environments.",
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
          captureException(toError(err), { context: "SEO.loadSettings" });
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
  keywords?: string;
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
  keywords,
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
    setMeta("name", "author", authorName);
    if (keywords) {
      setMeta("name", "keywords", keywords);
    }
    if (noIndex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      setMeta("name", "robots", "index, follow, max-image-preview:large");
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
    keywords,
    settings,
  ]);
}

// JSON-LD structured data types
export const PERSON_KNOWS_ABOUT = [
  "AI automation",
  "Governed agents",
  "IT operations",
  "Endpoint logistics",
  "Microsoft 365",
  "Azure",
  "IT laboratory systems",
] as const;

export const RECRUITING_KEYWORDS =
  "AI automation engineer, governed agents, IT operations, lab IT, Microsoft 365, Azure, endpoint provisioning, centrexIT";

interface PersonSchema {
  type: "Person";
  name: string;
  jobTitle?: string;
  description?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  email?: string;
  knowsAbout?: string[];
  worksFor?: string;
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

interface CreativeWorkSchema {
  type: "CreativeWork";
  name: string;
  description?: string;
  url?: string;
  creator?: string;
  keywords?: string[];
}

interface OccupationSchema {
  type: "Occupation";
  name: string;
  description?: string;
  occupationalCategory?: string;
}

interface FAQSchema {
  type: "FAQPage";
  questions: { question: string; answer: string }[];
}

type SchemaData =
  | PersonSchema
  | ArticleSchema
  | WebsiteSchema
  | BreadcrumbSchema
  | CreativeWorkSchema
  | OccupationSchema
  | FAQSchema;

export function buildPersonJsonLd(
  person: PersonSchema,
  baseUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    jobTitle: person.jobTitle,
    description: person.description,
    url: person.url || baseUrl,
    image: person.image,
    sameAs: person.sameAs,
    email: person.email,
    knowsAbout: person.knowsAbout,
    worksFor: person.worksFor
      ? { "@type": "Organization", name: person.worksFor }
      : undefined,
    address: person.address
      ? {
          "@type": "PostalAddress",
          addressLocality: person.address.locality,
          addressRegion: person.address.region,
          addressCountry: person.address.country,
        }
      : undefined,
  };
}

export function buildWebsiteJsonLd(
  site: WebsiteSchema,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: "en-US",
  };
}

export function buildCreativeWorkJsonLd(
  work: CreativeWorkSchema,
  baseUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: work.name,
    description: work.description,
    url: work.url
      ? work.url.startsWith("http")
        ? work.url
        : `${baseUrl}${work.url}`
      : baseUrl,
    creator: {
      "@type": "Person",
      name: work.creator || "Jonathan Christensen",
    },
    keywords: work.keywords,
  };
}

export function buildOccupationJsonLd(
  occupation: OccupationSchema,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Occupation",
    name: occupation.name,
    description: occupation.description,
    occupationalCategory: occupation.occupationalCategory,
  };
}

export function buildFaqJsonLd(faq: FAQSchema): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function useJsonLd(schema: SchemaData | SchemaData[]) {
  const settings = useSEOSettings();
  const BASE_URL = settings.siteUrl;

  useEffect(() => {
    const schemas = Array.isArray(schema) ? schema : [schema];
    const scriptId = "json-ld-schema";

    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }

    const jsonLdData = schemas.map((s) => {
      switch (s.type) {
        case "Person":
          return buildPersonJsonLd(s, BASE_URL);

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
          return buildWebsiteJsonLd(s);

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

        case "CreativeWork":
          return buildCreativeWorkJsonLd(s, BASE_URL);

        case "Occupation":
          return buildOccupationJsonLd(s);

        case "FAQPage":
          return buildFaqJsonLd(s);
      }
    });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, settings]);
}

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
    description: settings.defaultDescription,
    url: settings.siteUrl,
    image: settings.ogImage.startsWith("http")
      ? settings.ogImage
      : `${settings.siteUrl}${settings.ogImage}`,
    sameAs,
    knowsAbout: [...PERSON_KNOWS_ABOUT],
    worksFor: "centrexIT",
    address: {
      locality: settings.location.city || "San Diego",
      region: settings.location.state || "CA",
      country: settings.location.country || "US",
    },
  };
}

export function useWebsiteSchema(): WebsiteSchema {
  const settings = useSEOSettings();

  return {
    type: "Website",
    name: settings.siteName,
    url: settings.siteUrl,
    description: settings.defaultDescription,
  };
}

const PERSON_DESCRIPTION =
  "AI Automation Engineer building governed agents, evidence-preserving IT workflows, and endpoint logistics systems. Background in Azure, Intune, and Microsoft 365 at scale.";

export const personSchema: PersonSchema = {
  type: "Person",
  name: "Jonathan Christensen",
  jobTitle: "AI Automation Engineer",
  description: PERSON_DESCRIPTION,
  url: DEFAULT_SEO.siteUrl,
  image: `${DEFAULT_SEO.siteUrl}${DEFAULT_SEO.ogImage}`,
  sameAs: [DEFAULT_SEO.linkedinUrl, DEFAULT_SEO.githubUrl].filter(Boolean),
  knowsAbout: [...PERSON_KNOWS_ABOUT],
  worksFor: "centrexIT",
  address: {
    locality: DEFAULT_SEO.location.city || "San Diego",
    region: DEFAULT_SEO.location.state || "CA",
    country: DEFAULT_SEO.location.country || "US",
  },
};

export const websiteSchema: WebsiteSchema = {
  type: "Website",
  name: DEFAULT_SEO.siteName,
  url: DEFAULT_SEO.siteUrl,
  description: DEFAULT_SEO.defaultDescription,
};

export const occupationSchema: OccupationSchema = {
  type: "Occupation",
  name: "AI Automation Engineer",
  description:
    "Designs governed AI products for IT operations and lab-ready IT systems. Agents advise and draft; humans retain merge, deploy, and production authority.",
  occupationalCategory: "15-1252.00",
};

export const softwareSchema: CreativeWorkSchema = {
  type: "CreativeWork",
  name: "AI products John Christensen led or shipped",
  description:
    "Governed AI for the Enterprise work I ship: evidence-preserving client reviews, technician assistance, a company-grounded assistant, and draft-mode delivery. Substantial products today; not yet one uniformly integrated platform. accessAI is pre-GA as a universal control plane.",
  url: "/portfolio?track=ai-products",
  creator: "Jonathan Christensen",
  keywords: [
    "Client Toolbox",
    "Iris",
    "Proxima",
    "accessAI",
    "Service Desk Toolbox",
    "governed agents",
  ],
};

export const aboutFaqSchema: FAQSchema = {
  type: "FAQPage",
  questions: [
    {
      question: "What does Jonathan Christensen work on?",
      answer:
        "AI automation with a focus on agentic systems, agent management planes, and production workflows that survive cost, latency, and eval scrutiny. Background in enterprise IT — Azure, Intune, and Microsoft 365 at scale — applied to governed AI products at centrexIT.",
    },
    {
      question: "Are the centrexIT AI products a single integrated platform?",
      answer:
        "No. They are a developing set of substantial products John led or shipped — client reviews, technician assistance, a company-grounded assistant, draft-mode delivery, and a pre-GA control plane. accessAI is not yet a universal control plane, and the portfolio is not yet one uniformly integrated platform.",
    },
    {
      question: "Where is Jonathan based?",
      answer:
        "San Diego, California. Open to AI automation, governed-agent, lab, and IT roles that value evidence-preserving systems over chatbot demos.",
    },
  ],
};
