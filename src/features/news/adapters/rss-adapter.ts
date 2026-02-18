/**
 * RSS Adapter
 *
 * Fetches and parses RSS feeds into standardized NewsArticle format.
 * Handles XML parsing, field extraction, and data normalization.
 */

import { type NewsArticle, DEFAULT_TENANT_ID } from "@/lib/schemas";

export interface RssFeedItem {
  guid?: string;
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
}

export interface RssFeed {
  title: string;
  link: string;
  description?: string;
  items: RssFeedItem[];
}

export interface RssAdapterConfig {
  /** Custom user agent for requests */
  userAgent?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * RSS Adapter
 *
 * Provides RSS feed fetching and parsing functionality.
 */
export class RssAdapter {
  private config: RssAdapterConfig;

  constructor(config: RssAdapterConfig = {}) {
    this.config = {
      userAgent: config.userAgent || "MeJohnC.Org NewsBot/1.0",
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Fetch and parse an RSS feed from a URL
   */
  async fetchFeed(url: string): Promise<RssFeed> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(url, {
        headers: {
          "User-Agent": this.config.userAgent!,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      return this.parseFeed(xml);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch RSS feed: ${error.message}`, {
          cause: error,
        });
      }
      throw error;
    }
  }

  /**
   * Parse RSS XML into structured feed data
   */
  parseFeed(xml: string): RssFeed {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");

    // Check for parsing errors
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      throw new Error("Invalid XML: " + parserError.textContent);
    }

    // Detect feed type (RSS 2.0 or Atom)
    const isAtom = doc.querySelector("feed") !== null;

    if (isAtom) {
      return this.parseAtomFeed(doc);
    } else {
      return this.parseRssFeed(doc);
    }
  }

  /**
   * Parse RSS 2.0 format
   */
  private parseRssFeed(doc: Document): RssFeed {
    const channel = doc.querySelector("channel");
    if (!channel) {
      throw new Error("Invalid RSS feed: no channel element");
    }

    const feed: RssFeed = {
      title: this.getElementText(channel, "title") || "Untitled Feed",
      link: this.getElementText(channel, "link") || "",
      description: this.getElementText(channel, "description"),
      items: [],
    };

    const items = channel.querySelectorAll("item");
    items.forEach((item) => {
      const feedItem: RssFeedItem = {
        guid: this.getElementText(item, "guid"),
        title: this.getElementText(item, "title") || "Untitled",
        link: this.getElementText(item, "link") || "",
        description: this.getElementText(item, "description"),
        content:
          this.getElementText(item, "content:encoded") ||
          this.getElementText(item, "description"),
        pubDate: this.getElementText(item, "pubDate"),
        author:
          this.getElementText(item, "author") ||
          this.getElementText(item, "dc:creator"),
        categories: Array.from(item.querySelectorAll("category")).map(
          (cat) => cat.textContent || "",
        ),
      };

      feed.items.push(feedItem);
    });

    return feed;
  }

  /**
   * Parse Atom format
   */
  private parseAtomFeed(doc: Document): RssFeed {
    const feedEl = doc.querySelector("feed");
    if (!feedEl) {
      throw new Error("Invalid Atom feed: no feed element");
    }

    const feed: RssFeed = {
      title: this.getElementText(feedEl, "title") || "Untitled Feed",
      link:
        feedEl.querySelector('link[rel="alternate"]')?.getAttribute("href") ||
        "",
      description: this.getElementText(feedEl, "subtitle"),
      items: [],
    };

    const entries = feedEl.querySelectorAll("entry");
    entries.forEach((entry) => {
      const feedItem: RssFeedItem = {
        guid: this.getElementText(entry, "id"),
        title: this.getElementText(entry, "title") || "Untitled",
        link:
          entry.querySelector('link[rel="alternate"]')?.getAttribute("href") ||
          "",
        description: this.getElementText(entry, "summary"),
        content:
          this.getElementText(entry, "content") ||
          this.getElementText(entry, "summary"),
        pubDate:
          this.getElementText(entry, "updated") ||
          this.getElementText(entry, "published"),
        author: this.getElementText(entry, "author name"),
        categories: Array.from(entry.querySelectorAll("category")).map(
          (cat) => cat.getAttribute("term") || "",
        ),
      };

      feed.items.push(feedItem);
    });

    return feed;
  }

  /**
   * Helper to get text content from an element
   */
  private getElementText(
    parent: Element,
    selector: string,
  ): string | undefined {
    const element = parent.querySelector(selector);
    return element?.textContent?.trim() || undefined;
  }

  /**
   * Validate a feed URL without fetching full content
   */
  async validateSource(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": this.config.userAgent!,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Convert RSS feed items to NewsArticle format
   */
  convertToArticles(
    feedItems: RssFeedItem[],
    sourceId: string,
    tenantId: string = DEFAULT_TENANT_ID,
  ): Omit<NewsArticle, "id" | "created_at" | "updated_at">[] {
    return feedItems.map((item) => ({
      tenant_id: tenantId,
      source_id: sourceId,
      external_id: item.guid || item.link,
      title: item.title,
      url: item.link,
      source_url: null,
      description: item.description || null,
      content: item.content || null,
      author: item.author || null,
      published_at: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      image_url: null, // Could be extracted from content if needed
      tags: item.categories || null,
      is_read: false,
      is_bookmarked: false,
      is_curated: false,
      is_archived: false,
      curated_at: null,
      curated_summary: null,
      curated_order: null,
    }));
  }
}

/**
 * Default RSS adapter instance
 */
export const rssAdapter = new RssAdapter();
