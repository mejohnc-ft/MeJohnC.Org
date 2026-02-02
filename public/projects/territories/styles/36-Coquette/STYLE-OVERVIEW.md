# Coquette Style Overview

## Visual Characteristics

- Ultra-feminine pink palette (blush, rose, champagne)
- Delicate ribbon and bow motifs
- Soft, diffused lighting effects
- Pearl and lace textures
- Vintage romantic typography (script fonts, thin serifs)
- Heart shapes and romantic symbols
- Soft focus/blur effects reminiscent of film photography
- Dainty floral accents (roses, peonies, cherry blossoms)
- Satin and silk texture overlays
- Vintage photograph treatments with soft vignettes

## Why This Works for AI

Coquette's highly specific aesthetic markers make it easily identifiable and reproducible by AI. The style draws from well-documented fashion photography, vintage romance imagery, and social media aesthetics (particularly Pinterest and TikTok). Key terms like "ribbon bows," "pearl details," "soft pink," and "romantic vintage" are strongly represented in training data. The style's popularity on social platforms since 2022 has created extensive visual documentation.

---

## Origins & Evolution

**Early 2000s Revival, Peak 2022-Present**

Coquette derives from the French word for "flirt" and historically described a playfully feminine, teasing aesthetic. The modern coquette style emerged as a distinct aesthetic movement around 2020-2022, primarily through TikTok and Pinterest, as a reaction against minimalism and a celebration of hyperfeminine romantic expression.

The style draws from multiple sources: French boudoir aesthetics, early 2000s "It Girl" fashion, Marie Antoinette-era romanticism, and Sofia Coppola's visual language. It represents a reclamation of traditionally feminine symbols as expressions of empowerment rather than weakness.

| Year | Milestone |
|------|-----------|
| 2006 | Sofia Coppola's "Marie Antoinette" establishes modern pastel romantic aesthetic |
| 2012 | Lana Del Rey's aesthetic influences vintage feminine revival |
| 2019 | "Soft girl" aesthetic emerges on TikTok, precursor to coquette |
| 2021 | #Coquette begins trending on TikTok and Pinterest |
| 2022 | Coquette becomes dominant Gen Z aesthetic; ribbon/bow trend peaks |
| 2023 | High fashion adopts coquette elements (Miu Miu, Simone Rocha) |
| 2024 | Style matures into UI/UX applications for feminine brands |

---

## Design Philosophy

**Core Principles and Thinking**

Coquette design philosophy embraces deliberate femininity as aesthetic power. It celebrates softness, romance, and delicacy not as weakness but as intentional stylistic choices that evoke specific emotional responses.

### Romantic Nostalgia
References idealized past eras (Rococo, Edwardian, early 2000s) without strict historical accuracy. The goal is emotional resonance, not period recreation.

### Tactile Luxury
Every element should feel touchable and precious. Textures of silk, lace, satin, and velvet translate to soft shadows, gradient overlays, and delicate details in digital design.

### Feminine Maximalism
Unlike minimalism, coquette encourages decorative abundance. Bows, ribbons, pearls, and florals layer together to create richness without cluttering.

### Playful Sophistication
Balances girlish playfulness with grown-up elegance. Not childish, but not overly serious. Flirtatious and confident.

#### Influences
Marie Antoinette era, French boudoir, Lana Del Rey aesthetic, Sofia Coppola films, Early 2000s fashion, Rococo art, Victorian valentine cards, Ballet aesthetics

---

## Typography System

**Type hierarchy for this aesthetic**

| Role | Example | Specs |
|------|---------|-------|
| Display | *Enchanted* | 56px / Script font / Elegant flourishes |
| Title | Mon Chéri | 36px / Thin serif / Generous tracking |
| Heading | Darling Details | 22px / Light weight / Refined |
| Body | The most delicate touches create lasting impressions. | 14px / 400 / Elegant serif |
| Accent | xoxo | 12px / Script / Decorative |

**Typography Guidelines:**
- Primary: Elegant thin serifs (Cormorant Garamond, Playfair Display Light)
- Display: Romantic scripts (Pinyon Script, Great Vibes, Allura)
- Avoid heavy weights; maintain delicate, airy feeling
- Letter-spacing should be generous for elegance
- Consider decorative initial caps for section headings
- Lowercase creates softer, more intimate tone

---

## Component Library

Interactive elements with ribbon bows, satin textures, pearl accents, and the delicate romance of French boudoir aesthetics.

