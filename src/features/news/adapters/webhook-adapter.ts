/**
 * Webhook Adapter (Interface)
 *
 * Defines the interface for receiving news articles via webhooks.
 * Useful for integrating with custom sources or third-party services.
 */

import { type NewsArticle } from '@/lib/schemas';
import { logger } from '@/lib/logger';

/** Supported HMAC algorithms */
export type HmacAlgorithm = 'SHA-256' | 'SHA-512';

/** Signature header format variations */
export interface SignatureHeader {
  /** The raw signature value */
  signature: string;
  /** Algorithm used (extracted from header or default) */
  algorithm: HmacAlgorithm;
}

export interface WebhookPayload {
  /** External ID for deduplication */
  external_id: string;
  /** Article title */
  title: string;
  /** Article URL */
  url: string;
  /** Optional description/summary */
  description?: string;
  /** Optional full content */
  content?: string;
  /** Optional author */
  author?: string;
  /** Publication date (ISO 8601 string) */
  published_at?: string;
  /** Optional image URL */
  image_url?: string;
  /** Optional tags/categories */
  tags?: string[];
  /** Optional source URL (original post) */
  source_url?: string;
}

export interface WebhookConfig {
  /** Secret key for validating webhook signatures */
  secret?: string;
  /** HMAC algorithm to use (default: SHA-256) */
  algorithm?: HmacAlgorithm;
  /** Whether to require valid signatures (reject if invalid/missing) */
  requireSignature?: boolean;
  /** Allowed IP addresses (for IP whitelisting) */
  allowedIPs?: string[];
}

/** Result of signature validation */
export interface SignatureValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Webhook Adapter Interface
 *
 * Handles incoming webhook requests for news articles.
 */
export interface IWebhookAdapter {
  /**
   * Process an incoming webhook payload
   */
  handleIncoming(
    payload: WebhookPayload,
    sourceId: string,
    tenantId?: string
  ): Promise<Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>>;

  /**
   * Validate webhook signature (HMAC) - async for Web Crypto API
   */
  validateSignature(
    payload: string | ArrayBuffer,
    signatureHeader: string
  ): Promise<SignatureValidationResult>;

  /**
   * Validate request origin (IP whitelist)
   */
  validateOrigin(ip: string): boolean;

  /**
   * Parse signature from various header formats
   */
  parseSignatureHeader(header: string): SignatureHeader | null;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Compares two strings in constant time regardless of where they differ.
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Use the longer string length to ensure constant-time comparison
  const len = Math.max(a.length, b.length);
  let result = a.length ^ b.length; // Will be non-zero if lengths differ

  for (let i = 0; i < len; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }

  return result === 0;
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Webhook Adapter Implementation
 */
export class WebhookAdapter implements IWebhookAdapter {
  private config: WebhookConfig;

  constructor(config: WebhookConfig = {}) {
    this.config = {
      algorithm: 'SHA-256',
      requireSignature: false,
      ...config,
    };
  }

  /**
   * Process incoming webhook and convert to NewsArticle format
   */
  async handleIncoming(
    payload: WebhookPayload,
    sourceId: string,
    tenantId = '00000000-0000-0000-0000-000000000001'
  ): Promise<Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>> {
    // Validate required fields
    if (!payload.external_id || !payload.title || !payload.url) {
      throw new Error('Missing required fields: external_id, title, url');
    }

    return {
      tenant_id: tenantId,
      source_id: sourceId,
      external_id: payload.external_id,
      title: payload.title,
      url: payload.url,
      source_url: payload.source_url || null,
      description: payload.description || null,
      content: payload.content || null,
      author: payload.author || null,
      published_at: payload.published_at || new Date().toISOString(),
      image_url: payload.image_url || null,
      tags: payload.tags || null,
      is_read: false,
      is_bookmarked: false,
      is_curated: false,
      is_archived: false,
      curated_at: null,
      curated_summary: null,
      curated_order: null,
    };
  }

