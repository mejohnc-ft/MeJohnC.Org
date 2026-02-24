/**
 * Runtime Theme Injection from Tenant Settings
 *
 * On app init (after tenant resolution), injects CSS custom properties
 * into :root based on the tenant's branding config. Zero per-tenant
 * rebuilds — everything is runtime-configurable.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/303
 */

import { hexToHslString } from "./color-utils";

export interface TenantBranding {
  /** Display name for the tenant (used in document title, etc.) */
  name?: string;
  /** HSL values for primary color, e.g. "25 95% 53%" */
  primary_color?: string;
  /** HSL values for accent color */
  accent_color?: string;
  /** HSL values for background */
  background_color?: string;
  /** HSL values for foreground */
  foreground_color?: string;
  /** URL of the favicon */
  favicon_url?: string;
  /** URL of the logo image */
  logo_url?: string;
  /** Border radius token, e.g. "0.5rem" */
  border_radius?: string;
  /** Font family name */
  font_family?: string;
}

/**
 * Apply tenant branding to the document by injecting CSS custom properties.
 * Only overrides values that are actually provided — missing keys
 * fall through to the theme defaults in index.css.
 */
export function applyTenantTheme(branding: TenantBranding): void {
  const root = document.documentElement;

  // Color overrides (HSL values without the hsl() wrapper).
  // Admin may store hex (#6366f1) — convert to HSL space-separated format.
  if (branding.primary_color) {
    const hsl = hexToHslString(branding.primary_color);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--accent", hsl);
    root.style.setProperty("--ring", hsl);
  }
  if (branding.accent_color) {
    root.style.setProperty("--accent", hexToHslString(branding.accent_color));
  }
  if (branding.background_color) {
    root.style.setProperty(
      "--background",
      hexToHslString(branding.background_color),
    );
  }
  if (branding.foreground_color) {
    root.style.setProperty(
      "--foreground",
      hexToHslString(branding.foreground_color),
    );
  }
  if (branding.border_radius) {
    root.style.setProperty("--radius", branding.border_radius);
  }

  // Font override
  if (branding.font_family) {
    root.style.setProperty("--font-sans", branding.font_family);
  }

  // Favicon
  if (branding.favicon_url) {
    const link =
      document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
      document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']");
    if (link) {
      link.href = branding.favicon_url;
    }
  }

  // Document title
  if (branding.name) {
    document.title = branding.name;
  }
}

/**
 * Remove all tenant theme overrides (revert to stylesheet defaults).
 */
export function clearTenantTheme(): void {
  const root = document.documentElement;
  const props = [
    "--primary",
    "--accent",
    "--ring",
    "--background",
    "--foreground",
    "--radius",
    "--font-sans",
  ];
  for (const prop of props) {
    root.style.removeProperty(prop);
  }
}

/**
 * Extract TenantBranding from a tenant's settings blob.
 */
export function extractBranding(
  settings: Record<string, unknown> | null | undefined,
): TenantBranding | null {
  if (!settings) return null;

  const branding = settings.branding;
  if (!branding || typeof branding !== "object") return null;

  return branding as TenantBranding;
}
