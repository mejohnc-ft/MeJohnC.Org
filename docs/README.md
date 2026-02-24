# MeJohnC.Org

A full-featured personal portfolio and resume website for Jonathan Christensen, AI Automation Engineer II specializing in agentic systems, Microsoft 365, Azure, and automation workflows.

**Live Site:** [mejohnc.org](https://mejohnc.org/)

## Tech Stack

| Category   | Technology                            |
| ---------- | ------------------------------------- |
| Frontend   | React 18, TypeScript, Vite            |
| Styling    | Tailwind CSS, Radix UI, Framer Motion |
| Backend    | Supabase (PostgreSQL + Real-time)     |
| Auth       | Clerk                                 |
| CMS        | Ghost (blog content)                  |
| Monitoring | Sentry, Web Vitals                    |
| Testing    | Vitest, Playwright                    |
| Deployment | Netlify, GitHub Actions               |

## Features

### Public Pages

- **Home** - Dynamic hero with name, title, and tagline
- **Portfolio** - Multi-tab interface showcasing:
  - Work history with interactive timeline
  - Curated project showcase
  - Software apps and app suites
  - Blog posts and articles
- **About** - Biography and experience details
- **Blog Detail** - Full article view with markdown rendering
- **App/Suite Detail** - Software showcase with descriptions and demos

### Admin Dashboard

- **Content Management** - Create, edit, schedule, and publish blog posts, apps, projects
- **News Aggregation** - Multi-source RSS/API feeds with curation, filtering, and bookmarking
- **AI Manager** - Chat interface with Claude AI agent for autonomous tasks
- **Task System** - Kanban board and list views for task management
- **Marketing** - Email campaigns, subscribers, templates, and NPS surveys
- **Site Builder** - Visual drag-and-drop page builder with reusable blocks
- **Metrics Dashboard** - GitHub and analytics metrics visualization
- **CRM Contacts** - Contact relationship management
- **Style Guide** - Design system and Figma integration
- **Bookmarks** - Twitter/X bookmark import and management
- **Profile & Settings** - Site configuration and profile management

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/mejohnc-ft/MeJohnC.Org.git
cd MeJohnC.Org
npm install
```

### Environment Setup

Create a `.env` file with the following variables:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Ghost CMS (optional)
VITE_GHOST_URL=your_ghost_url
VITE_GHOST_CONTENT_API_KEY=your_ghost_api_key

# Sentry (optional)
VITE_SENTRY_DSN=your_sentry_dsn
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Scripts

| Command                 | Description                   |
| ----------------------- | ----------------------------- |
| `npm run dev`           | Start development server      |
| `npm run build`         | Production build with sitemap |
| `npm run preview`       | Preview production build      |
| `npm run lint`          | Run ESLint                    |
| `npm run lint:fix`      | Fix linting issues            |
| `npm run typecheck`     | TypeScript validation         |
| `npm run test`          | Unit tests (watch mode)       |
| `npm run test:run`      | Unit tests (single run)       |
| `npm run test:coverage` | Test coverage report          |
| `npm run test:e2e`      | Playwright E2E tests          |
| `npm run test:e2e:ui`   | E2E tests with UI             |
| `npm run analyze`       | Bundle size analysis          |

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── admin/           # Admin-specific components
│   │   ├── charts/      # Dashboard chart components
│   │   └── metrics/     # Metrics display components
│   ├── marketing/       # Marketing module components
│   ├── portfolio/       # Portfolio tab components
│   ├── site-builder/    # Site builder components
│   │   └── blocks/      # Page block components
│   └── tasks/           # Task system components
├── pages/
│   ├── admin/           # Admin dashboard pages
│   └── *.tsx            # Public pages
├── lib/
│   ├── supabase.ts      # Database client
│   ├── auth.tsx         # Clerk authentication
│   ├── ghost.ts         # Ghost CMS client
│   ├── rbac.ts          # Role-based access control
│   ├── logger.ts        # Structured logging
│   ├── csrf.ts          # CSRF protection
│   └── *-queries.ts     # Database query functions
├── hooks/               # Custom React hooks
└── types/               # TypeScript definitions

supabase/
├── functions/           # Edge functions (Deno)
│   └── _shared/         # Shared utilities
└── migrations/          # Timestamped database migrations (canonical schema)

e2e/                     # Playwright tests
```

## Database

The project uses Supabase with the following main table groups:

- **Portfolio** - `apps`, `app_suites`, `projects`, `blog_posts`, `work_history`, `skills`
- **Site Content** - `site_content`, `contact_links`
- **News System** - `news_sources`, `news_articles`, `news_categories`, `news_filters`, `bookmarks`
- **AI Agent** - `agent_commands`, `agent_responses`, `agent_tasks`, `agent_sessions`
- **Marketing** - `email_subscribers`, `email_lists`, `email_campaigns`, `email_templates`, `email_events`, `nps_surveys`, `nps_responses`
- **Site Builder** - `sb_pages`, `sb_page_versions`, `sb_page_components`, `sb_component_templates`
- **Task System** - `task_categories`, `tasks`, `task_comments`, `task_reminders`
- **CRM** - Contact management tables
- **Metrics** - Analytics and metrics tables
- **Audit** - `audit_logs`

## Testing

### Unit Tests

```bash
npm run test:run
```

Uses Vitest with React Testing Library. Test files are colocated with source files (`*.test.ts`).

### E2E Tests

```bash
npm run test:e2e
```

Uses Playwright testing across Chromium, Firefox, and WebKit, including mobile viewports (Pixel 5, iPhone 12).

## Deployment

The site auto-deploys to Netlify on push to `main`. The CI pipeline:

1. Runs ESLint and TypeScript checks
2. Executes unit tests
3. Builds production bundle with sitemap
4. Generates bundle analysis
5. Deploys to Netlify

## Performance

- **Code Splitting** - Route-based lazy loading for non-critical pages
- **Optimized Bundles** - Vendor chunks split by feature (React, Framer, Markdown, Auth, etc.)
- **PWA Support** - Service worker and install banner
- **Image Optimization** - Lazy loading with Supabase Storage

## License

MIT
