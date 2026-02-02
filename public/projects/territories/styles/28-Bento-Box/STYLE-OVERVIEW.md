# Bento Box Style Overview

## Visual Characteristics

- Modular, compartmentalized layouts with distinct sections
- Rounded corner rectangles as primary containers
- Clean, organized grid structures
- Subtle shadows creating depth between modules
- Icons paired with concise labels
- Neutral color palettes with strategic accent colors
- Micro-animations and hover interactions
- Generous padding and breathing room
- Clear visual hierarchy through size variation
- Dashboard-style information organization

## Why This Works for AI

Bento Box's structured, grid-based approach makes it highly interpretable by AI systems. The style's clear rules (modular containers, rounded corners, organized content) create predictable outputs. Apple's popularization of the aesthetic provides abundant training data. Prompts referencing "Bento grid," "Apple feature layout," or "modular dashboard" produce consistent, recognizable results.

---

## Origins & Evolution

**2019-Present (Contemporary UI Trend)**

Bento Box (or Bento Grid) design emerged as a UI pattern inspired by Japanese bento lunch boxes - compartmentalized containers that organize different foods in an aesthetically pleasing, practical arrangement. The style gained significant momentum when Apple adopted it for product feature pages and presentations.

The approach represents a maturation of card-based design, adding more sophisticated grid relationships, varied container sizes, and thoughtful visual hierarchy. It's particularly effective for showcasing multiple features or content types in a single, scannable view.

### Timeline

| Year | Milestone |
|------|-----------|
| 2018 | Card-based UI mature; designers seek evolution |
| 2019 | Apple begins using modular feature layouts |
| 2020 | Apple WWDC presentations standardize the pattern |
| 2021 | "Bento Box" terminology emerges in design community |
| 2022 | Style spreads to SaaS, portfolio, and product sites |
| 2023 | Bento grids become standard pattern for feature showcases |
| 2024 | Established as fundamental layout pattern; templates abundant |
| 2025 | Style evolves with AI-generated content integration |

---

## Design Philosophy

*"Every feature deserves its own moment, but all features should harmonize as a unified whole. Organization is the foundation of clarity."*

### Core Principles

**Compartmentalized Clarity**
Each content piece gets its own defined space. No element bleeds into another. Clear boundaries create mental organization.

**Hierarchy Through Scale**
Larger modules indicate importance. Size relationships communicate priority without explicit labels.

**Breathable Density**
Pack information efficiently while maintaining generous internal padding. Dense doesn't mean cramped.

**Progressive Disclosure**
Show the essential at first glance; reveal depth on interaction. Modules can expand or link to more.

**Unified Diversity**
Different content types (text, images, stats, icons) coexist harmoniously through consistent container treatment.

### Influences

Japanese Bento culture | Apple product pages | Card-based UI | Grid systems | Dashboard design | Swiss design principles | iOS/macOS interface design

---

## Typography System

### Type Hierarchy

| Level | Style | Specifications |
|-------|-------|----------------|
| Hero Stat | Large Bold | 48-72px, numerical emphasis |
| Card Title | Semi-Bold | 20-24px, clear labels |
| Body | Regular | 14-16px, descriptive text |
| Caption | Light/Regular | 12-14px, supporting info |
| Label | Medium/Small | 11-13px, icon companions |

### Recommended Typefaces

- **Primary:** SF Pro (Apple), Inter, Poppins
- **Stats/Numbers:** SF Mono, Tabular figures
- **Body:** System fonts, Inter, Roboto
- **Clean Alternative:** Helvetica Neue, DM Sans

### Typography Guidelines

- Large numbers and statistics command attention
- Short, punchy headlines per module
- Body text kept minimal - this is about scanning
- Icon + label pairings for features
- Consistent alignment within modules (usually left or center)
- Generous line-height for readability
- Weight variation creates hierarchy (light vs bold)

---

## Component Library

Interactive modular containers with Apple-inspired polish — organized grids, subtle depth, and the satisfying compartmentalization of a perfectly packed bento.

### Live Demo

