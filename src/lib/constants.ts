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
  '2xl': 1536,
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
export const STORAGE_BUCKET = 'mejohnc.org';

// Supabase error codes
export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
} as const;
