import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { captureException } from './sentry';

const SUPABASE_SETTINGS_KEY = 'supabase_settings';

interface SupabaseSettings {
  url: string;
  anonKey: string;
}

// Get Supabase settings - env vars are primary, localStorage is optional override (dev only)
export function getSupabaseSettings(): SupabaseSettings {
  // Start with env variables (most stable for development)
  const envSettings: SupabaseSettings = {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };

  // Only allow localStorage override in development (security: prevents XSS credential hijacking)
  if (import.meta.env.DEV) {
    try {
      const saved = localStorage.getItem(SUPABASE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only use localStorage if BOTH values are non-empty strings
        if (parsed.url?.trim() && parsed.anonKey?.trim()) {
          return {
            url: parsed.url.trim(),
            anonKey: parsed.anonKey.trim(),
          };
        }
      }
    } catch (e) {
      captureException(e instanceof Error ? e : new Error(String(e)), { context: 'Supabase.parseSettings' });
    }
  }

  // Return env settings (could be empty if not configured)
  return envSettings;
}

// Save Supabase settings to localStorage (only if valid)
export function saveSupabaseSettings(settings: SupabaseSettings): void {
  const url = settings.url?.trim() || '';
  const anonKey = settings.anonKey?.trim() || '';

  // Only save if both values are present, otherwise clear
  if (url && anonKey) {
    localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify({ url, anonKey }));
  } else {
    // Clear localStorage override so env vars take precedence
    localStorage.removeItem(SUPABASE_SETTINGS_KEY);
  }
}

// Clear localStorage override (revert to env vars)
export function clearSupabaseSettings(): void {
  localStorage.removeItem(SUPABASE_SETTINGS_KEY);
}

// Get current settings
const settings = getSupabaseSettings();

// Internal client - may be null if not configured
const _supabase: SupabaseClient | null = settings.url && settings.anonKey
  ? createClient(settings.url, settings.anonKey)
  : null;

// Public client for unauthenticated reads
// Throws if not configured - use this when Supabase is required
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return _supabase;
}

// Legacy export for backwards compatibility - prefer getSupabase() for type safety
export const supabase: SupabaseClient | null = _supabase;

// Create a fresh client with current settings (call this after settings change)
export function createSupabaseClient(): SupabaseClient | null {
  const currentSettings = getSupabaseSettings();
  if (!currentSettings.url || !currentSettings.anonKey) {
    return null;
  }
  return createClient(currentSettings.url, currentSettings.anonKey);
}

// Hook to get a Supabase client (uses public anon client singleton)
// Returns null if Supabase is not configured - callers must handle this
export function useSupabaseClient(): SupabaseClient | null {
  // Return the singleton client - don't create new ones on every render
  if (!_supabase) {
    captureException(new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'), { context: 'Supabase.init' });
  }
  return _supabase;
}

// Function to create authenticated client (for use outside React components)
export async function createAuthenticatedClient(
  getToken: () => Promise<string | null>
): Promise<SupabaseClient | null> {
  const currentSettings = getSupabaseSettings();

  if (!currentSettings.url || !currentSettings.anonKey) {
    return null;
  }

  return createClient(currentSettings.url, currentSettings.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    accessToken: getToken,
  });
}
