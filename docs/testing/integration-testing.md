# Integration Testing Guide

This document outlines the integration testing strategy for MeJohnC.Org, focusing on API contract validation, database integration, authentication flows, and third-party service integration.

## Overview

Integration tests verify that different parts of the system work correctly together. Unlike unit tests that isolate individual functions, integration tests validate the interactions between components, services, and external systems.

### Why Integration Testing?

- **Contract Validation**: Ensures API endpoints adhere to the OpenAPI specification defined in `docs/api/openapi.yaml`
- **Data Flow Verification**: Confirms data flows correctly from frontend through API to database
- **Authentication Integrity**: Validates Clerk authentication and Supabase RLS policies work together
- **Third-Party Integration**: Tests Ghost CMS, Sentry, and other external service integrations

### Test Pyramid Position

```
         /\
        /  \     E2E Tests (Playwright)
       /----\
      /      \   Integration Tests <-- This Guide
     /--------\
    /          \ Unit Tests (Vitest)
   --------------
```

## Scope of Integration Tests

### API Endpoint Testing

Integration tests cover all API endpoints defined in the OpenAPI specification:

| Endpoint                       | Method | Description                    |
| ------------------------------ | ------ | ------------------------------ |
| `/functions/v1/health-check`   | GET    | System health status           |
| `/functions/v1/metrics-webhook`| POST   | Metrics data ingestion         |
| Supabase REST API              | CRUD   | Database operations via RLS    |

#### Endpoint Categories

1. **Health Endpoints**: System status and dependency checks
2. **Webhook Endpoints**: External data ingestion (metrics, webhooks)
3. **Data Endpoints**: CRUD operations via Supabase client
4. **Auth Endpoints**: Clerk session validation

### Database Integration

Test database operations through the Supabase client:

- **Query Validation**: Verify `supabase-queries.ts` functions return expected data shapes
- **RLS Policy Testing**: Confirm Row Level Security policies enforce access control
- **Transaction Integrity**: Test multi-step operations maintain data consistency
- **Schema Validation**: Ensure responses match Zod schemas in `lib/schemas.ts`

### Authentication Flows

Test the complete authentication lifecycle:

1. **Session Creation**: Clerk authentication initializes correctly
2. **Token Propagation**: JWT tokens pass correctly to Supabase
3. **Permission Enforcement**: RBAC rules in `lib/rbac.ts` are applied
4. **Session Expiry**: Expired tokens are handled gracefully

### Third-Party Service Integration

| Service   | Integration Point           | Test Focus                          |
| --------- | --------------------------- | ----------------------------------- |
| Clerk     | `@clerk/clerk-react`        | Authentication, user management     |
| Supabase  | `@supabase/supabase-js`     | Database, storage, realtime         |
| Ghost CMS | `@tryghost/content-api`     | Blog content fetching               |
| Sentry    | `@sentry/react`             | Error tracking, performance         |

## Testing Strategy

### Test Environment Setup

#### Environment Configuration

Create a `.env.test` file for integration test configuration:

```env
# Test-specific Supabase project (or local instance)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_test_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test Clerk instance
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Mock Ghost CMS (use MSW)
VITE_GHOST_URL=http://localhost:3001

# Disable Sentry in tests
VITE_SENTRY_DSN=
```

#### Local Supabase Setup

For isolated integration testing, use Supabase local development:

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db reset

# Run integration tests
npm run test:integration
```

### Database Seeding

#### Seed Data Strategy

Create deterministic test data that covers edge cases:

```typescript
// src/test/seeds/integration-seeds.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

export async function seedTestData() {
  // Seed apps with various statuses
  await supabase.from('apps').insert([
    {
      name: 'Test App Active',
      slug: 'test-app-active',
      status: 'active',
      is_featured: true,
    },
    {
      name: 'Test App Coming Soon',
      slug: 'test-app-coming',
      status: 'coming_soon',
      is_featured: false,
    },
  ]);

  // Seed contacts for CRM tests
  await supabase.from('contacts').insert([
    {
      name: 'Test Contact',
      email: 'test@example.com',
      status: 'active',
    },
  ]);

  // Seed tasks for task system tests
  await supabase.from('tasks').insert([
    {
      title: 'Integration Test Task',
      status: 'todo',
      priority: 'medium',
    },
  ]);
}