### Live Demo

```html
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Pinyon+Script&display=swap');

  .coquette-demo {
    background: linear-gradient(180deg, #FFFEF9 0%, #FFF5F8 50%, #FFEEF4 100%);
    padding: 48px;
    font-family: 'Cormorant Garamond', serif;
    min-height: 400px;
    position: relative;
    overflow: hidden;
  }

  /* Soft vignette */
  .coquette-demo::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(255, 214, 224, 0.15) 100%);
    pointer-events: none;
  }

  /* === RIBBON BOW SVG === */
  .coquette-bow {
    width: 40px;
    height: 24px;
    display: inline-block;
    position: relative;
  }

  .coquette-bow::before, .coquette-bow::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 20px;
    background: linear-gradient(135deg, #F4A5AE 0%, #FFD6E0 50%, #F4A5AE 100%);
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    top: 0;
  }
  .coquette-bow::before { left: 0; transform: rotate(-20deg); }
  .coquette-bow::after { right: 0; transform: rotate(20deg); }

  .coquette-bow-center {
    position: absolute;
    width: 10px;
    height: 10px;
    background: linear-gradient(135deg, #B76E79 0%, #F4A5AE 100%);
    border-radius: 50%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  /* === COQUETTE BUTTON === */
  .coquette-btn {
    position: relative;
    background: linear-gradient(180deg, #FFD6E0 0%, #F4A5AE 100%);
    color: #5a3d42;
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: 2px;
    padding: 16px 48px;
    border: 1px solid rgba(183, 110, 121, 0.3);
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(244, 165, 174, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.5);
    transition: all 0.4s ease;
    overflow: visible;
  }

  .coquette-btn::before {
    content: '♡';
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: #B76E79;
  }

  .coquette-btn:hover {
    background: linear-gradient(180deg, #FFE4EC 0%, #F4A5AE 100%);
    box-shadow: 0 6px 25px rgba(244, 165, 174, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
    transform: translateY(-1px);
  }

  .coquette-btn-secondary {
    background: transparent;
    color: #B76E79;
    border: 1px solid #F4A5AE;
    box-shadow: none;
  }

  .coquette-btn-secondary:hover {
    background: rgba(255, 214, 224, 0.3);
    box-shadow: none;
  }

  /* === COQUETTE CARD === */
  .coquette-card {
    background: #FFFEF9;
    border-radius: 12px;
    padding: 32px;
    max-width: 340px;
    margin: 32px auto;
    border: 1px solid rgba(244, 165, 174, 0.4);
    box-shadow: 0 8px 30px rgba(183, 110, 121, 0.08);
    position: relative;
  }

  .coquette-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
    width: 48px;
    height: 28px;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 48 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 14c-6 0-10-3-10-7s4-5 6-5c4 0 4 4 4 4s0-4 4-4c2 0 6 1 6 5s-4 7-10 7z' fill='%23F4A5AE'/%3E%3Cpath d='M36 14c-6 0-10-3-10-7s4-5 6-5c4 0 4 4 4 4s0-4 4-4c2 0 6 1 6 5s-4 7-10 7z' fill='%23F4A5AE'/%3E%3Ccircle cx='24' cy='14' r='5' fill='%23B76E79'/%3E%3Cpath d='M12 14v12M36 14v12' stroke='%23F4A5AE' stroke-width='3' fill='none'/%3E%3C/svg%3E");
  }

  .coquette-card h3 {
    font-family: 'Pinyon Script', cursive;
    color: #B76E79;
    text-align: center;
    font-size: 36px;
    font-weight: 400;
    margin: 8px 0 4px;
  }

  .coquette-card-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 16px 0;
    color: #F4A5AE;
    font-size: 10px;
    letter-spacing: 4px;
  }

  .coquette-card-divider::before,
  .coquette-card-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, #F4A5AE, transparent);
  }

  .coquette-card p {
    text-align: center;
    color: #8b7355;
    font-size: 15px;
    line-height: 1.8;
    font-style: italic;
    margin: 0;
  }

  /* Pearl dots */
  .coquette-pearls {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
  }

  .coquette-pearl {
    width: 8px;
    height: 8px;
    background: linear-gradient(135deg, #fff 0%, #FDEEF4 50%, #e8d8dc 100%);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(183, 110, 121, 0.2),
                inset 0 -1px 2px rgba(183, 110, 121, 0.1);
  }

  /* === COQUETTE INPUT === */
  .coquette-input-group {
    max-width: 300px;
    margin: 24px auto;
    position: relative;
  }

  .coquette-label {
    display: block;
    font-family: 'Cormorant Garamond', serif;
    color: #B76E79;
    font-size: 13px;
    letter-spacing: 2px;
    margin-bottom: 8px;
    text-align: center;
  }

  .coquette-label::before {
    content: '— ';
    color: #F4A5AE;
  }

  .coquette-label::after {
    content: ' —';
    color: #F4A5AE;
  }

  .coquette-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid #F4A5AE;
    border-radius: 8px;
    padding: 14px 20px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px;
    font-style: italic;
    color: #5a3d42;
    text-align: center;
    transition: all 0.4s ease;
    box-sizing: border-box;
  }

  .coquette-input::placeholder {
    color: #c9a8ad;
    font-style: italic;
  }

  .coquette-input:focus {
    outline: none;
    border-color: #B76E79;
    box-shadow: 0 0 0 3px rgba(244, 165, 174, 0.2),
                0 4px 15px rgba(183, 110, 121, 0.1);
    background: #FFFEF9;
  }

  /* === COQUETTE TOGGLE === */
  .coquette-toggle {
    position: relative;
    width: 56px;
    height: 28px;
    background: #F7E7CE;
    border: 1px solid #F4A5AE;
    border-radius: 50px;
    cursor: pointer;
    margin: 24px auto;
    display: block;
    transition: all 0.4s ease;
  }

  .coquette-toggle::before {
    content: '♡';
    position: absolute;
    left: 4px;
    top: 3px;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #FFFEF9, #FFD6E0);
    border-radius: 50%;
    transition: all 0.4s ease;
    box-shadow: 0 2px 6px rgba(183, 110, 121, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #F4A5AE;
  }

  .coquette-toggle.active {
    background: linear-gradient(90deg, #FFD6E0, #F4A5AE);
    border-color: #B76E79;
  }

  .coquette-toggle.active::before {
    transform: translateX(28px);
    color: #B76E79;
    background: #FFFEF9;
  }

  /* === COQUETTE TAG === */
  .coquette-tags {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 24px;
  }

  .coquette-tag {
    background: rgba(255, 214, 224, 0.5);
    color: #B76E79;
    font-size: 12px;
    font-style: italic;
    padding: 6px 16px;
    border-radius: 50px;
    border: 1px solid rgba(244, 165, 174, 0.5);
  }
</style>

<div class="coquette-demo">
  <div style="text-align: center; margin-bottom: 28px;">
    <button class="coquette-btn">mon chéri</button>
    <button class="coquette-btn coquette-btn-secondary" style="margin-left: 12px;">perhaps later</button>
  </div>

  <div class="coquette-card">
    <h3>Darling</h3>
    <div class="coquette-card-divider">♡</div>
    <p>The most delicate touches create the most lasting impressions, like petals pressed between pages.</p>
    <div class="coquette-pearls">
      <span class="coquette-pearl"></span>
      <span class="coquette-pearl"></span>
      <span class="coquette-pearl"></span>
    </div>
  </div>

  <div class="coquette-input-group">
    <label class="coquette-label">your secret</label>
    <input type="text" class="coquette-input" placeholder="whisper here...">
  </div>

  <div class="coquette-toggle active" onclick="this.classList.toggle('active')"></div>

  <div class="coquette-tags">
    <span class="coquette-tag">ribbons & bows</span>
    <span class="coquette-tag">soft pink</span>
    <span class="coquette-tag">romance</span>
  </div>
</div>
```

