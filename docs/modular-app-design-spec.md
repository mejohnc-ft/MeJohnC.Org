# Modular App Engineering Design Specification

> **Version:** 0.1.1-draft
> **Status:** Draft
> **Last Updated:** 2026-01-20

## 0. Current Alignment with centrexai-core (2026-01)

**What already matches the core repo today**
- Monorepo: pnpm + Turborepo workspaces (`apps/*`, `packages/*`).
- Runtime: Node.js 20+, strict TypeScript via shared `@core/config` tsconfig.
- API: Hono + Zod, shared request context via `@core/context`, db helpers via `@core/db` (RLS config setters), shared contracts via `@core/contracts`.
- Data: PostgreSQL with RLS helper functions in core migrations; Azure Bicep for infra.
- Frontend: Vite + React in `apps/web`.

**Not yet implemented in core but required by this spec**
- Dynamic module loader and `/v1/{app}` namespacing for FeatureModules (API is currently monolithic).
- FeatureModule extras (tools, shutdown hooks, adapters) are not wired; `@core/context` exposes a minimal `FeatureModule` shape.
- Auth/tenant/permission adapter switching (standalone/sidecar/integrated) is not wired into the API middleware.
- Per-app migration prefixing is not enforced by tooling; core migrations use shared tables without per-app prefixes.

**How to build now and stay integration-ready**
- Structure new apps under `apps/{app-name}` using the layout in Section 3.1; extend `@core/config/tsconfig.base.json` or `node.json`.
- Export a `FeatureModule` from `src/integration/module.ts` even if the API does not yet load it; keep namespaced prefixes (e.g., `alignment_*`).
- Use `@core/db` helpers for RLS context (`setTenantContext`, etc.) and adopt the tenant/table conventions in Section 6 so migrations drop into the platform DB later.
- Mount routes at `/` for standalone; design them to be mountable under `/v1/{app}` without path changes.
- Implement auth/tenant/permission adapters behind config flags (`AUTH_MODE`, `TENANT_MODE`, `PERMISSION_MODE`), defaulting to standalone paths; keep the platform modes stubbed but ready.

## Overview

This specification defines the engineering contract for building standalone applications that are designed for future integration into the centrexai platform. Apps following this spec can operate independently while maintaining clear integration boundaries for unified authentication, tenant context, data flows, and agent interactions.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLATFORM INTEGRATION LAYER                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Unified   │  │   Tenant    │  │   Shared    │  │    Agent    │    │
│  │    Auth     │  │   Context   │  │  Services   │  │   Gateway   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │           │
│  ═══════╪════════════════╪════════════════╪════════════════╪═══════════│
│         │                │                │                │           │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐    │
│  │  Alignment  │  │     CRM     │  │  Knowledge  │  │   [Future   │    │
│  │  Dashboard  │  │             │  │    Base     │  │    Apps]    │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │           │
│  ═══════╪════════════════╪════════════════╪════════════════╪═══════════│
│         │                │                │                │           │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐    │
│  │  External   │  │  External   │  │  External   │  │  External   │    │
│  │  PSA/RMM    │  │    CRM      │  │    Docs     │  │   [APIs]    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                      EXTERNAL DATA SOURCES                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Principle:** Apps are **thin interface layers** over external data sources. They normalize external APIs into a consistent platform contract. The platform provides unified auth, tenant context, and agent access - apps provide the adapter logic and data transformations.

---

## 1. Mandatory Tech Stack

All modular apps **MUST** use the platform's standardized technology stack. This is non-negotiable - consistency enables seamless integration and shared tooling.

### 1.1 Required Technologies

| Layer               | Technology         | Version/Config         | Notes                                      |
| ------------------- | ------------------ | ---------------------- | ------------------------------------------ |
| **Runtime**         | Node.js            | 20+ LTS                | Use `.nvmrc` or `.node-version`            |
| **Language**        | TypeScript         | Strict mode            | `"strict": true` in tsconfig               |
| **Package Manager** | pnpm               | 9+                     | Workspace protocol for internal deps       |
| **Monorepo**        | Turborepo          | Latest                 | Shared build/test/lint pipelines           |
| **API Framework**   | Hono               | 4.x                    | Lightweight, edge-compatible               |
| **Validation**      | Zod                | 3.x                    | Runtime validation + type inference        |
| **Database**        | PostgreSQL         | 15+                    | With ltree, uuid-ossp extensions           |
| **Data Access**     | pg (node-postgres) | 8.x                    | Direct SQL, no ORM                         |
| **Security**        | Row-Level Security | Platform RLS functions | `app.current_tenant_id()` etc.             |
| **Cloud**           | Microsoft Azure    | -                      | Container Apps, PostgreSQL Flexible Server |
| **Frontend**        | React              | 18+                    | If app has UI                              |
| **Build**           | Vite               | 5.x                    | For frontend builds                        |

### 1.2 Forbidden Technologies

To maintain consistency, the following are **NOT PERMITTED** in modular apps:

| Category         | Forbidden                 | Use Instead        |
| ---------------- | ------------------------- | ------------------ |
| Package managers | npm, yarn                 | pnpm               |
| ORMs             | Prisma, TypeORM, Drizzle  | Direct SQL with pg |
| API frameworks   | Express, Fastify, Koa     | Hono               |
| Validation       | Joi, Yup, class-validator | Zod                |
| Cloud providers  | AWS, GCP (for infra)      | Azure              |
| Databases        | MySQL, MongoDB, SQLite    | PostgreSQL         |

### 1.3 Shared Configuration

Apps inherit shared configuration from platform packages:

```json
// package.json
{
  "devDependencies": {
    "@core/config": "workspace:*" // Shared tsconfig, eslint
  }
}
```

