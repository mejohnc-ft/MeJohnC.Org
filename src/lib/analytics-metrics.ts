/**
 * Google Analytics Metrics Integration
 * Fetches analytics data from Google Analytics Data API (GA4)
 *
 * Setup required:
 * 1. Create a Google Cloud project
 * 2. Enable Google Analytics Data API
 * 3. Create a service account with Viewer role
 * 4. Download the service account JSON key
 * 5. Add the service account email as a user in GA4 property
 * 6. Set environment variables:
 *    - VITE_GA_PROPERTY_ID: GA4 property ID (e.g., "123456789")
 *    - VITE_GA_CLIENT_EMAIL: Service account email
 *    - VITE_GA_PRIVATE_KEY: Service account private key (base64 encoded)
 *
 * API Reference: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

import { captureException } from '@/lib/sentry';

// ============================================
// TYPES
// ============================================

export interface AnalyticsMetric {
  name: string;
  value: number;
}

export interface AnalyticsDimension {
  name: string;
  value: string;
}

export interface AnalyticsReportRow {
  dimensions: AnalyticsDimension[];
  metrics: AnalyticsMetric[];
}

export interface AnalyticsReport {
  rows: AnalyticsReportRow[];
  totals: AnalyticsMetric[];
  metadata: {
    currencyCode: string;
    timeZone: string;
  };
}

export interface AnalyticsOverview {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
}

export interface PageViewsData {
  pagePath: string;
  pageTitle: string;
  views: number;
}

export interface TrafficSourceData {
  source: string;
  medium: string;
  sessions: number;
}

export interface DeviceData {
  deviceCategory: string;
  sessions: number;
  percentage: number;
}

export interface GACredentials {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

// GA4 API Response types
interface GA4MetricValue {
  value: string;
}

interface GA4DimensionValue {
  value: string;
}

interface GA4Row {
  dimensionValues?: GA4DimensionValue[];
  metricValues?: GA4MetricValue[];
}

interface GA4RunReportResponse {
  rows?: GA4Row[];
  totals?: GA4Row[];
  metadata?: {
    currencyCode?: string;
    timeZone?: string;
  };
}

// ============================================
// CONFIGURATION
// ============================================

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

function getCredentialsFromEnv(): GACredentials | null {
  const propertyId = import.meta.env.VITE_GA_PROPERTY_ID;
  const clientEmail = import.meta.env.VITE_GA_CLIENT_EMAIL;
  const privateKeyBase64 = import.meta.env.VITE_GA_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKeyBase64) {
    return null;
  }

  // Decode base64 private key
  let privateKey: string;
  try {
    privateKey = atob(privateKeyBase64);
  } catch {
    privateKey = privateKeyBase64; // Already decoded
  }

  return { propertyId, clientEmail, privateKey };
}

/**
 * Check if Google Analytics is configured
 */
export function isAnalyticsConfigured(): boolean {
  return getCredentialsFromEnv() !== null;
}

// ============================================
// JWT TOKEN GENERATION
// ============================================

/**
 * Create a JWT token for Google OAuth2
 */
async function createJWT(credentials: GACredentials): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await signRS256(signatureInput, credentials.privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signRS256(data: string, privateKeyPem: string): Promise<string> {
  // Convert PEM to CryptoKey
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(data)
  );

  return String.fromCharCode(...new Uint8Array(signature));
}

/**
 * Get OAuth2 access token using JWT
 */