export async function cleanupTestData() {
  // Clean in reverse order of foreign key dependencies
  await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('apps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
```

### Test Isolation

Each integration test should be isolated and not depend on other tests:

```typescript
// src/test/integration/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { seedTestData, cleanupTestData } from '../seeds/integration-seeds';

beforeAll(async () => {
  // One-time setup: verify database connection
  await verifyDatabaseConnection();
});

beforeEach(async () => {
  // Seed fresh data before each test
  await seedTestData();
});

afterEach(async () => {
  // Clean up after each test
  await cleanupTestData();
});

afterAll(async () => {
  // Final cleanup
  await cleanupTestData();
});
```

## Tools and Frameworks

### Vitest for Test Runner

Vitest is already configured in `vite.config.ts`. Extend it for integration tests:

```typescript
// vitest.config.integration.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.integration.test.ts'],
      setupFiles: ['./src/test/integration/setup.ts'],
      testTimeout: 30000, // Longer timeout for integration tests
      hookTimeout: 30000,
      pool: 'forks', // Isolate tests in separate processes
      poolOptions: {
        forks: {
          singleFork: true, // Run sequentially to avoid DB conflicts
        },
      },
      env: {
        NODE_ENV: 'test',
      },
    },
  })
);
```

Add npm script to `package.json`:

```json
{
  "scripts": {
    "test:integration": "vitest run --config vitest.config.integration.ts",
    "test:integration:watch": "vitest --config vitest.config.integration.ts"
  }
}
```

### Supertest for API Testing

Use Supertest (or native fetch with test utilities) for HTTP testing:

```typescript
// src/test/utils/api-client.ts
import { createClient } from '@supabase/supabase-js';

export function createTestClient(accessToken?: string) {
  const client = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
      },
    }
  );
  return client;
}

