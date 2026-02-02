# Brutalism Style Overview

## Visual Characteristics

- Raw, unpolished aesthetic that rejects conventional "good design"
- Monospaced and system fonts (Courier, Monaco, default system fonts)
- High contrast: stark black and white or bold color blocks
- Harsh edges, no rounded corners or soft shadows
- Visible structure: borders, outlines, default HTML styling
- Dense text and information-heavy layouts
- Deliberately "ugly" or uncomfortable visual choices
- Absence of conventional UI polish (no smooth gradients, subtle shadows)
- Large, bold typography that dominates the layout
- Exposed grid structure and visible seams

## Why This Works for AI

Brutalism's explicit rejection of polish makes it highly reproducible by AI. The style's reliance on default elements, monospaced fonts, and stark contrasts creates clear, unambiguous parameters. Prompts like "brutalist web design," "raw HTML aesthetic," or "anti-design" produce consistent results because the style is defined by what it removes rather than what it adds. The deliberately unrefined nature means AI outputs don't need subtle refinement to feel authentic.

---

## Origins & Evolution

**1950s-1970s (Architecture) / 2014-Present (Web Design)**

Brutalism in design takes its name and philosophy from Brutalist architecture, which emphasized raw concrete (beton brut in French), exposed structural elements, and uncompromising functionalism. Buildings by Le Corbusier, Paul Rudolph, and others celebrated material honesty over decorative refinement.

Web brutalism emerged in the mid-2010s as a reaction against the homogeneous, over-polished aesthetic of modern web design. Designers seeking authenticity began stripping interfaces back to raw HTML defaults, harsh layouts, and intentionally uncomfortable visuals.

### Timeline

| Year | Milestone |
|------|-----------|
| 1952 | Le Corbusier's Unite d'Habitation, Marseille - Brutalist architecture icon |
| 1954 | Term "Brutalism" coined by British architects Alison and Peter Smithson |
| 1966 | Paul Rudolph's Yale Art & Architecture Building completed |
| 2014 | Bloomberg Businessweek redesign introduces digital brutalism to mainstream |
| 2016 | brutalistwebsites.com launches, cataloging the movement |
| 2017 | Brutalism recognized as significant web design trend |
| 2018 | Major brands experiment with brutalist campaigns |
| 2020 | Neo-brutalism emerges as more accessible variation |
| 2023 | Brutalism influences UI frameworks and design systems |

---

## Design Philosophy

*"Reject polish. Embrace rawness. Let structure show. Design should not seduce - it should confront."*

### Core Principles

**Raw Honesty**
Show the underlying structure. Don't hide seams, borders, or construction. The browser's defaults are valid design choices.

**Anti-Seduction**
Design need not be pretty or pleasant. Discomfort and confrontation are legitimate aesthetic goals.

**Function Without Decoration**
If an element doesn't serve a purpose, remove it. But don't add polish to what remains.

**Democratic Defaults**
System fonts, default buttons, basic HTML represent accessible, honest design that works everywhere.

**Intentional Discomfort**
Challenge user expectations. Break conventions deliberately. Make them think about why design usually looks a certain way.

### Influences

Le Corbusier | Paul Rudolph | Alison & Peter Smithson | David Carson | Emigre magazine | Early web (1990s) | Default HTML | Punk aesthetics

---

## Typography System

### Type Hierarchy

| Level | Style | Specifications |
|-------|-------|----------------|
| Display | Mono/System Bold | 48-96px, often ALL CAPS |
| Title | Monospace or Bold Sans | 32-48px, high contrast |
| Heading | System Default | 20-28px, minimal styling |
| Body | Monospace or System | 14-18px, generous line-height |
| Code | Monospace | 12-14px, terminal aesthetic |

### Recommended Typefaces

- **Display:** Founders Grotesk, Druk, Arial Black
- **Monospace:** Courier, Monaco, JetBrains Mono, IBM Plex Mono
- **System:** -apple-system, Roboto, Segoe UI, system-ui
- **Alternative:** Times New Roman (default serif choice)

### Typography Guidelines

- Monospaced fonts create raw, technical feeling
- System fonts embrace platform defaults authentically
- Extreme sizes (very large headlines, normal body) create tension
- No letter-spacing refinement - use defaults
- ALL CAPS headlines for confrontational impact
- Underline links with default browser styling
- No font smoothing tricks - embrace rendering as-is

---

## Component Library

### Core Elements

```
Borders & Outlines
- Thick black borders (2-4px solid)
- No border-radius (sharp corners only)
- Visible focus outlines
- Table-style grid borders

Backgrounds
- Flat colors only (no gradients)
- High contrast combinations
- White, black, or single bold color
- No background images or textures

Interactive Elements
- Default button styling (or inverted)
- Underlined text links
- No hover effects (or stark color changes)
- Cursor changes only when necessary
```

### UI Components (Web Brutalism)

```
Buttons
- Rectangle with thick border
- No border-radius
- Stark color change on hover
- Text-transform: uppercase

Cards
- Thick black border
- No shadow
- Dense content layout
- Visible padding structure

Navigation
- Plain text links, underlined
- No fancy menus
- List-style bullets visible
- System focus indicators

Forms
- Default input styling
- Thick borders on fields
- No placeholder text (use labels)
- Submit as plain button

Tables
- Visible borders on all cells
- No zebra striping
- Dense data presentation
- Header rows emphasized
```

---

## UX Patterns

Web brutalism has developed specific interaction patterns that challenge conventional UX while remaining functional. These patterns prioritize honesty and confrontation over comfort.

### Exposed Structure

Navigation and structure are visible rather than hidden in menus

