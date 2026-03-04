import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createSupabaseClient } from "./supabase";
import { STORAGE_KEYS } from "./constants";
import {
  applyTenantTheme,
  clearTenantTheme,
  extractBranding,
} from "./tenant-theme";

// --- Types ---

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  is_active: boolean;
  settings: Record<string, unknown>;
}

type TenantStatus =
  | "loading"
  | "resolved"
  | "main_site"
  | "not_found"
  | "error";

interface TenantContextValue {
  tenant: Tenant | null;
  tenantId: string | null;
  status: TenantStatus;
  isMainSite: boolean;
  error: string | null;
  refreshTenant: () => void;
}

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "businessos.app";
const RESERVED_SUBDOMAINS = new Set(["www", "app", ""]);

// --- Context ---

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  tenantId: DEFAULT_TENANT_ID,
  status: "loading",
  isMainSite: true,
  error: null,
  refreshTenant: () => {},
});

// --- Slug extraction ---

export function extractSlugFromHostname(hostname: string): string | null {
  // Production: parse subdomain from hostname
  // e.g. "acme.mejohnc.org" → "acme"
  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const sub = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (!RESERVED_SUBDOMAINS.has(sub)) {
      return sub;
    }
    return null;
  }

  // Bare domain or non-matching hostname → no slug
  return null;
}

// --- Hostname resolution (supports custom domains) ---

type HostnameType = "slug" | "custom_domain" | "main_site";

interface ResolvedHostname {
  type: HostnameType;
  value: string | null;
}

export function resolveHostname(hostname: string): ResolvedHostname {
  const lower = hostname.toLowerCase();

  // Main site: bare domain, www, or localhost
  if (
    lower === BASE_DOMAIN ||
    lower === `www.${BASE_DOMAIN}` ||
    lower === "localhost" ||
    lower.startsWith("localhost:")
  ) {
    return { type: "main_site", value: null };
  }

  // Subdomain: *.{BASE_DOMAIN}
  if (lower.endsWith(`.${BASE_DOMAIN}`)) {
    const sub = lower.slice(0, -(BASE_DOMAIN.length + 1));
    if (!RESERVED_SUBDOMAINS.has(sub)) {
      return { type: "slug", value: sub };
    }
    return { type: "main_site", value: null };
  }

  // Everything else is a custom domain
  return { type: "custom_domain", value: lower };
}

function getDevSlug(): string | null {
  if (!import.meta.env.DEV) return null;

  // Check ?tenant= query param first
  const params = new URLSearchParams(window.location.search);
  const paramSlug = params.get("tenant");
  if (paramSlug) {
    // Persist to localStorage for subsequent page loads
    localStorage.setItem(STORAGE_KEYS.TENANT_DEV_OVERRIDE, paramSlug);
    return paramSlug;
  }

  // Fall back to localStorage
  return localStorage.getItem(STORAGE_KEYS.TENANT_DEV_OVERRIDE);
}

// --- Dev utilities ---

export function setDevTenantSlug(slug: string): void {
  localStorage.setItem(STORAGE_KEYS.TENANT_DEV_OVERRIDE, slug);
}

export function clearDevTenantSlug(): void {
  localStorage.removeItem(STORAGE_KEYS.TENANT_DEV_OVERRIDE);
}

// --- Provider ---

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [status, setStatus] = useState<TenantStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshTenant = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    // Dev override takes priority
    const devSlug = getDevSlug();
    if (devSlug) {
      // Dev mode: always resolve by slug
      const client = createSupabaseClient();
      if (!client) {
        setStatus("error");
        setError("Supabase not configured");
        return;
      }

      let cancelled = false;
      client
        .schema("app")
        .rpc("resolve_tenant_by_slug", { p_slug: devSlug })
        .then(({ data, error: rpcError }) => {
          if (cancelled) return;
          if (rpcError) {
            setStatus("error");
            setError(rpcError.message);
            return;
          }
          if (!data || (Array.isArray(data) && data.length === 0)) {
            setStatus("not_found");
            return;
          }
          const row = Array.isArray(data) ? data[0] : data;
          setTenant(row as Tenant);
          setStatus("resolved");
        });
      return () => {
        cancelled = true;
      };
    }

    // Production: resolve based on hostname type
    const resolved = resolveHostname(window.location.hostname);

    if (resolved.type === "main_site") {
      setStatus("main_site");
      setTenant(null);
      return;
    }

    let cancelled = false;
    const client = createSupabaseClient();

    if (!client) {
      setStatus("error");
      setError("Supabase not configured");
      return;
    }

    const rpcName =
      resolved.type === "slug"
        ? "resolve_tenant_by_slug"
        : "resolve_tenant_by_domain";
    const rpcParams =
      resolved.type === "slug"
        ? { p_slug: resolved.value }
        : { p_domain: resolved.value };

    client
      .schema("app")
      .rpc(rpcName, rpcParams)
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;

        if (rpcError) {
          setStatus("error");
          setError(rpcError.message);
          return;
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
          setStatus("not_found");
          return;
        }

        const row = Array.isArray(data) ? data[0] : data;
        setTenant(row as Tenant);
        setStatus("resolved");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Apply tenant branding when resolved, clear when unmounted
  useEffect(() => {
    if (status === "resolved" && tenant) {
      const branding = extractBranding(tenant.settings);
      if (branding) applyTenantTheme(branding);
    }
    return () => clearTenantTheme();
  }, [status, tenant]);

  const tenantId =
    status === "resolved"
      ? (tenant?.id ?? null)
      : status === "main_site"
        ? DEFAULT_TENANT_ID
        : null;

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId,
        status,
        isMainSite: status === "main_site",
        error,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

// --- Hook ---

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
