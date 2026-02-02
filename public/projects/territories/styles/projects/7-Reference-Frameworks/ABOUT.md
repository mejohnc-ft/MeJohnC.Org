# Reference & Frameworks

## Overview
This folder contains **conceptual frameworks and models** that inform your AI product strategy. These aren't direct design inspiration but provide mental models for thinking about AI product evolution and capability maturity.

## Files in This Folder

| File | Description |
|------|-------------|
| `personal-ai-maturity-model-v1.png` | **PAIMM** — 9-level progression from Chatbots to Assistants |

## Personal AI Maturity Model (PAIMM) Analysis

The model presents three tiers with three levels each:

### Tier 1: Chatbots (CH1-CH3)
| Level | Capabilities | Design Implications |
|-------|--------------|---------------------|
| **CH1** | Chat interface, no context, no tools | Simple chat bubble UI |
| **CH2** | Basic tool use, some memory | Tool indicators, history |
| **CH3** | Advanced tools, persistent context | Workspace metaphor |

### Tier 2: Agents (AG1-AG3)
| Level | Capabilities | Design Implications |
|-------|--------------|---------------------|
| **AG1** | CLI/Web, transactional, ephemeral | Task-focused UI |
| **AG2** | Voice, backgrounding, mobile | **"WE ARE HERE"** — Multi-modal, ambient |
| **AG3** | Extensive voice, omni-available | Always-on presence |

### Tier 3: Assistants (AS1-AS3)
| Level | Capabilities | Design Implications |
|-------|--------------|---------------------|
| **AS1** | Personality, sensing, goal monitoring | Avatar/presence, proactive UI |
| **AS2** | Full state management | Dashboard as life overview |
| **AS3** | Continuous advocate | Background agent, minimal UI |

## Design Implications by Level

### Where You Are: AG2
> "Basic Voice Interaction, Early Backgrounding, Early Mobile Access"

**Key design requirements for AG2:**
- Voice input/output indicators
- Background task status (running, complete, failed)
- Mobile-first considerations
- Ambient presence (not just on-demand)
- Notification and alert systems

### Where You're Heading: AG3 / AS1

**Design considerations for next levels:**
- **Always-available** — UI that's ready without being opened
- **Proactive** — System initiates, not just responds
- **Personality** — Consistent voice, behavior patterns
- **Sensing** — Awareness of context (time, location, calendar)
- **Goal tracking** — Progress toward user objectives

## How This Informs Your Design

| PAIMM Insight | Design Decision |
|---------------|-----------------|
| Moving from transactional to ambient | Spatial Canvas style supports this |
| Voice becoming primary | Design for voice-first, screen-second |
| Backgrounding is key | Activity feeds, status indicators |
| Personality emerges | Consistent tone, possible avatar |
| Goal monitoring | Dashboard should show objectives, not just tasks |

## Framework-Informed Questions

When presenting to your CEO, consider framing around:

1. **"Where are we on the PAIMM?"** — Establishes current state
2. **"What does the next level look like?"** — Creates vision
3. **"How does our UI need to evolve?"** — Connects to design decisions
4. **"What interactions don't exist yet?"** — Voice, ambient, proactive

## Visual Design of the Framework Itself

The PAIMM diagram uses:
- **Muted earth tones** — Cream background, maroon text
- **Rounded pill badges** — Level identifiers (CH1, AG2, etc.)
- **Highlight treatment** — Green border for "WE ARE HERE"
- **Clear hierarchy** — Tiers > Levels > Descriptions
- **Minimal decoration** — Framework over flourish

This aesthetic aligns with the **Neo-Vintage / Organic** territory — approachable, not intimidating, focused on communication over style.
