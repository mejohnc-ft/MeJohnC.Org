import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

describe('DOMPurify sanitization', () => {
  it('removes script tags from HTML content', () => {
    const maliciousHtml = '<p>Hello</p><script>alert("xss")</script>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('<p>Hello</p>');
  });

  it('removes onerror event handlers', () => {
    const maliciousHtml = '<img src="x" onerror="alert(\'xss\')">';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('alert');
  });

  it('removes onclick event handlers', () => {
    const maliciousHtml = '<button onclick="stealCookies()">Click me</button>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('stealCookies');
  });

  it('removes javascript: URLs', () => {
    const maliciousHtml = '<a href="javascript:alert(\'xss\')">Click</a>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('javascript:');
  });

  it('removes data: URLs with scripts', () => {
    const maliciousHtml = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('data:text/html');
  });

  it('preserves safe HTML content', () => {
    const safeHtml = `
      <h1>Title</h1>
      <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <a href="https://example.com">Safe link</a>
      <img src="https://example.com/image.jpg" alt="Safe image">
    `;
    const sanitized = DOMPurify.sanitize(safeHtml);

    expect(sanitized).toContain('<h1>Title</h1>');
    expect(sanitized).toContain('<strong>bold</strong>');
    expect(sanitized).toContain('<em>italic</em>');
    expect(sanitized).toContain('https://example.com');
    expect(sanitized).toContain('<img');
  });

  it('removes iframe elements by default', () => {
    const maliciousHtml = '<iframe src="https://evil.com"></iframe>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('<iframe');
  });

  it('removes SVG-based XSS', () => {
    const maliciousHtml = '<svg onload="alert(\'xss\')"><circle r="50"></circle></svg>';
    const sanitized = DOMPurify.sanitize(maliciousHtml);

    expect(sanitized).not.toContain('onload');
  });
});
