# Aurora Dashboard → iOS Design Mapping

## Side-by-Side Component Analysis

This document maps Aurora Dashboard elements to their iOS equivalents with specific refinement suggestions.

---

## 1. Hero Stats Section

### Your Current (SUCCESS REPORT)
```
┌──────────────────────────────────────────────────────┐
│  292.5h         139.8h        10           5         │
│  TOTAL HOURS    CORE AUTO    ACTIVE       CATEGORIES│
│  SAVED          +35.8%       WORKFLOWS    Active    │
│                              2 New                   │
└──────────────────────────────────────────────────────┘
```

### iOS Fitness Style
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              292.5                                   │
│              hours                                   │
│         Total Time Saved                             │
│                                                      │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐               │
│   │139.8│  │ 10  │  │  5  │  │ +35%│               │
│   │hours│  │flows│  │ cat │  │growth               │
│   └─────┘  └─────┘  └─────┘  └─────┘               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Primary stat size | ~64px | 80-96px |
| Unit placement | Same line | Below number, lighter weight |
| Secondary stats | Equal weight | Smaller cards below hero |
| Trend indicator | Badge style | Inline with subtle color |

---

## 2. Feature Cards (Coming Soon Section)

### Your Current
```
┌────────────────┐
│ [icon]         │
│ Knowledge      │
│ Description... │
│ Q2 2026        │
└────────────────┘
```

### iOS App Store Card Style
```
┌────────────────────────┐
│                        │
│    ┌──────────┐        │
│    │  [icon]  │        │
│    │  64x64   │        │
│    └──────────┘        │
│                        │
│     Knowledge          │
│     AI-powered base    │
│                        │
│   ──────────────────   │
│   Coming Q2 2026       │
│                        │
└────────────────────────┘
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Icon size | ~40px | 56-64px |
| Icon style | Filled | Glyph in rounded rect (SF Symbols style) |
| Card padding | Standard | More generous (24px) |
| Divider | None | Subtle hairline above metadata |
| Corner radius | 12-16px | 20-24px |

---

## 3. Data Tables (Workflow Performance)

### Your Current
```
WORKFLOW          CATEGORY    NOV    DEC    JAN    TREND
Immy.bot          Hardware    72h    38h    32h    Normalizing
User Onboarding   Lifecycle   31h    8h     12h    Variable
```

### iOS Settings/Health Table Style
```
┌─────────────────────────────────────────────────────┐
│ WORKFLOWS                                           │
├─────────────────────────────────────────────────────┤
│ ┌─ Immy.bot Provision ────────────────────────────┐ │
│ │ Hardware                          32h    ↘      │ │
│ │ Normalizing · 72h → 38h → 32h                   │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─ User Onboarding ───────────────────────────────┐ │
│ │ Lifecycle                         12h    ↔      │ │
│ │ Variable · 31h → 8h → 12h                       │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Row style | Flat table | Card per row with padding |
| Category | Colored badge | Subtle text label |
| Trend | Badge | Arrow icon + sparkline |
| Disclosure | None | Chevron for expandable rows |
| Section header | Column labels | Grouped section title |

---

## 4. Navigation Tabs

### Your Current
```
[Overview] [Performance] [Workflows] [Insights] [Innovation]
```

### iOS Segmented Control Style
```
┌──────────────────────────────────────────────────────┐
│  Overview   Performance   Workflows   Insights   ▼   │
│  ════════                                           │
└──────────────────────────────────────────────────────┘
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Active indicator | Background highlight | Underline (sliding) |
| Inactive color | Muted | 60% opacity white |
| Active color | White | White, full opacity |
| Transition | Instant | Sliding underline animation |

---

## 5. Status Badges

### Your Current
```
┌────────┐  ┌────────┐  ┌────────┐
│ READY  │  │  BETA  │  │ ACTIVE │
└────────┘  └────────┘  └────────┘
```

### iOS Notification Badge Style
```
READY          BETA           ACTIVE
  ●              ●              ●