```json
// tsconfig.json
{
  "extends": "@core/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 1.4 What's Left to Design

With the tech stack locked in, app design focuses **only** on:

| Design Area               | Description                             |
| ------------------------- | --------------------------------------- |
| **Domain Model**          | Entities, relationships, business rules |
| **UX/UI**                 | User flows, screens, interactions       |
| **External Integrations** | Which PSA/RMM/CRM adapters to implement |
| **Agent Tools**           | What AI teammates can do with this app  |
| **API Surface**           | Endpoints, request/response shapes      |
| **Permissions**           | What roles can do what                  |

---

## 2. App Lifecycle Modes

Every modular app operates in one of three modes:

| Mode           | Auth                     | Tenant                       | Database                  | Deployment  |
| -------------- | ------------------------ | ---------------------------- | ------------------------- | ----------- |
| **Standalone** | Own IdP or shared Entra  | Single-tenant or app-managed | Own DB instance           | Independent |
| **Sidecar**    | Platform JWT passthrough | Platform context via header  | Own schema in platform DB | Co-located  |
| **Integrated** | Platform middleware      | Full RequestContext          | Shared schema with RLS    | Embedded    |

### 2.1 Mode Transition Path

```
STANDALONE ──► SIDECAR ──► INTEGRATED
     │              │             │
     │              │             └── FeatureModule interface
     │              │                 Full RLS, shared tenants
     │              │
     │              └── Platform JWT validation
     │                  Own schema, tenant header
     │
     └── Self-contained
         Own auth, own DB
```

---

## 3. App Structure Requirements

### 3.1 Repository Structure

```
apps/
  └── {app-name}/
      ├── src/
      │   ├── index.ts              # Entry point
      │   ├── app.ts                # Hono app factory
      │   ├── config.ts             # Configuration loader
      │   ├── routes/               # Route handlers
      │   │   └── index.ts
      │   ├── services/             # Business logic
      │   ├── repositories/         # Data access
      │   └── integration/          # Platform integration hooks
      │       ├── module.ts         # FeatureModule export
      │       ├── auth-adapter.ts   # Auth mode switching
      │       └── context-adapter.ts# Tenant context adaptation
      │
      ├── migrations/               # App-specific migrations
      │   └── {app}_001_initial.sql
      │
      ├── contracts/                # App-specific Zod schemas
      │   ├── index.ts
      │   └── schemas/
      │
      ├── package.json
      └── tsconfig.json
```

### 3.2 Package Dependencies

```json
{
  "dependencies": {
    "@core/context": "workspace:*",
    "@core/contracts": "workspace:*",
    "@core/db": "workspace:*",
    "@core/shared": "workspace:*",
    "hono": "^4.x"
  },
  "devDependencies": {
    "@core/config": "workspace:*"
  },
  "peerDependencies": {
    "@core/ai": "workspace:*",
    "@core/teammate": "workspace:*"
  }
}
```

**Rule:** Core packages are dependencies; AI packages are peer dependencies (optional for non-AI apps).

---

## 4. Integration Contracts

### 4.1 FeatureModule Interface (Required)

Every app **MUST** export a `FeatureModule` for platform integration:

```typescript
// src/integration/module.ts
import type { FeatureModule } from '@core/context';
import { createRoutes } from '../routes';

export const appModule: FeatureModule = {
  // Unique identifier (kebab-case)
  name: 'company-alignment',

  // SemVer for API compatibility
  version: '1.0.0',

  // Route factory - receives platform router
  routes: (router) => {
    createRoutes(router);
  },

  // Migration configuration
  migrations: {
    prefix: 'alignment', // Table prefix: alignment_*
    directory: './migrations',
  },

  // Optional: Async initialization
  initialize: async () => {
    // Warm caches, validate config, etc.
  },

  // Optional: Graceful shutdown
  shutdown: async () => {
    // Close connections, flush buffers
  },
};
```

### 4.2 Auth Adapter Pattern (Required)

Apps must support multiple auth modes via adapter:

```typescript
// src/integration/auth-adapter.ts
import type { IdentityContext } from '@core/context';
import { jwtValidator } from '@core/api/middleware';

export type AuthMode = 'standalone' | 'platform' | 'disabled';

export interface AuthAdapter {
  mode: AuthMode;
  middleware: MiddlewareHandler;
  getIdentity: (c: Context) => IdentityContext | undefined;
}

export function createAuthAdapter(mode: AuthMode): AuthAdapter {
  switch (mode) {
    case 'platform':
      // Use platform JWT validation
      return {
        mode,
        middleware: jwtValidator,
        getIdentity: (c) => c.get('identity'),
      };

    case 'standalone':
      // App-specific auth (e.g., own Entra app registration)
      return {
        mode,
        middleware: standaloneJwtValidator,
        getIdentity: (c) => c.get('identity'),
      };

    case 'disabled':
      // Dev mode - stub identity
      return {
        mode,
        middleware: devAuthMiddleware,
        getIdentity: () => ({
          sub: 'dev-user',
          email: 'dev@local',
          name: 'Dev User',
        }),
      };
  }
}

// Configuration-driven
const authMode = (process.env.AUTH_MODE as AuthMode) ?? 'standalone';
export const authAdapter = createAuthAdapter(authMode);
```

### 4.3 Tenant Context Adapter (Required)

Apps must handle tenant context in all modes:

```typescript
// src/integration/context-adapter.ts
import type { TenantContext, RequestContext } from '@core/context';

export type TenantMode = 'platform' | 'standalone' | 'single';

export interface TenantAdapter {
  mode: TenantMode;
  resolveTenant: (c: Context) => Promise<TenantContext | null>;
  wrapDbContext: <T>(tenant: TenantContext, fn: () => Promise<T>) => Promise<T>;
}

