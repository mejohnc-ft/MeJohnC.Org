import { describe, it, expect } from 'vitest';
import { generateSlug } from './supabase-queries';

describe('generateSlug', () => {
  it('converts to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('my blog post')).toBe('my-blog-post');
  });

  it('removes special characters', () => {
    expect(generateSlug('Hello! @World #2024')).toBe('hello-world-2024');
  });

  it('collapses multiple hyphens', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('handles accented characters', () => {
    expect(generateSlug('café')).toBe('caf');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('converts leading/trailing spaces to hyphens (current behavior)', () => {
    // Note: Current implementation converts spaces to hyphens before trimming
    // This test documents actual behavior - consider fixing if undesired
    expect(generateSlug('  hello world  ')).toBe('-hello-world-');
  });
});
