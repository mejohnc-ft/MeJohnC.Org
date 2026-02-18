import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createSupabaseClient } from "./supabase";
import { STORAGE_KEYS } from "./constants";

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
}

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "mejohnc.org";
const RESERVED_SUBDOMAINS = new Set(["www", "app", ""]);

// --- Context ---

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  tenantId: DEFAULT_TENANT_ID,
  status: "loading",
  isMainSite: true,
  error: null,
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

  useEffect(() => {
    // Determine slug: dev override takes priority, then hostname
    const slug =
      getDevSlug() ?? extractSlugFromHostname(window.location.hostname);

    // No slug → this is the main site
    if (!slug) {
      setStatus("main_site");
      setTenant(null);
      return;
    }

    // Resolve tenant via RPC
    let cancelled = false;
    const client = createSupabaseClient();

    if (!client) {
      setStatus("error");
      setError("Supabase not configured");
      return;
    }

    client
      .rpc("resolve_tenant_by_slug", { p_slug: slug })
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
  }, []);

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