export async function fetchAPI(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = process.env.VITE_SUPABASE_URL;
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
```

### MSW for Mocking External Services

Mock Service Worker (MSW) intercepts network requests for predictable testing:

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Ghost CMS API
  http.get('*/ghost/api/content/posts/*', () => {
    return HttpResponse.json({
      posts: [
        {
          id: 'test-post-1',
          title: 'Test Blog Post',
          slug: 'test-blog-post',
          html: '<p>Test content</p>',
          published_at: '2024-01-01T00:00:00.000Z',
        },
      ],
    });
  }),

  // Mock external webhook responses
  http.post('*/functions/v1/metrics-webhook', async ({ request }) => {
    const body = await request.json();

    if (!body.source_slug) {
      return HttpResponse.json(
        { error: 'Validation Error', message: 'source_slug required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Metrics received',
      inserted: 1,
    });
  }),
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Configure MSW in test setup:

```typescript
// src/test/integration/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

## Writing Integration Tests

### API Contract Validation

Validate responses match the OpenAPI specification:

```typescript
// src/lib/api.integration.test.ts
import { describe, it, expect } from 'vitest';
import { fetchAPI } from '../test/utils/api-client';
import { HealthCheckResponseSchema } from './schemas';

describe('Health Check API', () => {
  it('returns valid health check response', async () => {
    const response = await fetchAPI('/functions/v1/health-check');
    const data = await response.json();

    expect(response.status).toBe(200);

    // Validate against schema
    const parsed = HealthCheckResponseSchema.safeParse(data);
    expect(parsed.success).toBe(true);

    // Verify required fields
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
  });

  it('includes all health checks', async () => {
    const response = await fetchAPI('/functions/v1/health-check');
    const data = await response.json();

    expect(data.checks).toBeDefined();
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('auth');
  });
});
```

### Request/Response Schema Testing

Use Zod schemas for runtime validation:

```typescript
// src/lib/apps.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient } from '../test/utils/api-client';
import { AppSchema, parseArrayResponse } from './schemas';

describe('Apps API Integration', () => {
  const client = createTestClient();

  it('fetches apps with valid schema', async () => {
    const { data, error } = await client
      .from('apps')
      .select('*')
      .order('display_order');

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Validate each app matches schema
    const apps = parseArrayResponse(AppSchema, data, 'apps');
    expect(apps.length).toBeGreaterThan(0);

    // Verify data types
    apps.forEach((app) => {
      expect(typeof app.id).toBe('string');
      expect(typeof app.name).toBe('string');
      expect(typeof app.slug).toBe('string');
    });
  });

  it('filters apps by status', async () => {
    const { data, error } = await client
      .from('apps')
      .select('*')
      .eq('status', 'active');

    expect(error).toBeNull();
    data?.forEach((app) => {
      expect(app.status).toBe('active');
    });
  });

  it('returns featured apps correctly', async () => {
    const { data, error } = await client
      .from('apps')
      .select('*')
      .eq('is_featured', true);

    expect(error).toBeNull();
    data?.forEach((app) => {
      expect(app.is_featured).toBe(true);
    });
  });
});
```

### Error Handling Tests

Test error responses match the expected format:

```typescript
// src/lib/errors.integration.test.ts
import { describe, it, expect } from 'vitest';
import { fetchAPI } from '../test/utils/api-client';
import { ErrorResponseSchema } from './schemas';

describe('Error Handling', () => {
  it('returns 400 for invalid webhook payload', async () => {
    const response = await fetchAPI('/functions/v1/metrics-webhook', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'payload' }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    const parsed = ErrorResponseSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(data.error).toBeDefined();
  });

  it('returns 401 for unauthenticated requests', async () => {
    const client = createTestClient(); // No auth token

    const { error } = await client
      .from('admin_only_table')
      .select('*');

    expect(error).toBeDefined();
    expect(error?.code).toBe('42501'); // PostgreSQL permission denied
  });

  it('returns 429 for rate-limited requests', async () => {
    // Simulate rapid requests to trigger rate limiting
    const requests = Array(100)
      .fill(null)
      .map(() => fetchAPI('/functions/v1/health-check'));

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status === 429);

    // At least some should be rate limited
    expect(rateLimited.length).toBeGreaterThan(0);

    const data = await rateLimited[0].json();
    expect(data.retryAfter).toBeDefined();
  });
});
```

### Authentication/Authorization Tests

Test the complete auth flow:

```typescript
// src/lib/auth.integration.test.ts
import { describe, it, expect } from 'vitest';
import { createTestClient } from '../test/utils/api-client';

describe('Authentication Integration', () => {
  describe('Anonymous Access', () => {
    const anonClient = createTestClient();

    it('allows reading public apps', async () => {
      const { data, error } = await anonClient
        .from('apps')
        .select('id, name, slug, status')
        .eq('status', 'active');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('blocks writing to protected tables', async () => {
      const { error } = await anonClient
        .from('apps')
        .insert({ name: 'Unauthorized App', slug: 'unauth' });

      expect(error).toBeDefined();
    });
  });

  describe('Authenticated Access', () => {
    // Use a test user token (obtained from Clerk test mode)
    const authClient = createTestClient(process.env.TEST_USER_TOKEN);

    it('allows CRUD on user-owned resources', async () => {
      // Create
      const { data: created, error: createError } = await authClient
        .from('tasks')
        .insert({ title: 'Auth Test Task', status: 'todo' })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(created.title).toBe('Auth Test Task');

      // Update
      const { error: updateError } = await authClient
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', created.id);

      expect(updateError).toBeNull();

      // Delete
      const { error: deleteError } = await authClient
        .from('tasks')
        .delete()
        .eq('id', created.id);

      expect(deleteError).toBeNull();
    });
  });

  describe('RBAC Enforcement', () => {
    it('enforces role-based permissions', async () => {
      // Test that admin-only operations fail for regular users
      const userClient = createTestClient(process.env.TEST_USER_TOKEN);

      const { error } = await userClient
        .from('audit_logs')
        .delete()
        .neq('id', '');

      expect(error).toBeDefined();
    });
  });
});
```

## Test Data Management

### Fixtures

Static test data for consistent testing:

```typescript
// src/test/fixtures/apps.ts
export const testApps = {
  active: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Active Test App',
    slug: 'active-test-app',
    status: 'active',
    is_featured: true,
    technologies: ['React', 'TypeScript'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  comingSoon: {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'Coming Soon App',
    slug: 'coming-soon-app',
    status: 'coming_soon',
    is_featured: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

// src/test/fixtures/contacts.ts
export const testContacts = {
  activeCustomer: {
    id: '323e4567-e89b-12d3-a456-426614174002',
    name: 'Jane Customer',
    email: 'jane@example.com',
    status: 'customer',
    tags: ['vip', 'tech'],
  },
  lead: {
    id: '423e4567-e89b-12d3-a456-426614174003',
    name: 'John Lead',
    email: 'john@example.com',
    status: 'lead',
  },
};
```

### Factories

Generate dynamic test data:

```typescript
// src/test/factories/index.ts
import { faker } from '@faker-js/faker';

export function createApp(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    tagline: faker.company.catchPhrase(),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(['active', 'coming_soon', 'deprecated']),
    technologies: faker.helpers.arrayElements(['React', 'TypeScript', 'Node.js', 'Python'], 3),
    is_featured: faker.datatype.boolean(),
    display_order: faker.number.int({ min: 0, max: 100 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createContact(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    company: faker.company.name(),
    title: faker.person.jobTitle(),
    status: faker.helpers.arrayElement(['active', 'inactive', 'lead', 'customer']),
    tags: faker.helpers.arrayElements(['vip', 'tech', 'sales', 'partner'], 2),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createTask(overrides = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(['todo', 'in_progress', 'review', 'done']),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
    due_date: faker.date.future().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}
```

### Database Cleanup

Ensure clean state between tests:

```typescript
// src/test/utils/cleanup.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Tables in dependency order (children first)
const TABLES_TO_CLEAN = [
  'task_comments',
  'task_reminders',
  'tasks',
  'email_events',
  'email_campaigns',
  'email_subscribers',
  'contacts',
  'apps',
  'projects',
  'blog_posts',
];

export async function cleanDatabase() {
  for (const table of TABLES_TO_CLEAN) {
    // Use a marker to identify test data
    await supabase
      .from(table)
      .delete()
      .like('id', 'test-%');
  }
}

export async function truncateTestTables() {
  // For complete cleanup (use with caution)
  for (const table of TABLES_TO_CLEAN) {
    await supabase.rpc('truncate_table', { table_name: table });
  }
}
```

## Running Integration Tests

### Separate from Unit Tests

Integration tests run separately from unit tests:

```bash
# Unit tests (fast, isolated)
npm run test:run

# Integration tests (slower, requires services)
npm run test:integration

# All tests
npm run test:all
```

Configure in `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:integration": "vitest run --config vitest.config.integration.ts",
    "test:all": "vitest run && vitest run --config vitest.config.integration.ts"
  }
}
```

### CI/CD Pipeline Integration

Add integration tests to GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      supabase:
        image: supabase/postgres:latest
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 54322:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Start Supabase
        run: npx supabase start

      - name: Apply migrations
        run: npx supabase db reset

      - run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          VITE_SUPABASE_URL: http://localhost:54321
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          VITE_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Best Practices and Patterns

### 1. Test Independence

Each test should be able to run in isolation:

```typescript
// Good: Self-contained test
it('creates and retrieves an app', async () => {
  const app = createApp({ name: 'Test App' });
  await supabase.from('apps').insert(app);

  const { data } = await supabase
    .from('apps')
    .select()
    .eq('id', app.id)
    .single();

  expect(data.name).toBe('Test App');

  // Cleanup
  await supabase.from('apps').delete().eq('id', app.id);
});

// Bad: Depends on previous test
it('retrieves the app created in previous test', async () => {
  // This will fail if run alone
  const { data } = await supabase
    .from('apps')
    .select()
    .eq('name', 'Test App');
  expect(data).toBeDefined();
});
```

### 2. Descriptive Test Names

Test names should describe the scenario and expected outcome:

```typescript
// Good
describe('Apps API', () => {
  it('returns 404 when fetching non-existent app by slug', async () => {});
  it('filters apps by status when status query param is provided', async () => {});
  it('returns apps sorted by display_order ascending by default', async () => {});
});

// Bad
describe('Apps', () => {
  it('works', async () => {});
  it('test 1', async () => {});
});
```

### 3. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('updates task status and returns updated record', async () => {
  // Arrange
  const task = createTask({ status: 'todo' });
  await supabase.from('tasks').insert(task);

  // Act
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'in_progress' })
    .eq('id', task.id)
    .select()
    .single();

  // Assert
  expect(error).toBeNull();
  expect(data.status).toBe('in_progress');
  expect(data.updated_at).not.toBe(task.updated_at);

  // Cleanup
  await supabase.from('tasks').delete().eq('id', task.id);
});
```

### 4. Test Real Scenarios

Focus on realistic user workflows:

```typescript
describe('Contact Management Workflow', () => {
  it('completes lead-to-customer conversion flow', async () => {
    // Create lead
    const lead = createContact({ status: 'lead' });
    await supabase.from('contacts').insert(lead);

    // Add interaction note
    await supabase.from('contact_notes').insert({
      contact_id: lead.id,
      content: 'Initial call completed',
    });

    // Convert to customer
    await supabase
      .from('contacts')
      .update({ status: 'customer' })
      .eq('id', lead.id);

    // Verify conversion
    const { data } = await supabase
      .from('contacts')
      .select('*, contact_notes(*)')
      .eq('id', lead.id)
      .single();

    expect(data.status).toBe('customer');
    expect(data.contact_notes).toHaveLength(1);
  });
});
```

### 5. Handle Async Operations

Properly await all async operations:

```typescript
// Good
it('handles concurrent updates correctly', async () => {
  const task = createTask();
  await supabase.from('tasks').insert(task);

  // Concurrent updates
  const [result1, result2] = await Promise.all([
    supabase.from('tasks').update({ priority: 'high' }).eq('id', task.id),
    supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id),
  ]);

  expect(result1.error).toBeNull();
  expect(result2.error).toBeNull();
});
```

### 6. Mock External Services

Always mock services you don't control:

```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

