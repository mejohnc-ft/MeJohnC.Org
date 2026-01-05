import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { useMemo, useCallback } from 'react';
import { captureException } from './sentry';
import { STORAGE_KEYS } from './constants';

interface SupabaseSettings {
  url: string;
  anonKey: string;
}

/**
 * Supabase Configuration Strategy
 *
 * This module supports two sources of Supabase credentials:
 *
 * 1. **Environment Variables (Primary)**
 *    - VITE_SUPABASE_URL: The Supabase project URL
 *    - VITE_SUPABASE_ANON_KEY: The anonymous/public API key
 *    - These are set in .env files or CI/CD secrets
 *    - Used in production and as the default in development
 *
 * 2. **localStorage Override (Development Only)**
 *    - Key: 'supabase_settings' (JSON with url and anonKey)
 *    - ONLY available when import.meta.env.DEV is true
 *    - Disabled in production builds for security (prevents XSS credential hijacking)
 *    - Useful for testing against different Supabase projects without changing env files
 *
 * Usage (in browser console during development):
 *   localStorage.setItem('supabase_settings', JSON.stringify({
 *     url: 'https://your-project.supabase.co',
 *     anonKey: 'your-anon-key'
 *   }));
 *   // Then refresh the page
 *
 * To clear the override and revert to env vars:
 *   localStorage.removeItem('supabase_settings');
 *   // Or call: import('./supabase').then(m => m.clearSupabaseSettings())
 */

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
      const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_SETTINGS);
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
// Note: Caller should refresh the page or call refreshSupabaseClient() to use new settings
export function saveSupabaseSettings(settings: SupabaseSettings): void {
  const url = settings.url?.trim() || '';
  const anonKey = settings.anonKey?.trim() || '';

  // Only save if both values are present, otherwise clear
  if (url && anonKey) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_SETTINGS, JSON.stringify({ url, anonKey }));
  } else {
    // Clear localStorage override so env vars take precedence
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_SETTINGS);
  }
}

// Clear localStorage override (revert to env vars)
export function clearSupabaseSettings(): void {
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_SETTINGS);
}

// Internal mutable singleton - can be refreshed when settings change
let _supabase: SupabaseClient | null = null;
let _lastSettingsHash: string = '';

// Initialize singleton from current settings
function initializeClient(): void {
  const settings = getSupabaseSettings();
  const settingsHash = `${settings.url}:${settings.anonKey}`;

  // Only recreate if settings actually changed
  if (settingsHash === _lastSettingsHash && _supabase) {
    return;
  }

  _lastSettingsHash = settingsHash;
  _supabase = settings.url && settings.anonKey
    ? createClient(settings.url, settings.anonKey)
    : null;
}

// Initialize on module load
initializeClient();

// Refresh the singleton client (call after settings change)
export function refreshSupabaseClient(): SupabaseClient | null {
  initializeClient();
  return _supabase;
}

// Public client for unauthenticated reads
// Throws if not configured - use this when Supabase is required
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return _supabase;
}

// Legacy export for backwards compatibility - prefer getSupabase() for type safety
// Note: This is a getter that returns the current singleton value
export const supabase: SupabaseClient | null = _supabase;

// Create a fresh client with current settings (does not update singleton)
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

/**
 * Hook to get an authenticated Supabase client for admin operations.
 * Uses Clerk's JWT token (with 'supabase' template) to authenticate with Supabase RLS.
 *
 * IMPORTANT: You must create a JWT template called "supabase" in your Clerk dashboard
 * that includes the user's email in the payload. The template should output:
 * {
 *   "email": "{{user.primary_email_address}}"
 * }
 *
 * @returns Object with supabase client and loading state
 */
export function useAuthenticatedSupabase(): {
  supabase: SupabaseClient | null;
  isLoading: boolean;
} {
  const { session, isLoaded } = useSession();
  const settings = getSupabaseSettings();

  // Create a stable getToken function that returns Clerk's JWT for Supabase
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!session) return null;
    try {
      // Get JWT with 'supabase' template from Clerk
      // This template should include the user's email for RLS checks
      const token = await session.getToken({ template: 'supabase' });
      return token;
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: 'useAuthenticatedSupabase.getToken',
      });
      return null;
    }
  }, [session]);

  // Create authenticated client with Clerk's JWT
  const supabase = useMemo(() => {
    if (!settings.url || !settings.anonKey) {
      return null;
    }

    return createClient(settings.url, settings.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      accessToken: getToken,
    });
  }, [settings.url, settings.anonKey, getToken]);

  return {
    supabase,
    isLoading: !isLoaded,
  };
}
