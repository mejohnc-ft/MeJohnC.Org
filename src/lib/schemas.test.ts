import { describe, it, expect } from 'vitest';
import {
  AppSuiteSchema,
  AppSchema,
  BlogPostSchema,
  WorkHistoryEntrySchema,
  parseResponse,
  parseArrayResponse,
} from './schemas';

describe('Zod Schemas', () => {
  describe('AppSuiteSchema', () => {
    it('validates a valid app suite', () => {
      const validSuite = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Suite',
        description: 'A test suite',
        slug: 'test-suite',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AppSuiteSchema.safeParse(validSuite);
      expect(result.success).toBe(true);
    });

    it('allows null description', () => {
      const suiteWithNullDesc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Suite',
        description: null,
        slug: 'test-suite',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AppSuiteSchema.safeParse(suiteWithNullDesc);
      expect(result.success).toBe(true);
    });

    it('rejects invalid uuid', () => {
      const invalidSuite = {
        id: 'not-a-uuid',
        name: 'Test Suite',
        description: null,
        slug: 'test-suite',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AppSuiteSchema.safeParse(invalidSuite);
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const incompleteSuite = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Suite',
      };

      const result = AppSuiteSchema.safeParse(incompleteSuite);
      expect(result.success).toBe(false);
    });
  });

  describe('AppSchema', () => {
    it('validates a valid app', () => {
      const validApp = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        suite_id: null,
        name: 'Test App',
        slug: 'test-app',
        tagline: 'A test app',
        description: 'Description here',
        icon_url: null,
        external_url: 'https://example.com',
        demo_url: null,
        tech_stack: ['React', 'TypeScript'],
        status: 'available',
        order_index: 0,
        meta_title: null,
        meta_description: null,
        og_image: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AppSchema.safeParse(validApp);
      expect(result.success).toBe(true);
    });

    it('validates all status values', () => {
      const statuses = ['planned', 'in_development', 'available', 'archived'] as const;

      for (const status of statuses) {
        const app = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          suite_id: null,
          name: 'Test App',
          slug: 'test-app',
          tagline: null,
          description: null,
          icon_url: null,
          external_url: null,
          demo_url: null,
          tech_stack: null,
          status,
          order_index: 0,
          meta_title: null,
          meta_description: null,
          og_image: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const result = AppSchema.safeParse(app);
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      const appWithInvalidStatus = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        suite_id: null,
        name: 'Test App',
        slug: 'test-app',
        tagline: null,
        description: null,
        icon_url: null,
        external_url: null,
        demo_url: null,
        tech_stack: null,
        status: 'invalid_status',
        order_index: 0,
        meta_title: null,
        meta_description: null,
        og_image: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AppSchema.safeParse(appWithInvalidStatus);
      expect(result.success).toBe(false);
    });
  });

  describe('BlogPostSchema', () => {
    it('validates a valid blog post', () => {
      const validPost = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Post',
        slug: 'test-post',
        excerpt: 'A test excerpt',
        content: '# Hello World',
        cover_image: null,
        tags: ['tech', 'test'],
        status: 'published',
        published_at: '2024-01-01T00:00:00Z',
        scheduled_for: null,
        reading_time: 5,
        meta_title: null,
        meta_description: null,
        og_image: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = BlogPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it('validates all blog post statuses', () => {
      const statuses = ['draft', 'published', 'scheduled'] as const;

      for (const status of statuses) {
        const post = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post',
          slug: 'test-post',
          excerpt: null,
          content: '# Hello',
          cover_image: null,
          tags: null,
          status,
          published_at: null,
          scheduled_for: null,
          reading_time: null,
          meta_title: null,
          meta_description: null,
          og_image: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const result = BlogPostSchema.safeParse(post);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('WorkHistoryEntrySchema', () => {
    it('validates a valid work history entry', () => {
      const validEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Software Engineer',
        company: 'Test Corp',
        period: '2020 - Present',
        highlights: ['Built features', 'Led team'],
        tech: ['React', 'Node.js'],
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = WorkHistoryEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
    });

    it('requires highlights to be an array', () => {
      const invalidEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Software Engineer',
        company: 'Test Corp',
        period: '2020 - Present',
        highlights: 'Not an array',
        tech: ['React'],
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = WorkHistoryEntrySchema.safeParse(invalidEntry);
      expect(result.success).toBe(false);
    });
  });

  describe('parseResponse', () => {
    it('returns parsed data for valid input', () => {
      const validSuite = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Suite',
        description: null,
        slug: 'test-suite',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = parseResponse(AppSuiteSchema, validSuite, 'test');
      expect(result.name).toBe('Test Suite');
    });

    it('throws for invalid input', () => {
      const invalidSuite = { id: 'not-valid' };

      expect(() => {
        parseResponse(AppSuiteSchema, invalidSuite, 'test');
      }).toThrow('Invalid response format from test');
    });
  });

  describe('parseArrayResponse', () => {
    it('returns parsed array for valid input', () => {
      const validSuites = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Suite 1',
          description: null,
          slug: 'suite-1',
          order_index: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          name: 'Suite 2',
          description: 'Description',
          slug: 'suite-2',
          order_index: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const result = parseArrayResponse(AppSuiteSchema, validSuites, 'test');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Suite 1');
      expect(result[1].name).toBe('Suite 2');
    });

    it('returns empty array for empty input', () => {
      const result = parseArrayResponse(AppSuiteSchema, [], 'test');
      expect(result).toHaveLength(0);
    });

    it('throws if any item is invalid', () => {
      const mixedSuites = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Valid Suite',
          description: null,
          slug: 'valid-suite',
          order_index: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        { id: 'invalid' },
      ];

      expect(() => {
        parseArrayResponse(AppSuiteSchema, mixedSuites, 'test');
      }).toThrow('Invalid response format from test');
    });
  });
});