async function getAccessToken(credentials: GACredentials): Promise<string> {
  const jwt = await createJWT(credentials);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token error: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ============================================
// GA4 API CLIENT
// ============================================

interface RunReportRequest {
  dateRanges: { startDate: string; endDate: string }[];
  metrics: { name: string }[];
  dimensions?: { name: string }[];
  orderBys?: { metric?: { metricName: string }; desc?: boolean }[];
  limit?: number;
}

/**
 * Make a request to GA4 Data API
 */
async function runReport(
  propertyId: string,
  request: RunReportRequest,
  credentials: GACredentials
): Promise<GA4RunReportResponse> {
  const accessToken = await getAccessToken(credentials);

  const response = await fetch(
    `${GA4_API_BASE}/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GA4 API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ============================================
// PUBLIC API FUNCTIONS
// ============================================

/**
 * Fetch analytics overview for the last N days
 */
export async function getAnalyticsOverview(
  propertyId: string,
  days = 7,
  credentials?: GACredentials
): Promise<AnalyticsOverview | null> {
  const creds = credentials || getCredentialsFromEnv();
  if (!creds) {
    console.warn('Google Analytics not configured. Set VITE_GA_* environment variables.');
    return null;
  }

  try {
    const response = await runReport(
      propertyId || creds.propertyId,
      {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
        ],
      },
      creds
    );

    const metrics = response.rows?.[0]?.metricValues || [];

    return {
      activeUsers: parseInt(metrics[0]?.value || '0', 10),
      newUsers: parseInt(metrics[1]?.value || '0', 10),
      sessions: parseInt(metrics[2]?.value || '0', 10),
      screenPageViews: parseInt(metrics[3]?.value || '0', 10),
      averageSessionDuration: parseFloat(metrics[4]?.value || '0'),
      bounceRate: parseFloat(metrics[5]?.value || '0'),
      engagementRate: parseFloat(metrics[6]?.value || '0'),
    };
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      context: 'analytics.getAnalyticsOverview',
    });
    console.error('Failed to fetch analytics overview:', error);
    return null;
  }
}

/**
 * Fetch top pages by page views
 */
export async function getTopPages(
  propertyId: string,
  days = 7,
  limit = 10,
  credentials?: GACredentials
): Promise<PageViewsData[]> {
  const creds = credentials || getCredentialsFromEnv();
  if (!creds) {
    console.warn('Google Analytics not configured. Set VITE_GA_* environment variables.');
    return [];
  }

  try {
    const response = await runReport(
      propertyId || creds.propertyId,
      {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit,
      },
      creds
    );

    return (response.rows || []).map((row) => ({
      pagePath: row.dimensionValues?.[0]?.value || '',
      pageTitle: row.dimensionValues?.[1]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      context: 'analytics.getTopPages',
    });
    console.error('Failed to fetch top pages:', error);
    return [];
  }
}

/**
 * Fetch traffic sources
 */
export async function getTrafficSources(
  propertyId: string,
  days = 7,
  credentials?: GACredentials
): Promise<TrafficSourceData[]> {
  const creds = credentials || getCredentialsFromEnv();
  if (!creds) {
    console.warn('Google Analytics not configured. Set VITE_GA_* environment variables.');
    return [];
  }

  try {
    const response = await runReport(
      propertyId || creds.propertyId,
      {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      },
      creds
    );

    return (response.rows || []).map((row) => ({
      source: row.dimensionValues?.[0]?.value || '(direct)',
      medium: row.dimensionValues?.[1]?.value || '(none)',
      sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      context: 'analytics.getTrafficSources',
    });
    console.error('Failed to fetch traffic sources:', error);
    return [];
  }
}

/**
 * Fetch device breakdown
 */
export async function getDeviceBreakdown(
  propertyId: string,
  days = 7,
  credentials?: GACredentials
): Promise<DeviceData[]> {
  const creds = credentials || getCredentialsFromEnv();
  if (!creds) {
    console.warn('Google Analytics not configured. Set VITE_GA_* environment variables.');
    return [];
  }

  try {
    const response = await runReport(
      propertyId || creds.propertyId,
      {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
      },
      creds
    );

    const rows = response.rows || [];
    const totalSessions = rows.reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0', 10),
      0
    );

    return rows.map((row) => {
      const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
      return {
        deviceCategory: row.dimensionValues?.[0]?.value || 'unknown',
        sessions,
        percentage: totalSessions > 0 ? (sessions / totalSessions) * 100 : 0,
      };
    });
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      context: 'analytics.getDeviceBreakdown',
    });
    console.error('Failed to fetch device breakdown:', error);
    return [];
  }
}

// ============================================
// DATA TRANSFORMATION
// ============================================

export interface TransformedAnalyticsMetric {
  metric_name: string;
  metric_type: 'gauge';
  value: number;
  unit: string | null;
  dimensions: Record<string, string>;
  recorded_at: string;
}

export function transformAnalyticsOverview(
  overview: AnalyticsOverview,
  propertyId: string
): TransformedAnalyticsMetric[] {
  const now = new Date().toISOString();
  const dimensions = { property_id: propertyId };

  return [
    {
      metric_name: 'ga_active_users',
      metric_type: 'gauge',
      value: overview.activeUsers,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'ga_new_users',
      metric_type: 'gauge',
      value: overview.newUsers,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'ga_sessions',
      metric_type: 'gauge',
      value: overview.sessions,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'ga_page_views',
      metric_type: 'gauge',
      value: overview.screenPageViews,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'ga_avg_session_duration',
      metric_type: 'gauge',
      value: overview.averageSessionDuration,
      unit: 'seconds',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'ga_bounce_rate',
      metric_type: 'gauge',
      value: overview.bounceRate * 100,
      unit: 'percent',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'ga_engagement_rate',
      metric_type: 'gauge',
      value: overview.engagementRate * 100,
      unit: 'percent',
      dimensions,
      recorded_at: now,
    },
  ];
}
