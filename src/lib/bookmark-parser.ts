import matter from 'gray-matter';
import type { ParsedSmaugBookmark, BookmarkCreate } from './bookmark-schemas';

/**
 * Parse a Smaug markdown export file and extract bookmarks.
 * Handles both:
 * - bookmarks.md (chronological archive format)
 * - Knowledge files (YAML frontmatter format)
 */
export function parseSmaugExport(content: string): ParsedSmaugBookmark[] {
  // Detect file type based on content
  if (content.trim().startsWith('---')) {
    // YAML frontmatter format (knowledge files)
    return parseKnowledgeFile(content);
  } else {
    // Chronological bookmark archive format
    return parseBookmarksMarkdown(content);
  }
}

/**
 * Parse a knowledge file with YAML frontmatter
 * Format:
 * ---
 * title: "Some Title"
 * type: tool
 * date_added: "2024-01-15"
 * source: "https://twitter.com/..."
 * url: "https://github.com/..."
 * tags: [ai, llm]
 * via: "@username"
 * ---
 * Content here...
 */
function parseKnowledgeFile(content: string): ParsedSmaugBookmark[] {
  try {
    const { data, content: body } = matter(content);

    // Extract author handle from 'via' field
    const authorHandle = data.via?.startsWith('@') ? data.via.slice(1) : data.via || null;

    const bookmark: ParsedSmaugBookmark = {
      title: data.title || null,
      type: data.type || null,
      date_added: data.date_added || null,
      source_url: data.source || '', // Original tweet URL
      url: data.url || data.source || '', // Linked content URL
      tags: Array.isArray(data.tags) ? data.tags : [],
      author: data.author || null,
      author_handle: authorHandle,
      content: body.trim(),
      published_at: data.published_at || data.date_added || null,
    };

    // Only return if we have a valid URL
    if (bookmark.url || bookmark.source_url) {
      return [bookmark];
    }
    return [];
  } catch (error) {
    console.error('Error parsing knowledge file:', error);
    return [];
  }
}

/**
 * Parse a bookmarks.md chronological archive
 * Format varies but typically:
 *
 * ## January 2024
 *
 * ### January 15, 2024
 *
 * - **@username**: "Tweet text here..."
 *   - Link: https://example.com
 *   - Filed to: knowledge/tools/example.md
 *   - [View Tweet](https://twitter.com/...)
 *
 * Or alternative format:
 * - [Title](url) - description @username
 */
function parseBookmarksMarkdown(content: string): ParsedSmaugBookmark[] {
  const bookmarks: ParsedSmaugBookmark[] = [];
  const lines = content.split('\n');

  let currentDate: string | null = null;
  let currentEntry: Partial<ParsedSmaugBookmark> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Date headers (## or ###)
    const dateMatch = line.match(/^#{2,3}\s+(.+)/);
    if (dateMatch) {
      // Try to parse as date
      const dateStr = dateMatch[1].trim();
      const parsedDate = tryParseDate(dateStr);
      if (parsedDate) {
        currentDate = parsedDate;
      }
      continue;
    }

    // Entry with bold username: - **@username**: "content"
    const boldUserMatch = line.match(/^-\s+\*\*@(\w+)\*\*:\s*[""]?(.+)[""]?$/);
    if (boldUserMatch) {
      // Save previous entry if exists
      if (currentEntry && (currentEntry.url || currentEntry.source_url)) {
        bookmarks.push(finalizeParsedBookmark(currentEntry, currentDate));
      }

      currentEntry = {
        author_handle: boldUserMatch[1],
        content: boldUserMatch[2].replace(/[""]$/, '').trim(),
        tags: [],
        date_added: currentDate,
      };
      continue;
    }

    // Entry with markdown link: - [Title](url) - description
    const linkMatch = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*-?\s*(.*))?$/);
    if (linkMatch) {
      // Save previous entry if exists
      if (currentEntry && (currentEntry.url || currentEntry.source_url)) {
        bookmarks.push(finalizeParsedBookmark(currentEntry, currentDate));
      }

      const description = linkMatch[3] || '';
      const authorMatch = description.match(/@(\w+)/);

      currentEntry = {
        title: linkMatch[1],
        url: linkMatch[2],
        content: description.replace(/@\w+/, '').trim(),
        author_handle: authorMatch ? authorMatch[1] : null,
        tags: [],
        date_added: currentDate,
      };
      continue;
    }

    // Nested content for current entry
    if (currentEntry && line.match(/^\s{2,}-/)) {
      const trimmedLine = line.trim().replace(/^-\s*/, '');

      // Link field
      const linkFieldMatch = trimmedLine.match(/^Link:\s*(.+)$/i);
      if (linkFieldMatch) {
        currentEntry.url = linkFieldMatch[1].trim();
        continue;
      }

      // View Tweet link
      const viewTweetMatch = trimmedLine.match(/\[View Tweet\]\(([^)]+)\)/i);
      if (viewTweetMatch) {
        currentEntry.source_url = viewTweetMatch[1];
        continue;
      }

      // Filed to (can extract type from path)
      const filedToMatch = trimmedLine.match(/^Filed to:\s*(.+)$/i);
      if (filedToMatch) {
        const path = filedToMatch[1].trim();
        // Extract type from path like "knowledge/tools/..." or "knowledge/articles/..."
        const typeMatch = path.match(/knowledge\/(\w+)\//);
        if (typeMatch) {
          currentEntry.type = typeMatch[1].replace(/s$/, ''); // Remove trailing 's'
        }
        continue;
      }

      // Tags field
      const tagsMatch = trimmedLine.match(/^Tags?:\s*(.+)$/i);
      if (tagsMatch) {
        currentEntry.tags = tagsMatch[1].split(/[,\s]+/).filter(t => t.trim());
        continue;
      }

      // Append to content if it's just text
      if (trimmedLine && !trimmedLine.startsWith('[') && !trimmedLine.includes(':')) {
        currentEntry.content = (currentEntry.content || '') + '\n' + trimmedLine;
      }
    }

    // Plain URL on its own line (for simple formats)
    const urlOnlyMatch = line.match(/^-\s+(https?:\/\/\S+)$/);
    if (urlOnlyMatch) {
      if (currentEntry && (currentEntry.url || currentEntry.source_url)) {
        bookmarks.push(finalizeParsedBookmark(currentEntry, currentDate));
      }
      currentEntry = {
        url: urlOnlyMatch[1],
        source_url: urlOnlyMatch[1],
        tags: [],
        date_added: currentDate,
      };
      continue;
    }
  }

  // Don't forget the last entry
  if (currentEntry && (currentEntry.url || currentEntry.source_url)) {
    bookmarks.push(finalizeParsedBookmark(currentEntry, currentDate));
  }

  return bookmarks;
}