export function createTenantAdapter(mode: TenantMode): TenantAdapter {
  switch (mode) {
    case 'platform':
      // Full platform tenant resolution
      return {
        mode,
        resolveTenant: async (c) => c.get('requestContext')?.tenant ?? null,
        wrapDbContext: async (tenant, fn) => {
          return withTenantContext(tenant, fn);
        },
      };

    case 'standalone':
      // App manages own tenant table
      return {
        mode,
        resolveTenant: async (c) => {
          const tenantId = c.req.header('X-Tenant-ID');
          return tenantId ? await findAppTenant(tenantId) : null;
        },
        wrapDbContext: async (tenant, fn) => {
          // App's own tenant scoping
          return withAppTenantContext(tenant, fn);
        },
      };

    case 'single':
      // Single-tenant mode (no tenant resolution)
      return {
        mode,
        resolveTenant: async () => ({
          id: 'single',
          name: 'Default',
          type: 'account',
          hierarchyPath: 'default',
        }),
        wrapDbContext: async (_, fn) => fn(),
      };
  }
}
```

---

## 5. Permissions Architecture

### 5.1 Permission Abstraction Layer

Apps define their own permissions that can be mapped to platform permissions on integration:

```typescript
// src/integration/permissions.ts

/**
 * App-specific permission definitions.
 * These are used in standalone mode and mapped to platform permissions on integration.
 */
export const APP_PERMISSIONS = {
  // Resource-level permissions (app namespace)
  'alignment:read': 'View objectives and key results',
  'alignment:write': 'Create and update objectives',
  'alignment:delete': 'Delete objectives',
  'alignment:admin': 'Manage alignment settings',
} as const;

export type AppPermission = keyof typeof APP_PERMISSIONS;

/**
 * Permission resolver interface - allows swapping standalone vs platform resolution.
 */
export interface PermissionResolver {
  /** Get permissions for current request context */
  resolve(context: RequestContext): Promise<string[]>;

  /** Check if context has specific permission */
  hasPermission(context: RequestContext, permission: string): Promise<boolean>;

  /** Check if context has all specified permissions */
  hasAllPermissions(context: RequestContext, permissions: string[]): Promise<boolean>;

  /** Check if context has any of the specified permissions */
  hasAnyPermission(context: RequestContext, permissions: string[]): Promise<boolean>;
}
```

### 5.2 Standalone Permission Resolver

```typescript
// src/integration/permissions-standalone.ts

/**
 * Standalone mode: App manages its own role → permission mapping.
 */
export function createStandalonePermissionResolver(): PermissionResolver {
  // Role to permission mapping (app-managed)
  const rolePermissions: Record<string, AppPermission[]> = {
    owner: ['alignment:read', 'alignment:write', 'alignment:delete', 'alignment:admin'],
    admin: ['alignment:read', 'alignment:write', 'alignment:delete'],
    member: ['alignment:read', 'alignment:write'],
    viewer: ['alignment:read'],
  };

  return {
    async resolve(context) {
      const role = context.tenant?.role ?? 'viewer';
      return rolePermissions[role] ?? [];
    },

    async hasPermission(context, permission) {
      const perms = await this.resolve(context);
      return perms.includes(permission);
    },

    async hasAllPermissions(context, permissions) {
      const perms = await this.resolve(context);
      return permissions.every((p) => perms.includes(p));
    },

    async hasAnyPermission(context, permissions) {
      const perms = await this.resolve(context);
      return permissions.some((p) => perms.includes(p));
    },
  };
}
```

### 5.3 Platform Permission Resolver

```typescript
// src/integration/permissions-platform.ts

/**
 * Platform mode: Permissions come from platform context, mapped to app permissions.
 */
export function createPlatformPermissionResolver(
  mappings: PlatformPermissionMappings
): PermissionResolver {
  return {
    async resolve(context) {
      // Platform permissions are already in context
      const platformPerms = context.permissions ?? [];

      // Map platform permissions to app permissions
      const appPerms: string[] = [];
      for (const platformPerm of platformPerms) {
        const mapped = mappings[platformPerm];
        if (mapped) {
          appPerms.push(...mapped);
        }
      }

      return [...new Set(appPerms)]; // Dedupe
    },

    async hasPermission(context, permission) {
      const perms = await this.resolve(context);
      return perms.includes(permission);
    },

    async hasAllPermissions(context, permissions) {
      const perms = await this.resolve(context);
      return permissions.every((p) => perms.includes(p));
    },

    async hasAnyPermission(context, permissions) {
      const perms = await this.resolve(context);
      return permissions.some((p) => perms.includes(p));
    },
  };
}

/**
 * Platform → App permission mappings.
 * Configure this when integrating with platform.
 */
export type PlatformPermissionMappings = Record<string, AppPermission[]>;

// Example mapping configuration
export const defaultPlatformMappings: PlatformPermissionMappings = {
  // Platform permission → App permissions
  'apps:read': ['alignment:read'],
  'apps:write': ['alignment:read', 'alignment:write'],
  'apps:admin': ['alignment:read', 'alignment:write', 'alignment:delete', 'alignment:admin'],

  // Or more granular platform permissions
  'alignment:*': ['alignment:read', 'alignment:write', 'alignment:delete', 'alignment:admin'],
};
```

### 5.4 Permission Resolver Factory

```typescript
// src/integration/permissions-factory.ts

export type PermissionMode = 'standalone' | 'platform';

export function createPermissionResolver(
  mode: PermissionMode,
  platformMappings?: PlatformPermissionMappings
): PermissionResolver {
  switch (mode) {
    case 'standalone':
      return createStandalonePermissionResolver();

    case 'platform':
      return createPlatformPermissionResolver(platformMappings ?? defaultPlatformMappings);
  }
}

// Usage in route handlers
const permissionResolver = createPermissionResolver(config.permissionMode);

app.post('/objectives', async (c) => {
  const context = c.get('requestContext')!;

  if (!(await permissionResolver.hasPermission(context, 'alignment:write'))) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  // ... create objective
});
```

### 5.5 Permission Middleware Helper

```typescript
// src/middleware/require-permission.ts

