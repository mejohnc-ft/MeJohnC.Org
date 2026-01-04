import { describe, it, expect } from 'vitest';
import {
  renderMarkdown,
  calculateReadingTime,
  extractExcerpt,
  formatDate,
  formatRelativeTime,
} from './markdown';

describe('renderMarkdown', () => {
  it('escapes HTML to prevent XSS', () => {
    const malicious = '<script>alert("xss")</script>';
    const result = renderMarkdown(malicious);

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('blocks javascript: URLs in links to prevent XSS', () => {
    const malicious = '[click me](javascript:alert(document.cookie))';
    const result = renderMarkdown(malicious);

    expect(result).not.toContain('javascript:');
    expect(result).toContain('href="#blocked"');
  });

  it('blocks data: URLs in links to prevent XSS', () => {
    const malicious = '[click me](data:text/html,<script>alert(1)</script>)';
    const result = renderMarkdown(malicious);

    expect(result).not.toContain('data:');
    expect(result).toContain('href="#blocked"');
  });

  it('allows safe URLs in links', () => {
    const safe = '[click me](https://example.com)';
    const result = renderMarkdown(safe);

    expect(result).toContain('href="https://example.com"');
  });

  it('converts headers', () => {
    expect(renderMarkdown('# Heading 1')).toContain('<h1>Heading 1</h1>');
    expect(renderMarkdown('## Heading 2')).toContain('<h2>Heading 2</h2>');
    expect(renderMarkdown('### Heading 3')).toContain('<h3>Heading 3</h3>');
  });

  it('converts bold text', () => {
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
    expect(renderMarkdown('__bold__')).toContain('<strong>bold</strong>');
  });

  it('converts italic text', () => {
    expect(renderMarkdown('*italic*')).toContain('<em>italic</em>');
    expect(renderMarkdown('_italic_')).toContain('<em>italic</em>');
  });

  it('converts links', () => {
    const result = renderMarkdown('[link](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('converts inline code', () => {
    expect(renderMarkdown('`code`')).toContain('<code>code</code>');
  });
});

describe('calculateReadingTime', () => {
  it('returns 1 for very short content', () => {
    expect(calculateReadingTime('Hello world')).toBe(1);
  });

  it('calculates based on 200 words per minute', () => {
    const words = Array(400).fill('word').join(' ');
    expect(calculateReadingTime(words)).toBe(2);
  });

  it('rounds up partial minutes', () => {
    const words = Array(250).fill('word').join(' ');
    expect(calculateReadingTime(words)).toBe(2);
  });
});

describe('extractExcerpt', () => {
  it('returns full text if under max length', () => {
    const text = 'Short text';
    expect(extractExcerpt(text)).toBe('Short text');
  });

  it('truncates at word boundary', () => {
    const text = 'This is a longer piece of text that should be truncated at a word boundary instead of cutting off mid-word which would look unprofessional and hard to read';
    const excerpt = extractExcerpt(text, 50);

    expect(excerpt.length).toBeLessThanOrEqual(53); // 50 + '...'
    expect(excerpt.endsWith('...')).toBe(true);
    expect(excerpt).not.toMatch(/\s\.\.\.$/); // no space before ellipsis
  });

  it('strips markdown formatting', () => {
    const text = '# Header\n**bold** and *italic* with `code`';
    const excerpt = extractExcerpt(text);

    expect(excerpt).not.toContain('#');
    expect(excerpt).not.toContain('**');
    expect(excerpt).not.toContain('*');
    expect(excerpt).not.toContain('`');
  });

  it('strips links but keeps text', () => {
    const text = 'Check out [this link](https://example.com) for more';
    const excerpt = extractExcerpt(text);

    expect(excerpt).toContain('this link');
    expect(excerpt).not.toContain('https://');
  });
});

describe('formatDate', () => {
  it('formats date in US locale', () => {
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent times', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns minutes ago for recent times', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });
});