### Component Specifications

| Component | Key Coquette Elements |
|-----------|----------------------|
| **Button** | Satin gradient, inner glow, heart prefix, rose gold border |
| **Card** | Ribbon bow topper, script heading, pearl accents, elegant divider |
| **Input** | Centered italic placeholder, decorative label with dashes, soft focus glow |
| **Toggle** | Heart icon handle, champagne-to-rose gradient, romantic transition |
| **Tags** | Translucent blush background, italic text, pill shape |

---

## UX Patterns

**Interaction paradigms for this style**

### Gentle Reveals
Content appears through soft fade-ins and delicate slide animations. Nothing should feel abrupt or mechanical. Timing curves should ease in and out smoothly.

*Implementation: Use CSS transitions with ease-in-out timing, 300-400ms duration. Stagger reveals for multiple elements.*

### Romantic Hover States
Hover interactions should feel like a gentle caress. Elements softly glow, colors deepen slightly, subtle shadows appear. Consider adding floating heart or sparkle particles on key elements.

*Implementation: Box-shadow transitions, slight scale (1.02), color temperature shifts.*

### Love Letter Forms
Multi-step forms presented as intimate conversations. Each step revealed progressively with encouraging, affectionate microcopy ("Almost there, darling" / "One more thing...").

*Implementation: Single-field focus design, progress indicated by delicate dots or hearts.*