  /**
   * Parse signature header from various formats:
   * - "sha256=abc123" (GitHub style)
   * - "sha512=abc123" (GitHub style with SHA-512)
   * - "t=timestamp,v1=signature" (Stripe style)
   * - "abc123" (plain signature)
   */
  parseSignatureHeader(header: string): SignatureHeader | null {
    if (!header || typeof header !== 'string') {
      return null;
    }

    const trimmed = header.trim();

    // GitHub style: "sha256=signature" or "sha512=signature"
    const githubMatch = trimmed.match(/^sha(256|512)=([a-fA-F0-9]+)$/);
    if (githubMatch) {
      return {
        algorithm: `SHA-${githubMatch[1]}` as HmacAlgorithm,
        signature: githubMatch[2].toLowerCase(),
      };
    }

    // Stripe style: "t=timestamp,v1=signature"
    const stripeMatch = trimmed.match(/v1=([a-fA-F0-9]+)/);
    if (stripeMatch) {
      return {
        algorithm: this.config.algorithm || 'SHA-256',
        signature: stripeMatch[1].toLowerCase(),
      };
    }

    // Plain hex signature
    if (/^[a-fA-F0-9]+$/.test(trimmed)) {
      return {
        algorithm: this.config.algorithm || 'SHA-256',
        signature: trimmed.toLowerCase(),
      };
    }

    // Base64 encoded signature
    if (/^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
      try {
        const decoded = atob(trimmed);
        const hex = Array.from(decoded)
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
        return {
          algorithm: this.config.algorithm || 'SHA-256',
          signature: hex.toLowerCase(),
        };
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Validate HMAC signature using Web Crypto API
   * Uses timing-safe comparison to prevent timing attacks
   */
  async validateSignature(
    payload: string | ArrayBuffer,
    signatureHeader: string
  ): Promise<SignatureValidationResult> {
    // If no secret is configured
    if (!this.config.secret) {
      if (this.config.requireSignature) {
        logger.warn('[WebhookAdapter] Signature required but no secret configured');
        return { valid: false, error: 'No webhook secret configured' };
      }
      return { valid: true };
    }

    // If no signature provided
    if (!signatureHeader) {
      if (this.config.requireSignature) {
        logger.warn('[WebhookAdapter] Signature validation failed: missing signature header');
        return { valid: false, error: 'Missing signature header' };
      }
      return { valid: true };
    }

    // Parse the signature header
    const parsed = this.parseSignatureHeader(signatureHeader);
    if (!parsed) {
      logger.warn('[WebhookAdapter] Signature validation failed: invalid signature format', {
        header: signatureHeader.substring(0, 20) + '...',
      });
      return { valid: false, error: 'Invalid signature format' };
    }

    try {
      // Convert payload to ArrayBuffer if it's a string
      const encoder = new TextEncoder();
      const data = typeof payload === 'string' ? encoder.encode(payload) : payload;

      // Import the secret key
      const keyData = encoder.encode(this.config.secret);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: parsed.algorithm },
        false,
        ['sign']
      );

      // Generate the expected signature
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
      const expectedSignature = bufferToHex(signatureBuffer);

      // Timing-safe comparison
      const isValid = timingSafeEqual(expectedSignature, parsed.signature);

      if (!isValid) {
        logger.warn('[WebhookAdapter] Signature validation failed: signature mismatch', {
          algorithm: parsed.algorithm,
        });
        return { valid: false, error: 'Signature mismatch' };
      }

      logger.info('[WebhookAdapter] Signature validated successfully', {
        algorithm: parsed.algorithm,
      });
      return { valid: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[WebhookAdapter] Signature validation error', { error: message });
      return { valid: false, error: `Validation error: ${message}` };
    }
  }

  /**
   * Validate request origin against IP whitelist
   */
  validateOrigin(ip: string): boolean {
    if (!this.config.allowedIPs || this.config.allowedIPs.length === 0) {
      // If no whitelist is configured, allow all
      return true;
    }

    const isAllowed = this.config.allowedIPs.includes(ip);
    if (!isAllowed) {
      logger.warn('[WebhookAdapter] Origin validation failed: IP not in whitelist', {
        ip,
      });
    }
    return isAllowed;
  }
}

/**
 * Create a webhook adapter with the given secret
 */
export function createWebhookAdapter(config: WebhookConfig): WebhookAdapter {
  return new WebhookAdapter(config);
}

/**
 * Validate a full webhook request (signature + origin)
 * Returns validation result with detailed error information
 */
export async function validateWebhookRequest(
  adapter: WebhookAdapter,
  options: {
    payload: string | ArrayBuffer;
    signatureHeader?: string;
    ip?: string;
  }
): Promise<SignatureValidationResult> {
  // Validate origin first (fast check)
  if (options.ip && !adapter.validateOrigin(options.ip)) {
    return { valid: false, error: 'IP address not allowed' };
  }

  // Validate signature
  if (options.signatureHeader !== undefined) {
    return adapter.validateSignature(options.payload, options.signatureHeader);
  }

  return { valid: true };
}

/**
 * Extract signature from common header names
 * Checks: X-Hub-Signature-256, X-Hub-Signature, X-Signature, X-Webhook-Signature, Stripe-Signature
 */
export function extractSignatureHeader(
  headers: Record<string, string | undefined>
): string | undefined {
  const headerNames = [
    'x-hub-signature-256',
    'x-hub-signature',
    'x-signature',
    'x-webhook-signature',
    'stripe-signature',
  ];

  // Normalize header names to lowercase for comparison
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      normalizedHeaders[key.toLowerCase()] = value;
    }
  }

  for (const name of headerNames) {
    if (normalizedHeaders[name]) {
      return normalizedHeaders[name];
    }
  }

  return undefined;
}

/**
 * Default webhook adapter instance (no signature validation)
 */
export const webhookAdapter = new WebhookAdapter();