it('handles Ghost CMS API errors gracefully', async () => {
  // Override handler for this test
  server.use(
    http.get('*/ghost/api/content/posts/*', () => {
      return HttpResponse.json(
        { errors: [{ message: 'API rate limit exceeded' }] },
        { status: 429 }
      );
    })
  );

  const { error } = await fetchBlogPosts();
  expect(error).toBeDefined();
  expect(error.message).toContain('rate limit');
});
```

### 7. Test Edge Cases

Include boundary conditions and error states:

```typescript
describe('Pagination', () => {
  it('returns empty array when offset exceeds total count', async () => {
    const { data } = await supabase
      .from('apps')
      .select('*')
      .range(10000, 10010);

    expect(data).toEqual([]);
  });

  it('handles negative limit gracefully', async () => {
    const { error } = await supabase
      .from('apps')
      .select('*')
      .limit(-1);

    expect(error).toBeDefined();
  });
});
```

### 8. Document Test Requirements

Include setup requirements in test files:

```typescript
/**
 * Integration tests for Email Campaign API
 *
 * Requirements:
 * - Local Supabase instance running
 * - Email tables seeded (see seeds/email-seeds.ts)
 * - MSW server running for external email API mocks
 *
 * Run with: npm run test:integration -- --grep "Email Campaign"
 */
describe('Email Campaign API', () => {
  // ...
});
```

## Related Documentation

- [OpenAPI Specification](../api/openapi.yaml) - API contract definitions
- [Database Migrations](../devops/database-migrations.md) - Schema management
- [Staging Environment](../devops/staging-environment.md) - Test environment setup
- [Incident Playbook](../runbooks/incident-playbook.md) - Production issue handling

## Changelog

| Date       | Author              | Change                     |
| ---------- | ------------------- | -------------------------- |
| 2024-01-20 | Integration Testing | Initial documentation      |