Green         Orange         Purple
glow          glow           glow
```

Or pill style:
```
┌─────────────┐
│ ● Ready     │  ← Dot + label, no box
└─────────────┘
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Container | Outlined box | Pill or dot + text |
| Color | Fill | Glow effect on dot |
| Typography | All caps | Title case |
| Animation | Static | Pulse on status change |

---

## 6. Progress Bars

### Your Current
```
Progress                85%
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░
```

### iOS Style
```
Progress                85%
━━━━━━━━━━━━━━━━━━━━────
(gradient fill, subtle track, same radius)
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Track color | Visible gray | Nearly invisible (8% white) |
| Fill | Solid | Subtle gradient |
| Height | Standard | Thinner (4-6px) |
| Corners | Squared or slight | Fully rounded, matching |

---

## 7. Chart Styling

### Your Current (Area Chart)
```
     ╭────────────────╮
    ╱                  ╲
   ╱                    ╲
  ╱                      ╲
```

### iOS Health/Fitness Style
```
     ╭────────────────╮
    ╱░░░░░░░░░░░░░░░░░░╲   ← Gradient fill
   ╱░░░░░░░░░░░░░░░░░░░░╲   ← More saturated at bottom
──────────────────────────   ← Subtle grid lines
  Nov         Dec        Jan
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Fill | Solid | Vertical gradient (dark → color) |
| Line | Single weight | Slightly thicker at top edge |
| Grid | Standard | Dotted, very subtle |
| Axis labels | Standard | Rounded, proportional figures |
| Tooltip | Popup | Vertical rule + data point highlight |

---

## 8. Buttons

### Your Current (Present Button)
```
┌─────────────────┐
│  ▷  Present     │
└─────────────────┘
```

### iOS Style
```
┌─────────────────┐
│    Present  →   │   ← Larger touch target
└─────────────────┘    ← No icon, or trailing arrow
     ↓
  Press state: scale(0.97), slight dim
```

### Refinements
| Element | Current | iOS-Aligned |
|---------|---------|-------------|
| Icon position | Leading | Trailing (if used) |
| Padding | Standard | Generous (16px 24px) |
| Radius | 8px | 12px |
| Press feedback | Unknown | Scale down + opacity |

---

## Color Mapping

| Aurora Current | iOS Equivalent | Recommendation |
|------------------|----------------|----------------|
| #4ADE80 (green) | systemGreen #30D158 | Keep yours, slightly more saturated |
| #FB923C (orange) | systemOrange #FF9F0A | Match iOS for consistency |
| #60A5FA (blue) | systemBlue #0A84FF | Match iOS |
| #A78BFA (purple) | systemPurple #BF5AF2 | Match iOS |
| #EF4444 (red) | systemRed #FF453A | Match iOS |
| Background grays | System grays | Adopt iOS gray scale exactly |

---

## Typography Mapping

| Aurora Current | iOS Equivalent | Recommendation |
|------------------|----------------|----------------|
| Hero headline | Large Title (34pt Bold) | Push to 40-48pt, -2% tracking |
| Section titles | Title 1 (28pt Bold) | Match |
| Card titles | Headline (17pt Semi) | Match |
| Body text | Body (17pt Regular) | Match |
| Stat numbers | N/A | Custom: 64-80pt Bold Tabular |
| Metadata | Caption (12pt) | Match, use secondaryLabel color |

---

## Summary: Top 10 iOS Refinements for Aurora Dashboard

1. **Increase corner radius** to 20-24px on cards
2. **Remove borders**, use background elevation only
3. **Add glow effects** to active/AI states
4. **Tighten headline tracking** (-2% at display sizes)
5. **Animate stat counters** with ease-out curve
6. **Add sliding underline** to tab navigation
7. **Use iOS system colors** for consistency
8. **Add scale transforms** to button press states
9. **Thin the progress bars** with gradient fills
10. **Add staggered entrance** animations to cards
