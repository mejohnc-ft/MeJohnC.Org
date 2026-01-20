# Contract Testing Strategy

This document outlines the contract testing approach for MeJohnC.Org, ensuring API compatibility between consumers and providers across the frontend, Supabase backend, and third-party services.

## Table of Contents

- [Overview](#overview)
- [Why Contract Testing](#why-contract-testing)
- [Tool Options](#tool-options)
- [Contract Testing Strategy](#contract-testing-strategy)
- [Implementation Guide](#implementation-guide)
- [Contracts to Define](#contracts-to-define)
- [OpenAPI Alternative](#openapi-alternative)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [When to Use Contract vs Integration Tests](#when-to-use-contract-vs-integration-tests)

## Overview

Contract testing verifies that services can communicate with each other by validating that their interactions conform to a shared understanding (contract). Unlike integration tests that test the actual connection between services, contract tests verify the format and structure of API requests and responses independently.

In the MeJohnC.Org architecture:

```
+----------------+     +------------------+     +-------------------+
|    Frontend    | --> |   Supabase API   | --> |    PostgreSQL     |
|  (React/TS)    |     |   (Edge Funcs)   |     |    (RLS/Tables)   |
+----------------+     +------------------+     +-------------------+
        |                      |
        v                      v
+----------------+     +------------------+
|   Ghost CMS    |     |   External APIs  |
|   (Blog API)   |     |  (GitHub, etc.)  |
+----------------+     +------------------+
```

## Why Contract Testing

### API Versioning Safety

Contract tests catch breaking changes before deployment:

- Schema changes (added/removed fields)
- Type changes (string to number, required to optional)
- Response structure modifications
- Error response format changes

When the API evolves, contract tests fail fast, alerting developers to compatibility issues.

### Consumer-Driven Contracts

Contracts are defined by the consumer (frontend), documenting exactly what fields and formats are expected:

```typescript
// Frontend expects this shape from /apps endpoint
interface AppResponse {
  id: string;
  name: string;
  slug: string;
  status: 'planned' | 'in_development' | 'available' | 'archived';
  suite: {
    id: string;
    name: string;
  } | null;
}
```

If the provider (Supabase) returns a different structure, the contract test fails.

### Early Breakage Detection

Benefits of contract testing:

1. **Decoupled Testing**: Test consumer and provider independently
2. **Faster Feedback**: No need to spin up the full stack
3. **Documentation**: Contracts serve as living API documentation
4. **Refactoring Confidence**: Safely modify backend without breaking frontend
5. **Parallel Development**: Frontend and backend teams work independently

## Tool Options

### Pact (Industry Standard)

[Pact](https://pact.io/) is the most widely adopted contract testing tool:

**Pros:**
- Mature ecosystem with JavaScript/TypeScript support
- Pact Broker for contract sharing and versioning
- Provider verification built-in
- Supports async message contracts
- Strong community and documentation

**Cons:**
- Learning curve for setup
- Requires running Pact Broker (SaaS or self-hosted)
- Overkill for single-team projects

**Best For:** Multi-team environments, microservices, public APIs

### OpenAPI Validation

Using the existing OpenAPI spec (`docs/api/openapi.yaml`) for validation:

**Pros:**
- Already have OpenAPI spec defined
- Tools like `openapi-typescript` generate types automatically
- Request/response validation with `express-openapi-validator` or similar
- No additional infrastructure needed

**Cons:**
- Spec can drift from implementation
- Manual effort to keep spec updated
- Limited to HTTP APIs

**Best For:** Projects with existing OpenAPI specs, simple validation needs

### TypeScript Type Guards (Runtime Validation)

Using Zod schemas (already in use) as runtime contracts:

**Pros:**
- Already integrated (`src/lib/schemas.ts`)
- TypeScript integration for compile-time safety
- `parseResponse()` and `parseArrayResponse()` provide runtime validation
- No additional dependencies

**Cons:**
- Only validates one direction (API responses)
- No automatic provider verification
- Manual test writing required

**Best For:** TypeScript projects, lightweight validation, rapid development

### Recommendation for MeJohnC.Org

Given the current architecture (single repository, TypeScript throughout, Zod already integrated), the recommended approach is a **hybrid strategy**:

1. **Primary**: Zod schemas for runtime validation (already in place)
2. **Secondary**: OpenAPI spec validation for documented APIs
3. **Future**: Pact for external API contracts if the system grows

## Contract Testing Strategy

### Consumer Contracts

Consumer contracts define what the frontend expects from APIs:

```typescript
// src/lib/contracts/apps.contract.ts
import { z } from 'zod';

// Contract for GET /apps endpoint
export const AppsListContract = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    status: z.enum(['planned', 'in_development', 'available', 'archived']),
    suite: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }).nullable(),
  })),
});

// Contract for error responses
export const ApiErrorContract = z.object({
  error: z.string(),
  message: z.string(),
  correlationId: z.string().optional(),
});
```

### Provider Verification

Provider verification ensures the API implementation matches contracts:

```typescript
// src/lib/contracts/__tests__/apps.provider.test.ts
import { describe, it, expect } from 'vitest';
import { AppsListContract } from '../apps.contract';
import { getApps } from '../../supabase-queries';

describe('Apps API Provider Verification', () => {
  it('returns data matching the consumer contract', async () => {
    // Fetch from actual API (or mock Supabase in tests)
    const apps = await getApps();

    // Verify response matches contract
    const result = AppsListContract.safeParse({ data: apps });

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Contract violations:', result.error.errors);
    }
  });
});
```

### Contract Broker

For larger projects, use Pact Broker to store and version contracts:

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on: [push, pull_request]

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run consumer contract tests
        run: npm run test:contracts:consumer
      - name: Publish contracts to Pact Broker
        run: npx pact-broker publish ./pacts --broker-base-url=${{ secrets.PACT_BROKER_URL }}

  provider-tests:
    runs-on: ubuntu-latest
    needs: consumer-tests
    steps:
      - uses: actions/checkout@v4
      - name: Verify provider against contracts
        run: npm run test:contracts:provider
```

## Implementation Guide

### Pact Setup for JavaScript/TypeScript

#### 1. Install Dependencies

```bash
npm install --save-dev @pact-foundation/pact @pact-foundation/pact-core
```

#### 2. Consumer Test Setup

```typescript
// src/lib/contracts/__tests__/apps.consumer.pact.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';

const { like, eachLike, uuid, string, regex } = MatchersV3;

const provider = new PactV3({
  consumer: 'MeJohnC-Frontend',
  provider: 'Supabase-API',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('Apps API Consumer Contract', () => {
  it('fetches list of apps', async () => {
    // Define expected interaction
    await provider
      .given('apps exist in database')
      .uponReceiving('a request for all apps')
      .withRequest({
        method: 'GET',
        path: '/rest/v1/apps',
        query: {
          select: '*,suite:app_suites(*)',
          order: 'order_index',
        },
        headers: {
          apikey: like('test-key'),
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: eachLike({
          id: uuid(),
          name: string('Task Manager'),
          slug: regex(/^[a-z0-9-]+$/, 'task-manager'),
          status: regex(/^(planned|in_development|available|archived)$/, 'available'),
          suite: like({
            id: uuid(),
            name: string('Productivity Suite'),
          }),
        }),
      });

    // Execute the test
    await provider.executeTest(async (mockService) => {
      // Configure your client to use mock service URL
      const response = await fetch(`${mockService.url}/rest/v1/apps?select=*,suite:app_suites(*)&order=order_index`, {
        headers: { apikey: 'test-key' },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
```

### Writing Consumer Tests

Consumer tests specify expectations from the consumer's perspective:

```typescript
// src/lib/contracts/__tests__/health-check.consumer.pact.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, string, integer, regex } = MatchersV3;

describe('Health Check API Contract', () => {
  const provider = new PactV3({
    consumer: 'MeJohnC-Frontend',
    provider: 'Supabase-Edge-Functions',
  });

  it('returns health status', async () => {
    await provider
      .uponReceiving('a health check request')
      .withRequest({
        method: 'GET',
        path: '/functions/v1/health-check',
      })
      .willRespondWith({
        status: 200,
        body: {
          status: regex(/^(healthy|degraded|unhealthy)$/, 'healthy'),
          timestamp: like('2024-01-15T10:30:00.000Z'),
          version: string('v1.0.0'),
          uptime: integer(3600),
          checks: {
            database: {
              status: regex(/^(pass|fail|warn)$/, 'pass'),
              latency: integer(50),
            },
            auth: {
              status: regex(/^(pass|fail|warn)$/, 'pass'),
              latency: integer(30),
            },
            storage: {
              status: regex(/^(pass|fail|warn)$/, 'pass'),
              latency: integer(40),
            },
          },
          responseTime: integer(120),
        },
      });

    await provider.executeTest(async (mockService) => {
      const response = await fetch(`${mockService.url}/functions/v1/health-check`);
      const data = await response.json();

      expect(data.status).toBeDefined();
      expect(data.checks).toBeDefined();
    });
  });
});
```

### Provider Verification

Provider verification runs against the actual provider using published contracts:

```typescript
// supabase/functions/_shared/__tests__/provider.verification.ts
import { Verifier } from '@pact-foundation/pact';
import path from 'path';

describe('Provider Verification', () => {
  it('validates the API against consumer contracts', async () => {
    const verifier = new Verifier({
      providerBaseUrl: process.env.PROVIDER_URL || 'http://localhost:54321',
      pactUrls: [path.resolve(process.cwd(), 'pacts/mejohnc-frontend-supabase-api.json')],
      // Or fetch from Pact Broker:
      // pactBrokerUrl: process.env.PACT_BROKER_URL,
      // pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      // providerVersion: process.env.GIT_COMMIT,
      stateHandlers: {
        'apps exist in database': async () => {
          // Setup test data
          // This could insert test records into Supabase
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

### Pact Broker Setup

For team collaboration, set up a Pact Broker:

**Option 1: PactFlow (SaaS)**
```bash
# Sign up at https://pactflow.io
# Get your broker URL and token
export PACT_BROKER_BASE_URL=https://your-team.pactflow.io
export PACT_BROKER_TOKEN=your-token
```

**Option 2: Self-Hosted (Docker)**
```yaml
# docker-compose.pact-broker.yml
version: '3'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact
      POSTGRES_DB: pact

  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgres://pact:pact@postgres/pact
      PACT_BROKER_BASIC_AUTH_USERNAME: admin
      PACT_BROKER_BASIC_AUTH_PASSWORD: admin
```

## Contracts to Define

### Frontend -> API Contracts

Based on the current codebase, define contracts for:

| Endpoint | Consumer Contract | Schema Reference |
|----------|-------------------|------------------|
| `GET /apps` | `AppsListContract` | `AppWithSuiteSchema` |
| `GET /apps/:slug` | `AppDetailContract` | `AppWithSuiteSchema` |
| `GET /projects` | `ProjectsListContract` | `ProjectSchema` |
| `GET /blog_posts` | `BlogPostsListContract` | `BlogPostSchema` |
| `GET /work_history` | `WorkHistoryContract` | `WorkHistoryEntrySchema` |
| `GET /news_articles` | `NewsArticlesContract` | `NewsArticle` |
| `GET /bookmarks` | `BookmarksContract` | `BookmarkSchema` |

Example contract definition matching existing Zod schemas:

```typescript
// src/lib/contracts/frontend-api.contracts.ts
import { z } from 'zod';
import {
  AppWithSuiteSchema,
  ProjectSchema,
  BlogPostSchema,
  WorkHistoryEntrySchema
} from '../schemas';

// Re-export schemas as contracts
export const FrontendContracts = {
  apps: {
    list: z.array(AppWithSuiteSchema),
    detail: AppWithSuiteSchema,
  },
  projects: {
    list: z.array(ProjectSchema),
    detail: ProjectSchema,
  },
  blogPosts: {
    list: z.array(BlogPostSchema),
    detail: BlogPostSchema,
  },
  workHistory: {
    list: z.array(WorkHistoryEntrySchema),
  },
};
```

### API -> Supabase Contracts

Define contracts for Supabase table responses:

```typescript
// src/lib/contracts/supabase.contracts.ts
import { z } from 'zod';

// Raw Supabase response contracts (before transformation)
export const SupabaseContracts = {
  tables: {
    apps: z.object({
      id: z.string().uuid(),
      suite_id: z.string().uuid().nullable(),
      name: z.string(),
      slug: z.string(),
      tagline: z.string().nullable(),
      description: z.string().nullable(),
      icon_url: z.string().nullable(),
      external_url: z.string().nullable(),
      demo_url: z.string().nullable(),
      tech_stack: z.array(z.string()).nullable(),
      status: z.enum(['planned', 'in_development', 'available', 'archived']),
      order_index: z.number(),
      meta_title: z.string().nullable(),
      meta_description: z.string().nullable(),
      og_image: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  },
  errors: {
    postgrest: z.object({
      code: z.string(),
      message: z.string(),
      details: z.string().nullable(),
      hint: z.string().nullable(),
    }),
  },
};
```

### Third-Party Service Contracts

Define contracts for external APIs:

```typescript
// src/lib/contracts/third-party.contracts.ts
import { z } from 'zod';

// Ghost CMS API contract
export const GhostPostContract = z.object({
  id: z.string(),
  uuid: z.string(),
  title: z.string(),
  slug: z.string(),
  html: z.string().nullable(),
  excerpt: z.string().nullable(),
  feature_image: z.string().nullable(),
  published_at: z.string().nullable(),
  reading_time: z.number(),
  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  })).optional(),
});

// GitHub API contract (for metrics)
export const GitHubRepoContract = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  updated_at: z.string(),
});

// Clerk user contract
export const ClerkUserContract = z.object({
  id: z.string(),
  email_addresses: z.array(z.object({
    email_address: z.string().email(),
  })),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
});
```

## OpenAPI Alternative

### Schema Validation

Use the existing OpenAPI spec for validation:

```bash
npm install --save-dev openapi-typescript
```

Generate types from OpenAPI:

```bash
npx openapi-typescript docs/api/openapi.yaml -o src/types/openapi.d.ts
```

### Request/Response Validation

```typescript
// src/lib/openapi-validator.ts
import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Load OpenAPI spec
const spec = load(readFileSync('docs/api/openapi.yaml', 'utf8')) as any;

// Create validators for each schema
export const validators = {
  healthCheck: ajv.compile(spec.components.schemas.HealthCheckResponse),
  metricsWebhook: ajv.compile(spec.components.schemas.MetricsWebhookPayload),
  error: ajv.compile(spec.components.schemas.ErrorResponse),
};

// Validation helper
export function validateResponse<T>(validator: (data: unknown) => boolean, data: unknown): T {
  if (!validator(data)) {
    throw new Error(`Validation failed: ${JSON.stringify((validator as any).errors)}`);
  }
  return data as T;
}
```

### Automated Testing

```typescript
// src/lib/__tests__/openapi-validation.test.ts
import { describe, it, expect } from 'vitest';
import { validators, validateResponse } from '../openapi-validator';

describe('OpenAPI Schema Validation', () => {
  it('validates health check response', () => {
    const validResponse = {
      status: 'healthy',
      timestamp: '2024-01-15T10:30:00.000Z',
      checks: {
        database: { status: 'pass', latency: 50 },
        auth: { status: 'pass', latency: 30 },
        storage: { status: 'pass', latency: 40 },
      },
      responseTime: 120,
    };

    expect(() => validateResponse(validators.healthCheck, validResponse)).not.toThrow();
  });

  it('rejects invalid health check response', () => {
    const invalidResponse = {
      status: 'invalid-status', // Not in enum
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(() => validateResponse(validators.healthCheck, invalidResponse)).toThrow();
  });
});
```

## CI/CD Integration

### Contract Verification in Pipeline

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  contract-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run contract tests
        run: npm run test:contracts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Publish contract results
        if: github.ref == 'refs/heads/main'
        run: |
          npx pact-broker publish ./pacts \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }} \
            --consumer-app-version=${{ github.sha }} \
            --tag=main
```

### Breaking Change Detection

Add a can-i-deploy check before deployments:

```yaml
# Add to deployment workflow
- name: Check contract compatibility
  run: |
    npx pact-broker can-i-deploy \
      --pacticipant=MeJohnC-Frontend \
      --version=${{ github.sha }} \
      --to=production \
      --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
      --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:contracts": "npm run test:contracts:zod && npm run test:contracts:pact",
    "test:contracts:zod": "vitest run src/lib/contracts/__tests__/*.zod.test.ts",
    "test:contracts:pact": "vitest run src/lib/contracts/__tests__/*.pact.test.ts",
    "test:contracts:verify": "vitest run src/lib/contracts/__tests__/*.verification.test.ts",
    "contracts:publish": "pact-broker publish ./pacts --broker-base-url=$PACT_BROKER_URL"
  }
}
```

## Best Practices

### 1. Keep Contracts Minimal

Only include fields the consumer actually uses:

```typescript
// Good: Only what frontend needs
const AppCardContract = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string().nullable(),
  icon_url: z.string().nullable(),
  status: z.enum(['planned', 'in_development', 'available', 'archived']),
});

// Avoid: Including everything "just in case"
const AppFullContract = AppSchema; // Too broad
```

### 2. Version Contracts

Include version information in contracts:

```typescript
export const ContractVersion = {
  version: '1.0.0',
  lastUpdated: '2024-01-15',
};
```

### 3. Use Flexible Matchers

Allow for optional fields and additional properties:

```typescript
// Pact matchers
const response = {
  id: uuid(),
  name: string('Example'),
  metadata: like({}), // Accept any object shape
};

// Zod with passthrough
const FlexibleContract = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough(); // Allow additional fields
```

### 4. Document Breaking Changes

Maintain a changelog for contract changes:

```markdown
## Contract Changelog

### v1.1.0 (2024-01-20)
- Added `status` field to AppContract (non-breaking)
- Changed `tech_stack` from required to optional (non-breaking)

### v1.0.0 (2024-01-01)
- Initial contract definitions
```

### 5. Test Edge Cases

Include contracts for error states:

```typescript
describe('Error Response Contracts', () => {
  it('validates 404 response', async () => {
    const error404 = {
      error: 'Not Found',
      message: 'App with slug "nonexistent" not found',
      correlationId: 'abc-123',
    };

    expect(ApiErrorContract.safeParse(error404).success).toBe(true);
  });

  it('validates rate limit response', async () => {
    const error429 = {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter: 60,
    };

    expect(RateLimitErrorContract.safeParse(error429).success).toBe(true);
  });
});
```

## When to Use Contract vs Integration Tests

### Use Contract Tests When

| Scenario | Why Contract Tests |
|----------|-------------------|
| Testing API shape/structure | Fast, isolated verification |
| Multi-team development | Clear interface boundaries |
| External API dependencies | Mock without hitting real services |
| CI/CD pipeline | Quick feedback, no infrastructure |
| Documentation needs | Contracts serve as living docs |
| Provider changes | Verify backward compatibility |

### Use Integration Tests When

| Scenario | Why Integration Tests |
|----------|----------------------|
| Testing actual connectivity | Verify real network calls |
| Database transaction flows | Test RLS policies, triggers |
| Authentication flows | Verify Clerk/Supabase integration |
| End-to-end user journeys | Full system behavior |
| Performance verification | Real latency measurements |
| Complex query behavior | Actual PostgreSQL execution |

### Decision Matrix

```
Is the test about data format/structure? --> Contract Test
Is the test about business logic?        --> Unit Test
Is the test about system integration?    --> Integration Test
Is the test about user workflows?        --> E2E Test
```

### Recommended Test Distribution

For MeJohnC.Org:

```
Total Tests
    |
    +-- Unit Tests (60%)
    |   - Component logic
    |   - Utility functions
    |   - Zod schema validation
    |
    +-- Contract Tests (15%)
    |   - API response shapes
    |   - Third-party API mocks
    |   - OpenAPI compliance
    |
    +-- Integration Tests (15%)
    |   - Supabase queries
    |   - Authentication flows
    |   - RLS policy verification
    |
    +-- E2E Tests (10%)
        - Critical user journeys
        - Cross-browser testing
        - Playwright scenarios
```

## Related Documentation

- [OpenAPI Specification](/docs/api/openapi.yaml)
- [Zod Schemas](/src/lib/schemas.ts)
- [Testing Setup](/src/test/setup.ts)
- [CI/CD Pipeline](/.github/workflows/)