export function requirePermission(...permissions: string[]) {
  return async (c: Context, next: Next) => {
    const context = c.get('requestContext');
    if (!context) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }

    const hasAccess =
      permissions.length === 1
        ? await permissionResolver.hasPermission(context, permissions[0])
        : await permissionResolver.hasAnyPermission(context, permissions);

    if (!hasAccess) {
      throw new HTTPException(403, {
        message: `Required permissions: ${permissions.join(' | ')}`,
      });
    }

    await next();
  };
}

// Usage
app.post('/objectives', requirePermission('alignment:write'), async (c) => {
  // Handler is only reached if permission check passes
});

app.delete(
  '/objectives/:id',
  requirePermission('alignment:delete', 'alignment:admin'),
  async (c) => {
    // Either permission grants access
  }
);
```

---

## 6. Database Architecture

### 6.1 Deployment Strategy

Apps use **separate databases in standalone mode** but follow **platform-compatible schema conventions** for seamless integration:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STANDALONE MODE                                   │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  alignment_db   │  │     crm_db      │  │      kb_db      │         │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │         │
│  │ │    app.*    │ │  │ │    app.*    │ │  │ │    app.*    │ │         │
│  │ │ alignment_* │ │  │ │    crm_*    │ │  │ │     kb_*    │ │         │
│  │ │  (tables)   │ │  │ │  (tables)   │ │  │ │  (tables)   │ │         │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │         │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │         │
│  │ │ app.tenants │ │  │ │ app.tenants │ │  │ │ app.tenants │ │         │
│  │ │ (local copy)│ │  │ │ (local copy)│ │  │ │ (local copy)│ │         │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                          │
│                           ▼ INTEGRATION ▼                                │
│                                                                          │
│                        INTEGRATED MODE                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        platform_db                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │    core     │  │  alignment  │  │     crm     │  │    kb     │ │   │
│  │  │   tables    │  │   tables    │  │   tables    │  │  tables   │ │   │
│  │  │ app.tenants │  │ alignment_* │  │    crm_*    │  │   kb_*    │ │   │
│  │  │ app.users   │  │             │  │             │  │           │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘│   │
│  │                                                                   │   │
│  │  Unified RLS: All tables reference app.tenants, use same         │   │
│  │  session variables: app.current_tenant_id(), etc.                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Principle:** Apps design schemas as if they're already in the platform DB. The only difference in standalone mode is the DB connection string and a local copy of the `tenants` table.

### 6.2 Standalone Tenant Table

In standalone mode, apps maintain a simplified local tenant table for foreign key integrity:

```sql
-- Standalone mode: simplified tenant table
-- (synced from platform or managed locally)
CREATE TABLE app.tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'account',
  hierarchy_path ltree,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the RLS helper functions (same as platform)
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;
```

### 6.3 Table Naming Convention

All app tables **MUST** use the app prefix:

```sql
-- Pattern: app.{app_prefix}_{table_name}

-- Example: Alignment Dashboard
CREATE TABLE app.alignment_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES app.tenants(id),
  -- ... columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Example: CRM
CREATE TABLE app.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES app.tenants(id),
  -- ... columns
);

-- Example: Knowledge Base
CREATE TABLE app.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES app.tenants(id),
  -- ... columns
);
```

### 6.4 Required Columns

Every app table **MUST** include:

| Column       | Type          | Constraint                            | Purpose             |
| ------------ | ------------- | ------------------------------------- | ------------------- |
| `id`         | `UUID`        | `PRIMARY KEY`                         | Unique identifier   |
| `tenant_id`  | `UUID`        | `NOT NULL REFERENCES app.tenants(id)` | Tenant ownership    |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`              | Audit trail         |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`              | Audit trail         |
| `deleted_at` | `TIMESTAMPTZ` | nullable                              | Soft delete support |

### 6.5 RLS Policy Template

Every table **MUST** have RLS policies:

```sql
-- Enable RLS
ALTER TABLE app.{prefix}_{table} ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY {prefix}_{table}_tenant_isolation ON app.{prefix}_{table}
  FOR ALL
  USING (
    tenant_id = app.current_tenant_id()
    OR app.can_access_tenant(
      (SELECT hierarchy_path FROM app.tenants WHERE id = tenant_id)
    )
  );

-- Platform bypass (for admin operations)
CREATE POLICY {prefix}_{table}_platform_bypass ON app.{prefix}_{table}
  FOR ALL
  TO platform_admin
  USING (true);
```

### 6.6 Migration File Format

```sql
-- migrations/{prefix}_001_initial.sql
-- App: {App Name}
-- Description: Initial schema setup
-- Depends: 002_tenants_table (core)

BEGIN;

-- Create tables
CREATE TABLE app.{prefix}_example (
  -- columns
);

-- Create indexes
CREATE INDEX idx_{prefix}_example_tenant
  ON app.{prefix}_example(tenant_id);

-- Enable RLS
ALTER TABLE app.{prefix}_example ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY {prefix}_example_tenant_isolation
  ON app.{prefix}_example
  FOR ALL
  USING (tenant_id = app.current_tenant_id());

COMMIT;
```

---

## 7. API Contract Requirements

### 7.1 Route Mounting Convention

```typescript
// Standalone mode: own base path
app.route('/', routes);
// → GET /objectives, POST /objectives

// Platform mode: namespaced under /v1/{app}
platform.route('/v1/alignment', routes);
// → GET /v1/alignment/objectives
```

### 7.2 Request/Response Schemas

Apps **MUST** define Zod schemas for all endpoints:

```typescript
// contracts/schemas/objective.ts
import { z } from 'zod';
import { uuidSchema, paginationSchema, paginatedResponseSchema } from '@core/contracts';

