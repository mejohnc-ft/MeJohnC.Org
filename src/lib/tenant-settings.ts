/**
 * Tenant settings types and parser.
 * Issue: #302
 */

export interface TenantBranding {
  name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  accent_color: string;
  dark_mode_default: boolean;
}

export interface TenantDomain {
  subdomain: string;
  custom_domain: string | null;
}

export interface TenantEmail {
  from_name: string;
  from_address: string;
}

export interface TenantSettings {
  branding: TenantBranding;
  enabled_apps: string[];
  dock_pinned: string[];
  domain: TenantDomain;
  email: TenantEmail;
  onboarding_complete: boolean;
  onboarding_step: number;
}

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  branding: {
    name: "",
    logo_url: "",
    favicon_url: "",
    primary_color: "#6366f1",
    accent_color: "#8b5cf6",
    dark_mode_default: true,
  },
  enabled_apps: ["dashboard", "settings", "profile"],
  dock_pinned: ["dashboard"],
  domain: {
    subdomain: "",
    custom_domain: null,
  },
  email: {
    from_name: "",
    from_address: "",
  },
  onboarding_complete: false,
  onboarding_step: 0,
};

function str<T>(value: unknown, fallback: T): T extends string ? string : T {
  return (typeof value === "string" ? value : fallback) as T extends string
    ? string
    : T;
}

function parseBranding(raw: Partial<TenantBranding>): TenantBranding {
  const d = DEFAULT_TENANT_SETTINGS.branding;
  return {
    name: str(raw.name, d.name),
    logo_url: str(raw.logo_url, d.logo_url),
    favicon_url: str(raw.favicon_url, d.favicon_url),
    primary_color: str(raw.primary_color, d.primary_color),
    accent_color: str(raw.accent_color, d.accent_color),
    dark_mode_default:
      typeof raw.dark_mode_default === "boolean"
        ? raw.dark_mode_default
        : d.dark_mode_default,
  };
}

function parseDomain(raw: Partial<TenantDomain>): TenantDomain {
  const d = DEFAULT_TENANT_SETTINGS.domain;
  return {
    subdomain: str(raw.subdomain, d.subdomain),
    custom_domain: str(raw.custom_domain, d.custom_domain),
  };
}

function parseEmail(raw: Partial<TenantEmail>): TenantEmail {
  const d = DEFAULT_TENANT_SETTINGS.email;
  return {
    from_name: str(raw.from_name, d.from_name),
    from_address: str(raw.from_address, d.from_address),
  };
}

export function parseTenantSettings(
  raw: Record<string, unknown> | null | undefined,
): TenantSettings {
  if (!raw) return { ...DEFAULT_TENANT_SETTINGS };

  return {
    branding: parseBranding((raw.branding as Partial<TenantBranding>) || {}),
    enabled_apps: Array.isArray(raw.enabled_apps)
      ? (raw.enabled_apps as string[])
      : DEFAULT_TENANT_SETTINGS.enabled_apps,
    dock_pinned: Array.isArray(raw.dock_pinned)
      ? (raw.dock_pinned as string[])
      : DEFAULT_TENANT_SETTINGS.dock_pinned,
    domain: parseDomain((raw.domain as Partial<TenantDomain>) || {}),
    email: parseEmail((raw.email as Partial<TenantEmail>) || {}),
    onboarding_complete:
      typeof raw.onboarding_complete === "boolean"
        ? raw.onboarding_complete
        : DEFAULT_TENANT_SETTINGS.onboarding_complete,
    onboarding_step:
      typeof raw.onboarding_step === "number"
        ? raw.onboarding_step
        : DEFAULT_TENANT_SETTINGS.onboarding_step,
  };
}
