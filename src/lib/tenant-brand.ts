/**
 * Tenant Brand Configuration
 *
 * Centralized access to tenant-specific branding, identity, and config.
 * For the main/platform site, returns env-var or sensible defaults.
 * For resolved tenants, reads from tenant.settings.
 *
 * Replaces all hardcoded "mejohnc" identity references.
 */

/** Branding values that vary per tenant */
export interface TenantBrand {
  name: string;
  siteUrl: string;
  fromEmail: string;
  storageBucket: string;
  corsOrigins: string[];
  githubOwner: string;
  githubRepo: string;
  userAgent: string;
}

/** Platform-level defaults (used for main site / fallback) */
const PLATFORM_DEFAULTS: TenantBrand = {
  name: import.meta.env.VITE_PLATFORM_NAME || "Business OS",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://businessos.app",
  fromEmail: import.meta.env.VITE_EMAIL_FROM || "noreply@businessos.app",
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET || "uploads",
  corsOrigins: (import.meta.env.VITE_CORS_ORIGINS || "")
    .split(",")
    .map((o: string) => o.trim())
    .filter(Boolean),
  githubOwner: import.meta.env.VITE_GITHUB_OWNER || "",
  githubRepo: import.meta.env.VITE_GITHUB_REPO || "",
  userAgent: `${import.meta.env.VITE_PLATFORM_NAME || "BusinessOS"} NewsBot/1.0`,
};

/**
 * Derive brand values from a resolved tenant's settings.
 * Falls back to platform defaults for any missing value.
 */
export function getTenantBrand(
  tenantSettings: Record<string, unknown> | null | undefined,
  tenantName?: string,
): TenantBrand {
  if (!tenantSettings) return PLATFORM_DEFAULTS;

  const branding = (tenantSettings.branding ?? {}) as Record<string, unknown>;
  const integrations = (tenantSettings.integrations ?? {}) as Record<
    string,
    unknown
  >;

  const name =
    (branding.name as string) || tenantName || PLATFORM_DEFAULTS.name;

  return {
    name,
    siteUrl: (branding.site_url as string) || PLATFORM_DEFAULTS.siteUrl,
    fromEmail: (branding.from_email as string) || PLATFORM_DEFAULTS.fromEmail,
    storageBucket: PLATFORM_DEFAULTS.storageBucket,
    corsOrigins:
      (branding.cors_origins as string[]) || PLATFORM_DEFAULTS.corsOrigins,
    githubOwner:
      (integrations.github_owner as string) || PLATFORM_DEFAULTS.githubOwner,
    githubRepo:
      (integrations.github_repo as string) || PLATFORM_DEFAULTS.githubRepo,
    userAgent: `${name} NewsBot/1.0`,
  };
}

/** Platform-level defaults export for non-React contexts */
export const platformBrand = PLATFORM_DEFAULTS;