// Request schemas
export const createObjectiveRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: uuidSchema.optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateObjectiveRequestSchema = createObjectiveRequestSchema.partial();

export const listObjectivesQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'completed', 'archived']).optional(),
  parentId: uuidSchema.optional(),
});

// Response schemas
export const objectiveResponseSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['active', 'completed', 'archived']),
  parentId: uuidSchema.nullable(),
  dueDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const objectiveListResponseSchema = paginatedResponseSchema(objectiveResponseSchema);

// Type exports
export type CreateObjectiveRequest = z.infer<typeof createObjectiveRequestSchema>;
export type ObjectiveResponse = z.infer<typeof objectiveResponseSchema>;
```

### 7.3 Error Response Format

Apps **MUST** use RFC 7807 Problem Details:

```typescript
import { createProblemDetail, ErrorCode } from '@core/contracts';

// Custom app error codes extend the base
export const AlignmentErrorCode = {
  ...ErrorCode,
  OBJECTIVE_NOT_FOUND: 'ALIGNMENT_001',
  OBJECTIVE_CYCLE_DETECTED: 'ALIGNMENT_002',
  INVALID_PARENT_REFERENCE: 'ALIGNMENT_003',
} as const;

// Usage in handlers
if (!objective) {
  throw new HTTPException(404, {
    message: createProblemDetail({
      code: AlignmentErrorCode.OBJECTIVE_NOT_FOUND,
      title: 'Objective Not Found',
      detail: `Objective ${id} does not exist or is not accessible`,
    }),
  });
}
```

---

## 8. Agent Integration Hooks

### 8.1 Tool Registration Interface

Apps exposing functionality to AI teammates **MUST** register tools:

```typescript
// src/integration/tools.ts
import { createTool, type Tool } from '@core/teammate';

export const alignmentTools: Tool[] = [
  createTool({
    name: 'alignment_list_objectives',
    description:
      'List company objectives and key results. Use to understand current goals and their status.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'completed', 'archived'],
          description: 'Filter by objective status',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return',
          default: 10,
        },
      },
    },
    execute: async (args, context) => {
      const objectives = await objectiveService.list(context.tenantId, {
        status: args.status,
        limit: args.limit,
      });
      return {
        success: true,
        data: objectives.map(formatObjectiveForAgent),
      };
    },
  }),

  createTool({
    name: 'alignment_get_objective',
    description:
      'Get detailed information about a specific objective including key results and progress.',
    parameters: {
      type: 'object',
      properties: {
        objectiveId: {
          type: 'string',
          format: 'uuid',
          description: 'The objective ID to retrieve',
        },
      },
      required: ['objectiveId'],
    },
    execute: async (args, context) => {
      const objective = await objectiveService.getWithKeyResults(
        context.tenantId,
        args.objectiveId
      );
      if (!objective) {
        return { success: false, error: 'Objective not found' };
      }
      return { success: true, data: formatObjectiveDetailForAgent(objective) };
    },
  }),

  createTool({
    name: 'alignment_update_progress',
    description:
      'Update progress on a key result. Requires the key result ID and new progress value.',
    parameters: {
      type: 'object',
      properties: {
        keyResultId: { type: 'string', format: 'uuid' },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        note: { type: 'string', description: 'Optional progress note' },
      },
      required: ['keyResultId', 'progress'],
    },
    execute: async (args, context) => {
      // Permission check
      if (!context.permissions.includes('alignment:write')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      const result = await keyResultService.updateProgress(
        context.tenantId,
        args.keyResultId,
        args.progress,
        args.note
      );
      return { success: true, data: result };
    },
  }),
];
```

### 8.2 Tool Registration in Module

```typescript
// src/integration/module.ts
export const appModule: FeatureModule = {
  name: 'company-alignment',
  version: '1.0.0',
  routes: (router) => createRoutes(router),
  migrations: { prefix: 'alignment', directory: './migrations' },

  // Agent integration
  tools: alignmentTools,

  // Tool permissions mapping
  toolPermissions: {
    alignment_list_objectives: ['alignment:read'],
    alignment_get_objective: ['alignment:read'],
    alignment_update_progress: ['alignment:write'],
  },
};
```

---

## 9. External Data Source Integration

### 9.1 Adapter Pattern

Apps are **thin interfaces** over external data sources. Each app implements adapters for specific external systems:

```typescript
// src/adapters/types.ts

/**
 * Base interface for external system adapters.
 * Each adapter normalizes an external API into platform-standard types.
 */
export interface ExternalAdapter<TConfig = unknown> {
  /** Unique identifier for this adapter */
  readonly name: string;

  /** External system type (e.g., 'connectwise', 'halo', 'autotask') */
  readonly systemType: string;

  /** Initialize connection with tenant-specific config */
  initialize(config: TConfig): Promise<void>;

  /** Health check for the external connection */
  health(): Promise<AdapterHealth>;

  /** Clean up connections */
  dispose(): Promise<void>;
}

export interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  lastSync?: string;
  error?: string;
}
```

### 9.2 Example: PSA Adapter

```typescript
// src/adapters/psa/connectwise.ts
import type { ExternalAdapter } from '../types';
import type { Ticket, Contact, Company } from '../../contracts';

export interface ConnectWiseConfig {
  baseUrl: string;
  companyId: string;
  publicKey: string;
  privateKey: string;
}

export interface PSAAdapter extends ExternalAdapter<ConnectWiseConfig> {
  // Normalized operations - same interface regardless of PSA vendor
  tickets: {
    list(filters?: TicketFilters): Promise<Ticket[]>;
    get(id: string): Promise<Ticket | null>;
    create(data: CreateTicketRequest): Promise<Ticket>;
    update(id: string, data: UpdateTicketRequest): Promise<Ticket>;
  };
  contacts: {
    list(filters?: ContactFilters): Promise<Contact[]>;
    get(id: string): Promise<Contact | null>;
    search(query: string): Promise<Contact[]>;
  };
  companies: {
    list(filters?: CompanyFilters): Promise<Company[]>;
    get(id: string): Promise<Company | null>;
  };
}

