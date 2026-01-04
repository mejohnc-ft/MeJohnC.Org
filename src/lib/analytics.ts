// Google Analytics 4 configuration
// Configure via Admin Settings or VITE_GA_MEASUREMENT_ID env variable

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_STORAGE_KEY = 'analytics_settings';

// Settings interface
interface AnalyticsSettings {
  measurementId: string;
}

// Get analytics settings - env var is primary, localStorage is optional override
export function getAnalyticsSettings(): AnalyticsSettings {
  // Start with env variable
  const envSettings: AnalyticsSettings = {
    measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
  };

  // Check localStorage for override
  try {
    const saved = localStorage.getItem(GA_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.measurementId?.trim()) {
        return { measurementId: parsed.measurementId.trim() };
      }
    }
  } catch {
    // Ignore parse errors
  }

  return envSettings;
}

// Save analytics settings to localStorage (only if valid)
export function saveAnalyticsSettings(settings: AnalyticsSettings): void {
  const measurementId = settings.measurementId?.trim() || '';

  if (measurementId) {
    localStorage.setItem(GA_STORAGE_KEY, JSON.stringify({ measurementId }));
  } else {
    // Clear localStorage override so env var takes precedence
    localStorage.removeItem(GA_STORAGE_KEY);
  }
}

// Get the active measurement ID
function getMeasurementId(): string {
  return getAnalyticsSettings().measurementId;
}

export function initAnalytics(): void {
  const measurementId = getMeasurementId();

  if (!measurementId) {
    if (import.meta.env.DEV) {
      console.log('[Analytics] No GA4 Measurement ID configured');
    }
    return;
  }

  // Skip in development unless explicitly enabled
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_ANALYTICS_DEV) {
    console.log('[Analytics] Disabled in development');
    return;
  }

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false, // We'll manually track page views for SPA
  });

  if (import.meta.env.DEV) {
    console.log('[Analytics] Initialized with ID:', measurementId);
  }
}

// Track page views (call this on route changes)
export function trackPageView(path: string, title?: string): void {
  if (!getMeasurementId() || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
}

// Track custom events
export function trackEvent(
  eventName: string,
  parameters?: Record<string, unknown>
): void {
  if (!getMeasurementId() || !window.gtag) return;

  window.gtag('event', eventName, parameters);
}

// Common event helpers
export const analytics = {
  // Track when user downloads resume
  trackResumeDownload: () => {
    trackEvent('resume_download', {
      event_category: 'engagement',
      event_label: 'Resume PDF',
    });
  },

  // Track when user clicks contact links
  trackContactClick: (method: 'email' | 'linkedin' | 'github' | 'calendar') => {
    trackEvent('contact_click', {
      event_category: 'engagement',
      event_label: method,
    });
  },

  // Track when user views a project
  trackProjectView: (projectId: string, projectName: string) => {
    trackEvent('project_view', {
      event_category: 'engagement',
      project_id: projectId,
      project_name: projectName,
    });
  },

  // Track when user reads a blog post
  trackBlogRead: (slug: string, title: string) => {
    trackEvent('blog_read', {
      event_category: 'content',
      blog_slug: slug,
      blog_title: title,
    });
  },

  // Track portfolio tab changes
  trackTabChange: (tabId: string) => {
    trackEvent('tab_change', {
      event_category: 'navigation',
      tab_id: tabId,
    });
  },

  // Track scroll depth
  trackScrollDepth: (depth: 25 | 50 | 75 | 100) => {
    trackEvent('scroll_depth', {
      event_category: 'engagement',
      depth_percentage: depth,
    });
  },

  // Track time on page
  trackTimeOnPage: (seconds: number) => {
    trackEvent('time_on_page', {
      event_category: 'engagement',
      time_seconds: seconds,
    });
  },
};