```html
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .bento-demo {
    background: #F5F5F7;
    padding: 32px;
    font-family: 'Inter', -apple-system, sans-serif;
    min-height: 400px;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, minmax(120px, auto));
    gap: 16px;
    max-width: 720px;
    margin: 0 auto;
  }

  /* === BENTO MODULE BASE === */
  .bento-module {
    background: #FFFFFF;
    border-radius: 20px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }

  .bento-module:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  }

  /* Size variations */
  .bento-module.hero { grid-column: span 2; grid-row: span 2; }
  .bento-module.wide { grid-column: span 2; }
  .bento-module.tall { grid-row: span 2; }

  /* Color variants */
  .bento-module.blue {
    background: linear-gradient(135deg, #0071E3 0%, #005BBB 100%);
    color: white;
  }

  .bento-module.dark {
    background: #1D1D1F;
    color: white;
  }

  /* === STAT MODULE === */
  .bento-stat {
    font-size: 48px;
    font-weight: 700;
    letter-spacing: -2px;
    line-height: 1;
    margin-bottom: 8px;
    color: #1D1D1F;
  }

  .bento-module.blue .bento-stat,
  .bento-module.dark .bento-stat {
    color: white;
  }

  .bento-stat-label {
    font-size: 14px;
    font-weight: 500;
    color: #86868B;
  }

  .bento-module.blue .bento-stat-label,
  .bento-module.dark .bento-stat-label {
    color: rgba(255, 255, 255, 0.7);
  }

  /* === FEATURE MODULE === */
  .bento-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #0071E3 0%, #00A2FF 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 16px;
  }

  .bento-module.dark .bento-icon {
    background: linear-gradient(135deg, #AF52DE 0%, #5856D6 100%);
  }

  .bento-title {
    font-size: 18px;
    font-weight: 600;
    color: #1D1D1F;
    margin-bottom: 8px;
  }

  .bento-module.blue .bento-title,
  .bento-module.dark .bento-title {
    color: white;
  }

  .bento-description {
    font-size: 14px;
    color: #86868B;
    line-height: 1.5;
    flex: 1;
  }

  .bento-module.blue .bento-description,
  .bento-module.dark .bento-description {
    color: rgba(255, 255, 255, 0.7);
  }

  /* === HERO MODULE SPECIAL === */
  .bento-hero-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .bento-hero-title {
    font-size: 32px;
    font-weight: 700;
    color: white;
    margin-bottom: 8px;
    letter-spacing: -0.5px;
  }

  .bento-hero-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
  }

  /* Visual element in hero */
  .bento-visual {
    flex: 1;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
    border-radius: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
  }

  /* === BUTTON MODULE === */
  .bento-btn {
    background: #0071E3;
    color: white;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    padding: 12px 24px;
    border: none;
    border-radius: 980px;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-start;
    margin-top: auto;
  }

  .bento-btn:hover {
    background: #0077ED;
    transform: scale(1.02);
  }

  .bento-module.dark .bento-btn {
    background: white;
    color: #1D1D1F;
  }

  /* === TAG/BADGE === */
  .bento-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 113, 227, 0.1);
    color: #0071E3;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 50px;
    margin-bottom: 12px;
  }

  .bento-tag::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #34C759;
    border-radius: 50%;
  }
</style>

<div class="bento-demo">
  <div class="bento-grid">
    <!-- Hero Module -->
    <div class="bento-module hero blue">
      <div class="bento-visual">🚀</div>
      <div class="bento-hero-content">
        <h2 class="bento-hero-title">Ship Faster</h2>
        <p class="bento-hero-subtitle">Deploy with confidence in seconds</p>
      </div>
    </div>

    <!-- Stat Module -->
    <div class="bento-module">
      <span class="bento-tag">Live</span>
      <span class="bento-stat">99.9%</span>
      <span class="bento-stat-label">Uptime this month</span>
    </div>

    <!-- Feature Module -->
    <div class="bento-module dark">
      <div class="bento-icon">⚡</div>
      <h3 class="bento-title">Edge Functions</h3>
      <p class="bento-description">Run serverless at the edge, closest to your users.</p>
    </div>

    <!-- Wide Feature -->
    <div class="bento-module wide">
      <div class="bento-icon">🔒</div>
      <h3 class="bento-title">Enterprise Security</h3>
      <p class="bento-description">SOC 2 compliant with SSO, audit logs, and role-based access.</p>
      <button class="bento-btn">Learn More</button>
    </div>
  </div>
</div>
```

### Component Specifications

| Component | Key Bento Elements |
|-----------|-------------------|
| **Module** | 20px radius, hover lift with shadow, grid-span sizing (1x1, 2x1, 2x2) |
| **Stat** | 48px bold stat, muted label, optional live indicator tag |
| **Feature** | Gradient icon badge, short title, concise description |
| **Button** | Full pill shape, Apple blue, subtle scale hover |
| **Tag** | Pill shape with status dot, semibold type |

---

## UX Patterns

Bento Box is fundamentally a UX pattern with strong interaction design principles. The following patterns are actively used in production interfaces.

### Feature Showcase Grid

Multi-feature display where each capability gets a dedicated module in a harmonious grid

*Application:* Product landing pages, capability overviews, pricing tier comparisons. Apple's feature pages are the canonical example.

*Implementation:*
- Mixed module sizes for visual interest
- Hero module for primary feature
- Supporting modules for secondary features
- Consistent gap spacing (16-24px)
- Responsive collapse patterns

### Dashboard Bento

Data and metrics organized into scannable modular sections

*Application:* Analytics dashboards, admin panels, monitoring interfaces. Users quickly assess multiple metrics.

*Implementation:*
- Stat cards with large numbers
- Mini-charts in dedicated modules
- Status indicators with color coding
- Prioritized module sizing
- Drill-down on click

### Portfolio Grid

Work samples or projects displayed as variable-sized modules

*Application:* Design portfolios, case study collections, gallery layouts. Each piece gets its moment while forming a cohesive collection.

