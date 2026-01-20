# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- OpenAPI documentation for API endpoints
- Developer onboarding guide
- Semantic versioning and changelog automation

## [3.0.0] - 2026-01-20

### Added

#### Phase 3 Features
- **Marketing Module**
  - Email subscriber management with engagement tracking
  - Email campaign creation and analytics
  - Email template builder with variable support
  - NPS survey management and response tracking
  - AI content suggestions component

- **Site Builder Module**
  - Drag-and-drop page builder with live preview
  - Page version history and rollback
  - 7 block types: Hero, Features, CTA, Text, Image, Spacer, Divider
  - Component library and property editor

- **Task System Module**
  - Task management with priorities and due dates
  - Kanban board view with drag-and-drop
  - Task categories and tagging
  - Task comments and reminders

#### Infrastructure & Security
- Service installer scripts for Windows, Linux, PM2, Docker (#48)
- Health check Supabase edge function (#72)
- Security headers via Netlify (CSP, HSTS, X-Frame-Options) (#57)
- API rate limiting via edge functions (#56)
- Structured logging with correlation IDs (#73)
- Input validation and size limits (#59)
- CSRF protection utilities (#58)
- Role-Based Access Control system (#55)
- Retry logic with exponential backoff (#79)
- Feature flags for safe rollouts (#77)
- Secrets management documentation (#54)

### Changed
- Reorganized documentation into `docs/` directory
- Updated package.json with proper metadata

### Fixed
- ESLint errors in Phase 3 code
- Marketing module routing issues

## [2.0.0] - 2026-01-16

### Added

#### Phase 2 Features
- **CRM Module**
  - Contact management with interactions
  - Follow-up tracking
  - Contact tagging and categorization

- **Metrics Dashboard**
  - GitHub repository metrics
  - Supabase usage analytics
  - Custom metrics webhook ingestion

- **Style Guide**
  - Component documentation
  - Design token showcase
  - Usage examples

- **Bookmark System**
  - Twitter/X bookmark import support
  - Bookmark categorization and search
  - Smaug integration preparation

### Changed
- Database schema updates for Phase 2 tables
- Improved admin navigation

## [1.0.0] - 2026-01-01

### Added

#### Phase 1 Features
- **Portfolio Management**
  - Apps showcase with categories
  - Projects showcase
  - Work history timeline

- **Blog Integration**
  - Ghost CMS connection
  - Blog post rendering
  - SEO optimization

- **Authentication**
  - Clerk authentication integration
  - Protected admin routes
  - User session management

- **News Aggregation**
  - RSS feed integration
  - News categorization
  - Read tracking

- **AI Manager**
  - Chat interface
  - Claude AI integration preparation

#### Infrastructure
- React 18 with TypeScript
- Vite build system
- Tailwind CSS styling
- Supabase backend
- Netlify deployment
- Sentry error tracking
- GitHub Actions CI/CD

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 3.0.0 | 2026-01-20 | Marketing, Site Builder, Tasks, Security |
| 2.0.0 | 2026-01-16 | CRM, Metrics, Bookmarks |
| 1.0.0 | 2026-01-01 | Initial release, Portfolio, Blog, Auth |

[Unreleased]: https://github.com/MeJohnC/MeJohnC.Org/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/MeJohnC/MeJohnC.Org/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/MeJohnC/MeJohnC.Org/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/MeJohnC/MeJohnC.Org/releases/tag/v1.0.0
