import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

type VitalsReporter = (metric: Metric) => void;

/**
 * Core Web Vitals thresholds (in milliseconds where applicable)
 * Based on Google's recommendations
 */
export const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Default reporter that logs to console in development
 * and sends to analytics in production
 */
const defaultReporter: VitalsReporter = (metric) => {
  const rating = getRating(metric.name, metric.value);

  // Always log in development
  if (import.meta.env.DEV) {
    const color =
      rating === 'good'
        ? 'color: green'
        : rating === 'needs-improvement'
        ? 'color: orange'
        : 'color: red';

    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${rating})`,
      color
    );
  }

  // Send to Google Analytics if available
  if (window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
      metric_rating: rating,
    });
  }

  // Send to Sentry if available
  if (import.meta.env.PROD) {
    // Could add Sentry performance tracking here
    // Sentry.addBreadcrumb({ category: 'web-vitals', data: metric });
  }
};

/**
 * Initialize Web Vitals reporting
 * Call this in your app's entry point
 */
export function initWebVitals(reporter: VitalsReporter = defaultReporter) {
  // Cumulative Layout Shift
  onCLS(reporter);

  // Interaction to Next Paint (replaces FID)
  onINP(reporter);

  // First Contentful Paint
  onFCP(reporter);

  // Largest Contentful Paint
  onLCP(reporter);

  // Time to First Byte
  onTTFB(reporter);
}

/**
 * Get a summary of all collected vitals
 * Useful for debugging or custom reporting
 */
export function getVitalsSummary(): Promise<Record<string, Metric>> {
  return new Promise((resolve) => {
    const vitals: Record<string, Metric> = {};
    let collected = 0;
    const total = 5;

    const collector = (metric: Metric) => {
      vitals[metric.name] = metric;
      collected++;
      if (collected === total) {
        resolve(vitals);
      }
    };

    onCLS(collector);
    onINP(collector);
    onFCP(collector);
    onLCP(collector);
    onTTFB(collector);

    // Resolve after 10 seconds even if not all metrics collected
    setTimeout(() => resolve(vitals), 10000);
  });
}

/**
 * Check if current page performance is acceptable
 * Returns true if all available metrics are "good" or "needs-improvement"
 */
export async function isPerformanceAcceptable(): Promise<boolean> {
  const vitals = await getVitalsSummary();

  return Object.values(vitals).every((metric) => {
    const rating = getRating(metric.name, metric.value);
    return rating !== 'poor';
  });
}