export function createConnectWiseAdapter(): PSAAdapter {
  let client: ConnectWiseClient | null = null;

  return {
    name: 'connectwise-psa',
    systemType: 'connectwise',

    async initialize(config) {
      client = new ConnectWiseClient(config);
      await client.authenticate();
    },

    async health() {
      if (!client) return { status: 'unhealthy', error: 'Not initialized' };
      try {
        const start = Date.now();
        await client.ping();
        return { status: 'healthy', latencyMs: Date.now() - start };
      } catch (e) {
        return { status: 'unhealthy', error: String(e) };
      }
    },

    async dispose() {
      client = null;
    },

    tickets: {
      async list(filters) {
        const cwTickets = await client!.serviceTickets.list(filters);
        return cwTickets.map(mapConnectWiseTicket); // Normalize to platform type
      },
      // ... other methods
    },
    // ... other resources
  };
}
```

### 9.3 Adapter Registry

```typescript
// src/adapters/registry.ts

export type AdapterFactory<T extends ExternalAdapter = ExternalAdapter> = () => T;

const adapterFactories = new Map<string, AdapterFactory>();

export function registerAdapter(systemType: string, factory: AdapterFactory): void {
  adapterFactories.set(systemType, factory);
}

export function createAdapter<T extends ExternalAdapter>(systemType: string): T {
  const factory = adapterFactories.get(systemType);
  if (!factory) {
    throw new Error(`Unknown adapter type: ${systemType}`);
  }
  return factory() as T;
}

// Registration (in app initialization)
registerAdapter('connectwise', createConnectWiseAdapter);
registerAdapter('halo', createHaloPSAAdapter);
registerAdapter('autotask', createAutotaskAdapter);
```

### 9.4 Tenant-Scoped Adapter Access

```typescript
// src/services/adapter-manager.ts

/**
 * Manages per-tenant adapter instances with connection pooling.
 */
export class AdapterManager {
  private adapters = new Map<string, ExternalAdapter>();

  async getAdapter<T extends ExternalAdapter>(tenantId: string, systemType: string): Promise<T> {
    const key = `${tenantId}:${systemType}`;

    if (!this.adapters.has(key)) {
      // Load tenant config from DB
      const config = await this.loadTenantConfig(tenantId, systemType);

      // Create and initialize adapter
      const adapter = createAdapter<T>(systemType);
      await adapter.initialize(config);

      this.adapters.set(key, adapter);
    }

    return this.adapters.get(key) as T;
  }

  private async loadTenantConfig(tenantId: string, systemType: string) {
    // Fetch from app's config table (encrypted credentials)
    const result = await query(
      `SELECT config FROM app.{prefix}_integrations
       WHERE tenant_id = $1 AND system_type = $2`,
      [tenantId, systemType]
    );
    return result.rows[0]?.config;
  }
}
```

---

## 10. Configuration Requirements

### 10.1 Required Environment Variables

```bash
# App identification
APP_NAME=company-alignment
APP_VERSION=1.0.0

# Integration mode
AUTH_MODE=standalone|platform|disabled
TENANT_MODE=standalone|platform|single

# Database (standalone mode)
DATABASE_URL=postgres://...

# Platform integration (sidecar/integrated mode)
PLATFORM_API_URL=http://api:3000
PLATFORM_DB_SCHEMA=app

# Feature flags
FEATURE_AGENT_TOOLS=true
FEATURE_EVENT_BUS=false
```

### 10.2 Configuration Loader Pattern

```typescript
// src/config.ts
import { z } from 'zod';

const configSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
  }),
  auth: z.object({
    mode: z.enum(['standalone', 'platform', 'disabled']),
    // Standalone-specific
    entraClientId: z.string().optional(),
    entraTenantId: z.string().optional(),
  }),
  tenant: z.object({
    mode: z.enum(['standalone', 'platform', 'single']),
  }),
  database: z.object({
    url: z.string(),
  }),
  platform: z.object({
    apiUrl: z.string().optional(),
    dbSchema: z.string().default('app'),
  }),
  features: z.object({
    agentTools: z.boolean().default(true),
    eventBus: z.boolean().default(false),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = configSchema.parse({
    app: {
      name: process.env.APP_NAME ?? 'unknown',
      version: process.env.APP_VERSION ?? '0.0.0',
    },
    auth: {
      mode: process.env.AUTH_MODE ?? 'standalone',
      entraClientId: process.env.ENTRA_CLIENT_ID,
      entraTenantId: process.env.ENTRA_TENANT_ID,
    },
    tenant: {
      mode: process.env.TENANT_MODE ?? 'standalone',
    },
    database: {
      url: process.env.DATABASE_URL!,
    },
    platform: {
      apiUrl: process.env.PLATFORM_API_URL,
      dbSchema: process.env.PLATFORM_DB_SCHEMA,
    },
    features: {
      agentTools: process.env.FEATURE_AGENT_TOOLS !== 'false',
      eventBus: process.env.FEATURE_EVENT_BUS === 'true',
    },
  });

  return cachedConfig;
}
```

---

## 11. Testing Requirements

### 11.1 Test Structure

```
apps/{app-name}/
  └── tests/
      ├── unit/
      │   ├── services/
      │   └── repositories/
      ├── integration/
      │   ├── api/              # HTTP endpoint tests
      │   └── database/         # Migration & query tests
      └── fixtures/
          ├── tenants.ts        # Test tenant factory
          └── {domain}.ts       # Domain-specific factories
```

### 11.2 Integration Test Pattern

```typescript
// tests/integration/api/objectives.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, createTestTenant, cleanupTestData } from '../fixtures';

describe('Objectives API', () => {
  let app: TestApp;
  let tenant: TestTenant;

  beforeAll(async () => {
    app = await createTestApp({ authMode: 'disabled' });
    tenant = await createTestTenant();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it('creates an objective', async () => {
    const res = await app.request('/objectives', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenant.id,
      },
      body: JSON.stringify({
        title: 'Test Objective',
        description: 'Test description',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Test Objective');
    expect(body.tenantId).toBe(tenant.id);
  });

  it('enforces tenant isolation', async () => {
    const otherTenant = await createTestTenant();

    // Create in tenant A
    const createRes = await app.request('/objectives', {
      method: 'POST',
      headers: { 'X-Tenant-ID': tenant.id },
      body: JSON.stringify({ title: 'Tenant A Objective' }),
    });
    const objective = await createRes.json();

    // Try to access from tenant B
    const getRes = await app.request(`/objectives/${objective.id}`, {
      headers: { 'X-Tenant-ID': otherTenant.id },
    });

    expect(getRes.status).toBe(404);
  });
});
```

---

## 12. Deployment Checklist

### 12.1 Standalone Release Checklist

- [ ] All tests passing
- [ ] Migrations tested against clean database
- [ ] Environment variables documented
- [ ] Health endpoints implemented (`/health/live`, `/health/ready`)
- [ ] Docker image builds successfully
- [ ] API documentation generated (OpenAPI spec)
- [ ] README with setup instructions

### 12.2 Platform Integration Checklist

- [ ] FeatureModule exported and documented
- [ ] Auth adapter supports `platform` mode
- [ ] Tenant adapter supports `platform` mode
- [ ] All tables use app prefix convention
- [ ] RLS policies reference `app.current_tenant_id()`
- [ ] Migrations use numbered prefix format
- [ ] Agent tools registered (if applicable)
- [ ] Event types defined (if applicable)
- [ ] Integration tests pass with platform auth
- [ ] No hardcoded tenant IDs or user IDs

---

## 13. Standalone-First Delivery Checklist (until platform module loader ships)

- [ ] Create `apps/{app}/package.json` using pnpm workspace, extend `@core/config` tsconfig, target Node 20, strict TS.
- [ ] Implement Hono app with routes under `/`; keep handlers path-agnostic so they can be mounted under `/v1/{app}` later.
- [ ] Add `src/integration/module.ts` exporting a `FeatureModule` (name, version, routes, migrations), even though the API does not yet auto-load it.
- [ ] Use auth/tenant/permission adapters with config (`AUTH_MODE`, `TENANT_MODE`, `PERMISSION_MODE`), defaulting to standalone; keep platform branches stubbed but typed.
- [ ] Prefix all tables `app.{prefix}_*`, include required columns, enable RLS, and reuse platform helper functions (`app.current_tenant_id`, `app.can_access_tenant`).
- [ ] Store migrations in `apps/{app}/migrations` with numbered prefixes; validate against a clean DB using the same RLS helpers as core.
- [ ] Register agent tools via `@core/teammate` as peer dependencies; map tool permissions to app permissions.
- [ ] Provide health endpoints (`/health/live`, `/health/ready`) and ensure Dockerfile targets Azure Container Apps.
- [ ] Run lint/test/typecheck via `turbo run` (or direct package scripts) before release.

---

## 14. App Specification Template

Use this template when designing a new modular app. **Tech stack is predetermined** (see Section 1) - focus only on UX and functionality.

```markdown
# {App Name} Engineering Specification

> **App Prefix:** {prefix}
> **Version:** 0.1.0
> **Status:** Draft

## Tech Stack (Locked)

This app uses the platform's mandatory tech stack. See Section 1 of the Modular App Design Spec.

| Layer      | Technology              |
| ---------- | ----------------------- |
| Runtime    | Node.js 20+             |
| Language   | TypeScript (strict)     |
| API        | Hono 4.x                |
| Validation | Zod 3.x                 |
| Database   | PostgreSQL 15+ with RLS |
| Frontend   | React 18+ / Vite 5.x    |
| Cloud      | Azure Container Apps    |

**No deviations permitted.**

---

## 1. Overview

### Purpose

{1-2 sentences: What problem does this app solve?}

### Value Proposition

{Why would users want this? What's the benefit?}

### External Data Sources

{What PSA/RMM/CRM/etc systems does this app integrate with?}

---

## 2. User Experience

### User Personas

- **{Persona 1}**: {Role and goals}
- **{Persona 2}**: {Role and goals}

### Key User Flows

1. **{Flow 1}**: {Step-by-step user journey}
2. **{Flow 2}**: {Step-by-step user journey}

### Screens / Views

| Screen     | Purpose   | Key Actions         |
| ---------- | --------- | ------------------- |
| {Screen 1} | {Purpose} | {Actions available} |
| {Screen 2} | {Purpose} | {Actions available} |

---

## 3. Domain Model

### Entities

| Entity     | Description   | Key Fields              |
| ---------- | ------------- | ----------------------- |
| {Entity 1} | {Description} | id, tenant_id, {fields} |
| {Entity 2} | {Description} | id, tenant_id, {fields} |

### Relationships

{Diagram or description of entity relationships}

### Business Rules

- {Rule 1}: {Description}
- {Rule 2}: {Description}

---

## 4. External Integrations

### Adapters Required

| System Type | Example Vendors             | Operations        |
| ----------- | --------------------------- | ----------------- |
| {PSA}       | ConnectWise, Halo, Autotask | {CRUD operations} |
| {RMM}       | Datto, NinjaRMM             | {Operations}      |

### Data Mapping

| External Field | Platform Field   | Transform        |
| -------------- | ---------------- | ---------------- |
| {ext_field}    | {platform_field} | {transformation} |

---

## 5. API Endpoints

| Method | Path             | Description     | Permission      |
| ------ | ---------------- | --------------- | --------------- |
| GET    | /{resources}     | List resources  | {prefix}:read   |
| POST   | /{resources}     | Create resource | {prefix}:write  |
| GET    | /{resources}/:id | Get resource    | {prefix}:read   |
| PATCH  | /{resources}/:id | Update resource | {prefix}:write  |
| DELETE | /{resources}/:id | Delete resource | {prefix}:delete |

---

## 6. Database Schema

### Tables

- `app.{prefix}_{table1}` - {description}
- `app.{prefix}_{table2}` - {description}

### Key Indexes

| Table   | Index                         | Purpose         |
| ------- | ----------------------------- | --------------- |
| {table} | idx*{prefix}*{table}\_{field} | {query pattern} |

---

## 7. Agent Tools

| Tool Name                    | Description      | Permission     |
| ---------------------------- | ---------------- | -------------- |
| {prefix}_list_{resources}    | {What AI can do} | {prefix}:read  |
| {prefix}_get_{resource}      | {What AI can do} | {prefix}:read  |
| {prefix}_{action}_{resource} | {What AI can do} | {prefix}:write |

---

## 8. Permissions

| Permission      | Description               | Default Roles                |
| --------------- | ------------------------- | ---------------------------- |
| {prefix}:read   | View {resources}          | viewer, member, admin, owner |
| {prefix}:write  | Create/update {resources} | member, admin, owner         |
| {prefix}:delete | Delete {resources}        | admin, owner                 |
| {prefix}:admin  | Manage settings           | owner                        |

---

## 9. Configuration

| Variable                   | Required | Default | Description             |
| -------------------------- | -------- | ------- | ----------------------- |
| {PREFIX}\_EXTERNAL_API_URL | Yes      | -       | URL for external system |
| {PREFIX}\_SYNC_INTERVAL_MS | No       | 300000  | Sync frequency          |

---

## 10. Risks & Mitigations

| Risk     | Impact   | Mitigation   |
| -------- | -------- | ------------ |
| {Risk 1} | {Impact} | {Mitigation} |

---

## 11. Open Questions

- [ ] {Question 1}
- [ ] {Question 2}
```

---

## Appendix A: Example App Specifications

### A.1 Company Alignment Dashboard

```
Name: company-alignment
Prefix: alignment
Tables: alignment_objectives, alignment_key_results, alignment_check_ins
Tools: alignment_list_objectives, alignment_get_objective, alignment_update_progress
Events: alignment.objective.created, alignment.objective.completed
```

### A.2 CRM

```
Name: crm
Prefix: crm
Tables: crm_contacts, crm_companies, crm_deals, crm_activities
Tools: crm_search_contacts, crm_get_contact, crm_log_activity, crm_update_deal
Events: crm.deal.stage_changed, crm.activity.logged
```

### A.3 Knowledge Base

```
Name: knowledge-base
Prefix: kb
Tables: kb_articles, kb_categories, kb_revisions, kb_embeddings
Tools: kb_search, kb_get_article, kb_list_categories
Events: kb.article.published, kb.article.updated
```

---

## 15. Implementation Status

### 15.1 Completed: Multi-Tenant Foundation (Issue #101)

**Migration:** `supabase/migrations/004_multi_tenant.sql`

The multi-tenant foundation has been implemented with:

1. **App Schema and Tenants Table**
   - Created `app` schema namespace
   - Created `app.tenants` table with hierarchy support (ltree)
   - Default tenant (`00000000-0000-0000-0000-000000000001`) for existing data

2. **RLS Helper Functions**
   - `app.current_tenant_id()` - Get current tenant from session context
   - `app.can_access_tenant(target_hierarchy)` - Hierarchy-aware access check
   - `app.set_tenant_context(tenant_id)` - Set tenant for session
   - `app.clear_tenant_context()` - Clear tenant context
   - `app.default_tenant_id()` - Returns default tenant UUID

3. **Tenant Column Added to All Tables**
   - All feature tables now have `tenant_id UUID NOT NULL` with FK to `app.tenants`
   - Indexes created on `tenant_id` for all tables
   - Existing data migrated to default tenant

4. **Updated RLS Policies**
   - Admin policies now include tenant context checks
   - Maintains backwards compatibility (admins can still access)
   - Public read policies unchanged for published content

5. **TypeScript Integration**
   - `DEFAULT_TENANT_ID` constant exported from schemas.ts
   - `TenantSchema` and `TenantType` types added
   - All entity schemas updated with optional `tenant_id` field

**Tables Updated:**
- Core: app_suites, apps, blog_posts, projects, site_content, contact_links, work_history, case_studies, timelines, timeline_entries
- News: news_categories, news_sources, news_articles, news_filters, news_dashboard_tabs
- Agent: agent_commands, agent_responses, agent_tasks, agent_task_runs, agent_sessions, agent_confirmations
- Bookmarks: bookmarks, bookmark_collections, bookmark_import_jobs, bookmark_categories
- Marketing: email_subscribers, email_lists, email_campaigns, email_templates, email_events, nps_surveys, nps_responses, content_suggestions
- Site Builder: sb_pages, sb_page_versions, sb_page_components, sb_component_templates
- Tasks: task_categories, tasks, task_comments, task_reminders
- CRM: contacts, interactions, follow_ups, contact_lists, pipelines, pipeline_stages, deals (if present)
- Metrics: metrics_sources, metrics_data, metrics_dashboards (if present)

---

## Revision History

| Version | Date       | Author | Changes                                      |
| ------- | ---------- | ------ | -------------------------------------------- |
| 0.1.2   | 2026-01-20 | Claude | Multi-tenant foundation implemented (#101)   |
| 0.1.1   | 2026-01-20 | -      | Alignment notes added; standalone-first checklist |
| 0.1.0   | 2025-01-15 | -      | Initial draft                                |
