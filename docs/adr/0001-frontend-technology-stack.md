# ADR-0001: Frontend Technology Stack

## Status

Accepted

**Date:** 2025-01-20

## Context

MeJohnC.Org is a personal portfolio and admin platform that requires:

- Fast, responsive user interface for public portfolio pages
- Rich admin dashboard with complex forms and data management
- Type safety for maintainability in a solo/small team environment
- Modern development experience with hot reloading and fast builds
- Good SEO capabilities for the public-facing portfolio
- Ability to integrate with external services (Supabase, Clerk, Ghost CMS)

The project needed a frontend stack that balances developer productivity, performance, and long-term maintainability.

## Decision

We chose the following frontend technology stack:

| Category | Technology | Rationale |
|----------|------------|-----------|
| **UI Framework** | React 18 | Industry standard, large ecosystem, concurrent rendering features |
| **Language** | TypeScript | Type safety, better IDE support, reduced runtime errors |
| **Build Tool** | Vite | Extremely fast HMR, native ES modules, simple configuration |
| **Routing** | React Router 7 | De facto standard for React SPAs, data loading support |
| **Styling** | Tailwind CSS | Utility-first approach, rapid development, small bundle sizes |
| **UI Components** | shadcn/ui + Radix UI | Accessible, customizable, copy-paste components |
| **Animations** | Framer Motion | Declarative animations, gesture support, layout animations |
| **Icons** | Lucide React | Consistent icon set, tree-shakeable, TypeScript support |

## Consequences

### Positive

- **Fast development cycle**: Vite's HMR provides near-instant feedback during development
- **Type safety**: TypeScript catches errors at compile time, improving code quality
- **Accessible UI**: Radix UI primitives ensure WCAG compliance out of the box
- **Small bundle sizes**: Tailwind purges unused CSS; Vite tree-shakes unused code
- **Customizable design**: shadcn/ui components are copied into the project, not imported from npm, allowing full customization
- **Rich animations**: Framer Motion enables sophisticated animations with minimal code

### Negative

- **Learning curve**: Tailwind's utility-first approach requires adjustment for developers used to traditional CSS
- **Component ownership**: shadcn/ui components must be maintained in the codebase (though this is also a positive for customization)
- **Bundle size monitoring**: React + Framer Motion can lead to larger bundles if not carefully managed (mitigated by code splitting)

### Neutral

- React 18's concurrent features are available but not heavily utilized in the current implementation
- TypeScript strict mode is enabled, which may slow initial development but improves long-term quality

## Alternatives Considered

### Alternative 1: Next.js

Next.js was considered for its SSR/SSG capabilities and built-in routing. However:
- The project is primarily a SPA with client-side data fetching
- Supabase RLS handles data access; SSR would add complexity
- Vite provides faster development experience for this use case
- Netlify deployment is simpler with a pure SPA

### Alternative 2: Vue 3 + Nuxt

Vue 3 with Nuxt was considered as an alternative framework:
- React has a larger ecosystem and more library choices
- Team familiarity with React was higher
- React's concurrent mode features align with future needs

### Alternative 3: Plain CSS / CSS Modules

Traditional CSS approaches were considered:
- Tailwind's utility-first approach proved faster for rapid prototyping
- Consistent spacing/sizing scales improve design coherence
- PurgeCSS integration minimizes production bundle size

## References

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com)
- [Framer Motion](https://www.framer.com/motion)