*Implementation:*
- Image-dominant modules
- Hover reveals project info
- Category-based module styling
- Masonry or explicit grid
- Filter and sort capabilities

### App/Tool Launcher

Applications or tools presented as grid of accessible modules

*Application:* App stores, tool directories, service menus. Each module represents an action or destination.

*Implementation:*
- Icon + title per module
- Consistent module sizing
- Category grouping options
- Search and filter integration
- Quick-access arrangement

### Comparison Matrix

Competing options presented in parallel module columns

*Application:* Pricing pages, plan comparisons, product comparisons. Side-by-side evaluation simplified.

*Implementation:*
- Vertical module columns per option
- Shared row for each feature/attribute
- Highlight differentiators
- Visual feature indicators
- CTA at base of each column

### Settings Panel

Configuration options organized into thematic module groups

*Application:* Settings pages, preference panels, admin configuration. Related settings cluster together.

*Implementation:*
- Grouped modules by category
- Toggle and input integration
- Visual feedback on changes
- Collapsible sections
- Clear save/cancel patterns

---

## Color Palette

### Primary Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Neutral Gray | #F5F5F7 | Card backgrounds (light) |
| White | #FFFFFF | Module backgrounds |
| Dark Gray | #1D1D1F | Text, dark mode backgrounds |
| Blue Accent | #0071E3 | Interactive elements, CTAs |
| Secondary Gray | #86868B | Secondary text |

### Extended Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Success Green | #34C759 | Positive indicators |
| Warning Orange | #FF9500 | Alerts, attention |
| Error Red | #FF3B30 | Negative states |
| Purple | #AF52DE | Alternative accent |
| Teal | #5AC8FA | Data visualization |

### Color Philosophy

Bento layouts typically use neutral foundations (grays, whites) with strategic accent colors. The goal is to let content shine within clean containers. Accent colors draw attention to key elements (CTAs, important stats) without overwhelming. In dark mode, the containers invert but relationships remain consistent.

---

## Best For

- Product feature pages and marketing
- SaaS dashboards and analytics
- Portfolio and case study sites
- Mobile app showcases
- Pricing and comparison pages
- Documentation landing pages
- Admin panels and control centers
- App launchers and directories
- Settings and configuration UIs
- Content management systems

---

## Brands Using This Style

| Brand | Application |
|-------|-------------|
| Apple | Product pages, WWDC presentations, iOS |
| Vercel | Product feature showcase |
| Linear | Dashboard and feature pages |
| Stripe | Product documentation, features |
| Notion | Marketing and feature pages |
| Figma | Product showcases |
| Arc Browser | UI and marketing |
| Raycast | App and extension showcase |

---

## LLM Design Prompt

```
Design a [COMPONENT TYPE] in the Bento Box UI style.

KEY CHARACTERISTICS:
- Modular, compartmentalized layout with distinct sections
- Rounded corner rectangles (12-24px radius) as containers
- Clean grid structure with consistent gaps (16-24px)
- Subtle shadows creating depth between modules
- Variable module sizes for visual hierarchy (1x1, 2x1, 2x2)
- Icons paired with concise labels

VISUAL GUIDELINES:
- Color palette: #F5F5F7 (light gray), #FFFFFF (white), #1D1D1F (dark), #0071E3 (blue accent)
- Generous padding within modules (16-32px)
- Large statistics and numbers for emphasis
- Clean sans-serif typography (SF Pro, Inter)
- Micro-interactions on hover (subtle lift, scale)

DESIGN PRINCIPLES:
- Each piece of content gets its own defined space
- Size indicates importance (larger = more important)
- Dense but breathable - content-rich without feeling cramped
- Consistent container treatment unifies diverse content

MOOD: Organized, modern, clean, professional, approachable

AVOID: Overlapping elements, cluttered modules, inconsistent spacing, decorative borders, visual noise

BEST SUITED FOR: Product features, dashboards, portfolios, pricing pages, app showcases, admin panels
```

---

## Reference Files

| File | Description |
|------|-------------|
| (Source article image reference for Bento Box) | Bento grid layout example |

---

## Additional Resources

### Reference Implementations
- Apple.com product pages (iPhone, Mac, iPad features)
- Linear.app marketing pages
- Vercel.com dashboard and marketing
- Raycast.com extensions showcase

### Grid Systems
- CSS Grid for layout structure
- Flexbox for internal module layout
- Gap property for consistent spacing
- Auto-fit/auto-fill for responsiveness

### Animation Patterns
- Subtle hover elevation (2-4px lift)
- Scale on hover (1.01-1.02)
- Fade-in on scroll
- Staggered module reveal
- Smooth state transitions

### Responsive Considerations
- Desktop: Full grid with multiple columns
- Tablet: Reduced columns, maintained hierarchy
- Mobile: Single column or 2-column simplified
- Module collapse strategies
- Priority-based visibility

### Related Styles
- **Card-Based UI:** Predecessor pattern
- **Dashboard Design:** Functional application
- **Swiss/Grid Design:** Underlying principles
- **Apple Human Interface Guidelines:** Platform influence