### Keepsake Collections
Saved items, favorites, or wishlists presented as curated collections with romantic framing. Items appear as precious keepsakes rather than cart items.

*Implementation: Polaroid-style image frames, handwritten-style labels, ribbon "bookmarks."*

---

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Blush Pink | `#FFD6E0` | Primary accent, backgrounds |
| Rose | `#F4A5AE` | Interactive elements, CTAs |
| Champagne | `#F7E7CE` | Secondary backgrounds |
| Cream | `#FFFEF9` | Card backgrounds, base |
| Rose Gold | `#B76E79` | Accent details, borders |
| Soft White | `#FEFEFE` | Primary background |
| Dusty Rose | `#DCAE96` | Tertiary accent |
| Pearl | `#FDEEF4` | Highlight, overlay effects |

---

## Typography Recommendations

- **Primary Serif:** Cormorant Garamond, Playfair Display, Libre Baskerville
- **Display Script:** Pinyon Script, Great Vibes, Allura, Tangerine
- **Sans-serif Option:** Josefin Sans Light, Quicksand Light
- Maintain light weights (300-400) for body text
- Scripts reserved for headings and accents only
- Line-height: 1.7-1.9 for airy, elegant feeling

---

## Best For

- Beauty and skincare brands
- Lingerie and intimate apparel
- Wedding and bridal services
- Luxury feminine fashion
- Jewelry and accessories
- Perfume and fragrance
- Romance-focused media (books, films, podcasts)
- Dating apps targeting women
- Lifestyle blogs with feminine focus
- Boutique e-commerce
- Stationery and invitation design

---

## Brands Using This Style

| Brand | Application |
|-------|-------------|
| Glossier | Soft pink aesthetic, minimal but romantic |
| For Love & Lemons | Lingerie brand with full coquette visual identity |
| Mejuri | Jewelry with delicate romantic photography |
| Sandy Liang | Fashion with ribbon and bow motifs |
| Hill House Home (Nap Dress) | Romantic feminine fashion branding |
| Charlotte Tilbury | Luxury beauty with romantic undertones |
| Reformation | Sustainable fashion with feminine styling |
| LoveShackFancy | Full coquette fashion brand aesthetic |
| Simone Rocha | High fashion coquette elements |

---

## LLM Design Prompt

```
Design a user interface in the "Coquette" style.

KEY CHARACTERISTICS:
- Ultra-feminine pink palette (blush, rose, champagne, cream)
- Delicate ribbon and bow motifs throughout
- Vintage romantic typography (scripts and thin serifs)
- Pearl, lace, and satin texture references
- Soft focus effects and gentle shadows

VISUAL GUIDELINES:
- Color palette: #FFD6E0, #F4A5AE, #F7E7CE, #FFFEF9, #B76E79
- Primary typography: Cormorant Garamond or Playfair Display Light
- Display typography: Pinyon Script or similar romantic script
- All elements should feel delicate, touchable, and precious
- Include ribbon bows, heart shapes, or pearl details as accents

EMOTIONAL TONE:
- Romantic and nostalgic
- Playfully feminine without being childish
- Luxurious yet approachable
- Intimate and personal

BEST SUITED FOR: Beauty brands, bridal services, luxury fashion, jewelry, feminine lifestyle products, dating apps

Create a [COMPONENT TYPE] that embodies this design philosophy. Focus on soft pinks, elegant typography, and romantic decorative details that evoke French boudoir luxury.
```

---

## Reference Files

- Source article: "50 Design Styles Every Designer Should Know for Better Prompting" by Himanshu Bhardwaj
- Style reference image from UX Planet article

---

## Related Styles

- **Kawaii**: Shares pastel palette but more playful/cute than romantic
- **Shabby Chic**: Shares vintage feminine elements with distressed textures
- **Light Academia**: Shares soft palette but with scholarly rather than romantic focus
- **Victorian**: Historical influence on coquette's ornate details
