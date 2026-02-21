// Time constants (in milliseconds)
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Responsive breakpoints (in pixels)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// File upload limits
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_FILE_SIZE_MB = 5;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_AUDIT_LOG_LIMIT = 20;

// Timeouts
export const WEB_VITALS_TIMEOUT_MS = 10000;
export const ANIMATION_STAGGER_DELAY = 0.05;

// Animation values
export const ANIMATION = {
  hoverLift: -4,
  hoverScale: 1.02,
  fadeInY: 20,
  slideOutX: -256,
  staggerDelay: 0.05,
} as const;

// Storage
export const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || "uploads";

// localStorage keys (centralized to avoid magic strings)
export const STORAGE_KEYS = {
  SUPABASE_SETTINGS: "supabase_settings",
  ANALYTICS_SETTINGS: "analytics_settings",
  GHOST_SETTINGS: "ghost_settings",
  THEME: "resume-site-theme",
  PWA_DISMISSED: "pwa-dismissed",
  ANALYTICS_CONSENT: "analytics_consent",
  SIDEBAR_COLLAPSED: "admin-sidebar-collapsed",
  SIDEBAR_SECTIONS: "admin-sidebar-sections",
  DESKTOP_MODE: "admin-desktop-mode",
  TENANT_DEV_OVERRIDE: "dev_tenant_slug",
} as const;

// Supabase/PostgreSQL error codes
export const SUPABASE_ERROR_CODES = {
  // PostgREST errors
  NOT_FOUND: "PGRST116",
  // PostgreSQL errors
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
  // Auth errors
  INVALID_CREDENTIALS: "invalid_credentials",
  JWT_EXPIRED: "jwt_expired",
} as const;