*Application:* Portfolios, documentation sites, experimental interfaces. All options visible at once; no progressive disclosure.

*Implementation:*
- Full navigation always visible
- No hamburger menus
- Sitemap-style layouts
- Everything one click away

### Information Density

Maximum content visible simultaneously, rejecting "above the fold" concerns

*Application:* News sites, directories, archives. Users scan rather than scroll through curated sections.

*Implementation:*
- Small text, dense paragraphs
- Multi-column layouts
- Minimal whitespace
- Tables for data presentation

### Default Controls

Use browser defaults instead of custom UI components

*Application:* Forms, applications, admin interfaces. Faster development, guaranteed accessibility, honest aesthetic.

*Implementation:*
- Native form elements
- Browser scrollbars
- System fonts and colors
- Default focus indicators

### Stark Feedback

User feedback through bold, obvious state changes

*Application:* Any interactive element. No subtle transitions; make changes unmistakable.

*Implementation:*
- Color inversion on hover/active
- Visible border changes
- No fade transitions
- Immediate state changes

### Text-First Hierarchy

Typography carries all hierarchy; minimize reliance on visual decoration

*Application:* Editorial, documentation, text-heavy sites. Words and their treatment define the experience.

*Implementation:*
- Size as primary hierarchy tool
- Weight changes for emphasis
- ALL CAPS for headlines
- Minimal imagery

### Confrontational Layout

Intentionally uncomfortable compositions that force attention

*Application:* Art sites, campaigns, statement pieces. Design as provocation.

*Implementation:*
- Overlapping elements
- Off-grid placement
- Extreme asymmetry
- Clashing colors

---

## Color Palette

### Primary Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Black | #000000 | Primary text, borders, blocks |
| White | #FFFFFF | Backgrounds, contrast text |
| Yellow (Warning) | #FFFF00 | Highlight, emphasis |
| Red | #FF0000 | Attention, error, emphasis |
| Blue (Link) | #0000FF | Default link color |

### Extended Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Hot Pink | #FF00FF | Alternative emphasis |
| Lime | #00FF00 | Secondary accent |
| Orange | #FF6600 | Alternative warm accent |
| Gray | #808080 | Secondary text (minimal use) |

### Color Philosophy

Use color in its purest form - no subtle variations, no carefully tuned palettes. Primary and secondary colors at full saturation. Black and white as the foundation. Color choices should feel arbitrary or aggressive rather than carefully curated. Browser default link blue is a legitimate choice.

---

## Best For

- Artist and designer portfolios
- Experimental and avant-garde brands
- Independent publications and zines
- Fashion and cultural commentary
- Counterculture and activism
- Tech startups wanting to stand out
- Documentation and technical sites
- Personal websites and blogs
- Art institutions and galleries
- Brands rejecting corporate aesthetics

---

## Brands Using This Style

| Brand | Application |
|-------|-------------|
| Bloomberg Businessweek | Editorial design direction |
| Balenciaga | E-commerce and campaigns |
| The Outline (defunct) | Digital publication |
| Dazed Digital | Editorial aesthetic |
| Adult Swim | Network branding |
| Kanye West (Donda) | Album and merchandise |
| brutalistwebsites.com | Gallery and community |
| Cargo Collective | Portfolio platform |

---

## LLM Design Prompt

```
Design a [COMPONENT TYPE] in the Brutalist web design style.

KEY CHARACTERISTICS:
- Raw, unpolished aesthetic rejecting conventional polish
- Monospaced typography (Courier, Monaco) or system defaults
- High contrast: stark black and white or bold color blocks
- Harsh edges, no rounded corners, no soft shadows
- Visible structure: thick borders, default HTML styling
- Dense, information-heavy layouts

VISUAL GUIDELINES:
- Color palette: #000000 (black), #FFFFFF (white), #FFFF00 (yellow), #FF0000 (red), #0000FF (blue)
- Thick black borders (2-4px solid)
- No gradients, no textures, no subtle effects
- Large, bold typography in ALL CAPS for headlines
- System or monospace fonts only
- Default browser styling for links and forms

DESIGN PRINCIPLES:
- Embrace rawness and material honesty
- Reject seductive polish and decoration
- Expose structure rather than hide it
- Intentional discomfort is acceptable

MOOD: Confrontational, honest, raw, anti-establishment, intellectual

AVOID: Rounded corners, gradients, soft shadows, subtle color palettes, conventional polish, comfortable aesthetics

BEST SUITED FOR: Artist portfolios, experimental brands, independent publications, fashion, counterculture, activism, tech startups
```

---

## Reference Files

| File | Description |
|------|-------------|
| (Source article image reference for Brutalism) | Brutalist design example |

---

## Additional Resources

### Key Websites
- brutalistwebsites.com - Curated gallery
- Cargo Collective - Platform with brutalist templates
- The Outline (archived) - Digital publication example

### Architectural References
- Unite d'Habitation, Marseille
- Barbican Centre, London
- Habitat 67, Montreal
- Boston City Hall

### Reading
- "Brutalism" by Peter Chadwick
- Reyner Banham on New Brutalism
- "Web Brutalism" articles on design blogs

### Related Styles
- Neo-Brutalism (softer, more accessible version)
- Swiss International Style (shares honesty principles)
- Punk design (shares anti-establishment ethos)
- Default/Normcore design (embraces defaults)

### Neo-Brutalism Note
Neo-Brutalism (or Neubrutalism) emerged around 2020 as a more approachable version, adding:
- Subtle drop shadows
- Warmer color palettes
- Slightly rounded corners
- More generous whitespace
- Maintained bold borders and contrast

This variation has been adopted by products like Figma, Notion, and Gumroad.