/**
 * Finalize a parsed bookmark entry with defaults
 */
function finalizeParsedBookmark(
  entry: Partial<ParsedSmaugBookmark>,
  currentDate: string | null
): ParsedSmaugBookmark {
  return {
    title: entry.title || null,
    type: entry.type || null,
    date_added: entry.date_added || currentDate,
    source_url: entry.source_url || entry.url || '',
    url: entry.url || entry.source_url || '',
    tags: entry.tags || [],
    author: entry.author || null,
    author_handle: entry.author_handle || null,
    content: entry.content?.trim() || '',
    published_at: entry.published_at || entry.date_added || currentDate,
  };
}

/**
 * Try to parse various date formats
 */
function tryParseDate(dateStr: string): string | null {
  // Try parsing common date formats
  const formats = [
    // "January 15, 2024"
    /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/,
    // "2024-01-15"
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // "January 2024" (month only)
    /^(\w+)\s+(\d{4})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Try direct parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  return null;
}

/**
 * Convert a parsed Smaug bookmark to a database-ready bookmark
 */
export function convertToBookmarkCreate(
  parsed: ParsedSmaugBookmark,
  source: 'twitter' | 'manual' = 'twitter'
): BookmarkCreate {
  // Generate a source_id from the source_url for deduplication
  const sourceId = parsed.source_url
    ? extractTweetId(parsed.source_url) || hashString(parsed.source_url)
    : hashString(parsed.url);

  return {
    source,
    source_id: sourceId,
    source_url: parsed.source_url || null,
    url: parsed.url,
    title: parsed.title,
    description: null,
    content: parsed.content || null,
    author: parsed.author,
    author_handle: parsed.author_handle,
    author_avatar_url: null,
    tags: parsed.tags,
    category: mapTypeToCategory(parsed.type),
    ai_summary: null,
    ai_tags: [],
    ai_category: null,
    ai_processed_at: null,
    is_read: false,
    is_archived: false,
    is_favorite: false,
    is_public: false,
    image_url: null,
    favicon_url: null,
    metadata: {
      type: parsed.type,
      date_added: parsed.date_added,
    },
    published_at: parsed.published_at,
    imported_at: new Date().toISOString(),
  };
}

/**
 * Extract tweet ID from Twitter URL
 */
function extractTweetId(url: string): string | null {
  // Match patterns like:
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  const match = url.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Simple string hash for generating unique IDs
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Map Smaug type to database category
 */
function mapTypeToCategory(type: string | null): string | null {
  if (!type) return null;

  const typeMap: Record<string, string> = {
    'tool': 'tools',
    'tools': 'tools',
    'article': 'articles',
    'articles': 'articles',
    'repo': 'repos',
    'repository': 'repos',
    'repos': 'repos',
    'video': 'videos',
    'videos': 'videos',
    'thread': 'threads',
    'threads': 'threads',
    'paper': 'papers',
    'papers': 'papers',
    'news': 'news',
    'reference': 'reference',
    'doc': 'reference',
    'docs': 'reference',
    'inspiration': 'inspiration',
  };

  return typeMap[type.toLowerCase()] || 'other';
}

/**
 * Parse multiple files and return combined bookmarks
 */
export function parseSmaugFiles(files: { name: string; content: string }[]): ParsedSmaugBookmark[] {
  const allBookmarks: ParsedSmaugBookmark[] = [];

  for (const file of files) {
    const parsed = parseSmaugExport(file.content, file.name);
    allBookmarks.push(...parsed);
  }

  return allBookmarks;
}

/**
 * Deduplicate bookmarks based on URL
 */
export function deduplicateBookmarks(bookmarks: ParsedSmaugBookmark[]): ParsedSmaugBookmark[] {
  const seen = new Set<string>();
  const unique: ParsedSmaugBookmark[] = [];

  for (const bookmark of bookmarks) {
    const key = bookmark.source_url || bookmark.url;
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(bookmark);
    }
  }

  return unique;
}
