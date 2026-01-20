# Developer Onboarding Guide

Welcome to MeJohnC.Org! This guide will help you set up your development environment and understand the codebase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Key Technologies](#key-technologies)
6. [Database & Backend](#database--backend)
7. [Authentication](#authentication)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x LTS | JavaScript runtime |
| npm | 10.x | Package manager |
| Git | 2.x | Version control |
| VS Code | Latest | Recommended IDE |

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "ms-playwright.playwright",
    "orta.vscode-jest"
  ]
}
```

### Required Accounts

- **GitHub**: Repository access
- **Supabase**: Database dashboard (ask for invite)
- **Clerk**: Authentication dashboard (ask for invite)
- **Netlify**: Deployment dashboard (optional)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/MeJohnC/MeJohnC.Org.git
cd MeJohnC.Org
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit with your values (ask team lead for dev credentials)
```

Required environment variables:

```env
# Clerk Authentication (get from Clerk dashboard)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# Supabase (get from Supabase dashboard)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# Ghost CMS (optional, for blog)
VITE_GHOST_URL=https://xxx.ghost.io
VITE_GHOST_CONTENT_KEY=xxx

# Sentry (optional, for error tracking)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 5. Verify Setup

- [ ] Homepage loads without errors
- [ ] Can sign in with Clerk
- [ ] Admin dashboard accessible at `/admin`
- [ ] No console errors

---

## Project Structure

```
MeJohnC.Org/
├── docs/                    # Documentation
│   ├── api/                 # API documentation (OpenAPI)
│   └── *.md                 # Guides and references
├── e2e/                     # End-to-end tests (Playwright)
├── netlify/                 # Netlify configuration
│   └── edge-functions/      # Edge functions (rate limiting)
├── public/                  # Static assets
│   ├── _headers             # Security headers
│   └── _redirects           # URL redirects
├── scripts/                 # Build and utility scripts
│   └── service-installers/  # Deployment scripts
├── src/
│   ├── components/          # React components
│   │   ├── admin/           # Admin-specific components
│   │   ├── marketing/       # Marketing module components
│   │   ├── site-builder/    # Site builder components
│   │   ├── tasks/           # Task system components
│   │   └── ui/              # Shared UI components (shadcn/ui)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and services
│   │   ├── supabase.ts      # Supabase client
│   │   ├── rbac.ts          # Role-based access control
│   │   ├── logger.ts        # Structured logging
│   │   └── *-queries.ts     # Database query functions
│   ├── pages/               # Page components
│   │   ├── admin/           # Admin pages
│   │   └── *.tsx            # Public pages
│   ├── App.tsx              # Main router
│   └── main.tsx             # Entry point
├── supabase/
│   ├── functions/           # Edge functions (Deno)
│   │   ├── _shared/         # Shared utilities
│   │   └── */index.ts       # Individual functions
│   └── migrations/          # Database migrations
└── package.json
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/components/ui/` | shadcn/ui components (don't modify directly) |
| `src/lib/*-queries.ts` | Database operations grouped by feature |
| `src/pages/admin/` | Admin dashboard pages |
| `supabase/functions/` | Server-side logic (Deno runtime) |

---

## Development Workflow

### Branch Strategy

```
main                    # Production branch
├── feature/xxx         # New features
├── fix/xxx             # Bug fixes
├── chore/xxx           # Maintenance tasks
└── docs/xxx            # Documentation updates
```

### Commit Convention

We use conventional commits:

```
type(scope): description

feat(marketing): add email campaign scheduling
fix(tasks): resolve kanban drag-drop issue
docs(api): update OpenAPI specification
chore(deps): upgrade React to 18.3
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with meaningful commits
3. Run tests: `npm run test && npm run lint`
4. Push and create PR
5. Request review
6. Merge after approval

---

## Key Technologies

### Frontend Stack

| Technology | Purpose | Docs |
|------------|---------|------|
| React 18 | UI framework | [react.dev](https://react.dev) |
| TypeScript | Type safety | [typescriptlang.org](https://typescriptlang.org) |
| Vite | Build tool | [vitejs.dev](https://vitejs.dev) |
| React Router 7 | Routing | [reactrouter.com](https://reactrouter.com) |
| Tailwind CSS | Styling | [tailwindcss.com](https://tailwindcss.com) |
| shadcn/ui | UI components | [ui.shadcn.com](https://ui.shadcn.com) |
| Framer Motion | Animations | [framer.com/motion](https://framer.com/motion) |

### Backend Stack

| Technology | Purpose | Docs |
|------------|---------|------|
| Supabase | Database + Auth | [supabase.com/docs](https://supabase.com/docs) |
| Clerk | User auth | [clerk.com/docs](https://clerk.com/docs) |
| Ghost CMS | Blog content | [ghost.org/docs](https://ghost.org/docs) |
| Netlify | Hosting | [docs.netlify.com](https://docs.netlify.com) |

---

## Database & Backend

### Supabase Client

```typescript
import { supabase } from '@/lib/supabase';

// Query example
const { data, error } = await supabase
  .from('apps')
  .select('*')
  .eq('status', 'active');
```

### Query Functions

Use the query functions in `src/lib/*-queries.ts`:

```typescript
import { getApps, createApp, updateApp } from '@/lib/supabase-queries';

// Fetching
const apps = await getApps();

// Creating
const newApp = await createApp({ name: 'My App', slug: 'my-app' });

// Updating
await updateApp('uuid', { name: 'Updated Name' });
```

### Edge Functions

Located in `supabase/functions/`. To deploy:

```bash
# Deploy single function
npx supabase functions deploy health-check

# Deploy all functions
npx supabase functions deploy
```

---

## Authentication

### Clerk Integration

```typescript
import { useUser, useAuth } from '@clerk/clerk-react';

function MyComponent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  if (!isLoaded) return <Loading />;
  if (!user) return <SignIn />;

  return <div>Welcome, {user.firstName}!</div>;
}
```

### RBAC (Role-Based Access Control)

```typescript
import { usePermission, useRole } from '@/hooks/usePermissions';
import { PermissionGate, AdminOnly } from '@/components/PermissionGate';

function AdminFeature() {
  const canEdit = usePermission('apps', 'update');
  const role = useRole(); // 'admin', 'editor', 'author', 'viewer', 'guest'

  return (
    <AdminOnly>
      <SecretAdminContent />
    </AdminOnly>
  );
}
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Run tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Interactive mode
npm run test:e2e:ui
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix
npm run lint:fix
```

---

## Deployment

### Automatic Deployments

- **Production**: Push to `main` branch
- **Preview**: Create a PR (Netlify preview URL generated)

### Manual Deployments

```bash
# Build locally
npm run build

# Preview build
npm run preview
```

### Database Migrations

```bash
# Create migration
npx supabase migration new my_migration_name

# Apply locally
npx supabase db reset

# Push to production (careful!)
npx supabase db push
```

---

## Common Tasks

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add to navigation if needed

### Adding a New Admin Feature

1. Create page in `src/pages/admin/`
2. Add route in `AdminRoutes` section of `App.tsx`
3. Add to admin sidebar navigation
4. Update RBAC permissions if needed

### Creating a New Query Function

```typescript
// src/lib/my-feature-queries.ts
import { supabase } from './supabase';

export interface MyFeature {
  id: string;
  name: string;
  // ...
}

export async function getMyFeatures(): Promise<MyFeature[]> {
  const { data, error } = await supabase
    .from('my_features')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### Adding a UI Component

We use shadcn/ui. To add a new component:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

---

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
```bash
npm run typecheck  # Check for type errors
```

**Supabase connection issues**
- Verify `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase dashboard for service status

**Clerk authentication not working**
- Verify `VITE_CLERK_PUBLISHABLE_KEY` is set
- Check Clerk dashboard for allowed domains

**CSS not updating**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Getting Help

1. Check this documentation
2. Search existing GitHub issues
3. Ask in team Slack channel
4. Create a new GitHub issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

---

## Next Steps

After setup, explore these resources:

1. **API Documentation**: `docs/api/openapi.yaml`
2. **Architecture Decisions**: `docs/ADR/` (when created)
3. **Security Guide**: `docs/SECRETS_MANAGEMENT.md`
4. **Phase 3 Features**: `docs/PHASE3_REVIEW.md`

Welcome to the team! 🎉
