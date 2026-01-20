/**
 * Webhook Adapter (Interface)
 *
 * Defines the interface for receiving news articles via webhooks.
 * Useful for integrating with custom sources or third-party services.
 */

import { type NewsArticle } from '@/lib/schemas';

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
  /** Allowed IP addresses (for IP whitelisting) */
  allowedIPs?: string[];
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
   * Validate webhook signature (HMAC)
   */
  validateSignature(payload: unknown, signature: string): boolean;

  /**
   * Validate request origin (IP whitelist)
   */
  validateOrigin(ip: string): boolean;
}

/**
 * Webhook Adapter Implementation
 */
export class WebhookAdapter implements IWebhookAdapter {
  private config: WebhookConfig;

  constructor(config: WebhookConfig = {}) {
    this.config = config;
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
   * Validate HMAC signature
   */
  validateSignature(payload: unknown, signature: string): boolean {
    if (!this.config.secret) {
      // If no secret is configured, skip validation
      return true;
    }

    // TODO: Implement HMAC validation
    // This would require crypto APIs not available in all environments
    // Example using Web Crypto API:
    // const encoder = new TextEncoder();
    // const data = encoder.encode(JSON.stringify(payload));
    // const key = await crypto.subtle.importKey(...);
    // const hmac = await crypto.subtle.sign(...);
    // const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(hmac)));
    // return signature === expectedSignature;

    console.warn('Webhook signature validation not implemented');
    return true;
  }

  /**
   * Validate request origin against IP whitelist
   */
  validateOrigin(ip: string): boolean {
    if (!this.config.allowedIPs || this.config.allowedIPs.length === 0) {
      // If no whitelist is configured, allow all
      return true;
    }

    return this.config.allowedIPs.includes(ip);
  }
}

/**
 * Default webhook adapter instance
 */
export const webhookAdapter = new WebhookAdapter();
