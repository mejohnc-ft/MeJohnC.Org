-- CentrexStyle Complete Seed Data
-- This migration populates the style guide with full CentrexStyle design system
-- Run after 001_initial.sql

-- ============================================
-- GET CENTREXSTYLE BRAND ID
-- ============================================

DO $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- Get or create CentrexStyle brand
  SELECT id INTO v_brand_id FROM style_brands WHERE name = 'CentrexStyle' LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'CentrexStyle brand not found. Run 001_initial.sql first.';
  END IF;

  -- ============================================
  -- COLORS - Complete CentrexStyle Palette
  -- ============================================

  -- Clear existing colors for this brand
  DELETE FROM style_colors WHERE brand_id = v_brand_id;

  -- Primary Palette (Green)
  INSERT INTO style_colors (brand_id, name, hex_value, rgba_r, rgba_g, rgba_b, rgba_a, category, order_index)
  VALUES
    (v_brand_id, 'Centrex Primary (Green)', '#3dae2b', 61, 174, 43, 1.00, 'primary', 1),
    (v_brand_id, 'Centrex Primary Light', '#4ade80', 74, 222, 128, 1.00, 'primary', 2);

  -- Secondary Palette (Blue)
  INSERT INTO style_colors (brand_id, name, hex_value, rgba_r, rgba_g, rgba_b, rgba_a, category, order_index)
  VALUES
    (v_brand_id, 'Centrex Secondary (Blue)', '#0071ce', 0, 113, 206, 1.00, 'secondary', 3),
    (v_brand_id, 'Centrex Secondary Light', '#3b82f6', 59, 130, 246, 1.00, 'secondary', 4);

  -- Accent Palette (Orange & Red)
  INSERT INTO style_colors (brand_id, name, hex_value, rgba_r, rgba_g, rgba_b, rgba_a, category, order_index)
  VALUES
    (v_brand_id, 'Centrex Tertiary (Orange)', '#ff8300', 255, 131, 0, 1.00, 'accent', 5),
    (v_brand_id, 'Centrex Tertiary Light', '#fb923c', 251, 146, 60, 1.00, 'accent', 6),
    (v_brand_id, 'Centrex Accent (Red)', '#e1251b', 225, 37, 27, 1.00, 'semantic', 7),
    (v_brand_id, 'Centrex Accent Light', '#f87171', 248, 113, 113, 1.00, 'semantic', 8);

  -- Background Colors (Dark Theme)
  INSERT INTO style_colors (brand_id, name, hex_value, rgba_r, rgba_g, rgba_b, rgba_a, category, order_index)
  VALUES
    (v_brand_id, 'Background Body', '#050505', 5, 5, 5, 1.00, 'background', 9),
    (v_brand_id, 'Background Card', '#121212', 18, 18, 18, 1.00, 'background', 10),
    (v_brand_id, 'Background Panel', '#1a1a1a', 26, 26, 26, 1.00, 'background', 11),
    (v_brand_id, 'Background Input', '#262626', 38, 38, 38, 1.00, 'background', 12);

  -- Foreground/Text Colors
  INSERT INTO style_colors (brand_id, name, hex_value, rgba_r, rgba_g, rgba_b, rgba_a, category, order_index)
  VALUES
    (v_brand_id, 'Text Primary', '#e5e5e5', 229, 229, 229, 1.00, 'foreground', 13),
    (v_brand_id, 'Text Secondary', '#a3a3a3', 163, 163, 163, 1.00, 'foreground', 14),
    (v_brand_id, 'Text Muted', '#525252', 82, 82, 82, 1.00, 'foreground', 15);

  -- Border
  INSERT INTO style_colors (brand_id, name, hex_value, rgba_r, rgba_g, rgba_b, rgba_a, category, order_index)
  VALUES
    (v_brand_id, 'Border', '#262626', 38, 38, 38, 1.00, 'border', 16);

  -- ============================================
  -- TYPOGRAPHY - Complete CentrexStyle Scale
  -- ============================================

  -- Clear existing typography for this brand
  DELETE FROM style_typography WHERE brand_id = v_brand_id;

  INSERT INTO style_typography (brand_id, name, font_family, font_size, font_weight, line_height, letter_spacing, order_index)
  VALUES
    (v_brand_id, 'Display', 'GilmerBold', 72.00, 700, 1.11, -1.00, 1),
    (v_brand_id, 'Heading 1', 'GilmerBold', 48.00, 700, 1.17, -0.50, 2),
    (v_brand_id, 'Heading 2', 'GilmerBold', 36.00, 700, 1.22, -0.25, 3),
    (v_brand_id, 'Heading 3', 'GilmerBold', 24.00, 600, 1.33, 0.00, 4),
    (v_brand_id, 'Body Large', 'Hind', 20.00, 400, 1.40, 0.00, 5),
    (v_brand_id, 'Body', 'Hind', 16.00, 400, 1.50, 0.00, 6),
    (v_brand_id, 'Body Small', 'Hind', 14.00, 400, 1.43, 0.00, 7),
    (v_brand_id, 'Caption', 'Hind', 12.00, 400, 1.33, 0.25, 8),
    (v_brand_id, 'Code', 'Consolas', 14.00, 400, 1.43, 0.00, 9);

  -- ============================================
  -- GUIDELINES - CentrexStyle Usage Documentation
  -- ============================================

  -- Clear existing guidelines for this brand
  DELETE FROM style_guidelines WHERE brand_id = v_brand_id;

  -- Color Palette Guidelines
  INSERT INTO style_guidelines (brand_id, category, title, content, order_index, is_published)
  VALUES
    (v_brand_id, 'color-palette', 'Primary Color Usage',
     E'## Primary Green (#3dae2b)\n\n**PMS**: 361 C\n\nThe Centrex Primary Green is the cornerstone of our brand identity. Use it for:\n\n- Primary CTAs and buttons\n- Active states and selections\n- Success messages and confirmations\n- Key visual highlights\n- Progress indicators\n\n**Do:**\n- Use as the primary action color\n- Maintain sufficient contrast with backgrounds\n- Use consistently across all platforms\n\n**Don''t:**\n- Use for warning or error states\n- Overuse - let it draw attention to key actions\n- Modify the hex value without approval',
     1, true),

    (v_brand_id, 'color-palette', 'Secondary Color Usage',
     E'## Secondary Blue (#0071ce)\n\n**PMS**: 285 C\n\nThe Centrex Secondary Blue provides depth and variety to our color palette. Use it for:\n\n- Links and navigation\n- Informational elements\n- Data visualizations (secondary series)\n- Subtle accents and borders\n\n**Do:**\n- Use for interactive elements that aren''t primary actions\n- Apply to informational badges and tags\n- Use in charts and graphs for variety\n\n**Don''t:**\n- Use as a primary button color\n- Apply to warning or error states',
     2, true),

    (v_brand_id, 'color-palette', 'Accent Colors Usage',
     E'## Tertiary Orange (#ff8300) & Accent Red (#e1251b)\n\n**Orange PMS**: 151 C\n**Red PMS**: 1795 C\n\n### Orange Usage\n- Warning states and alerts\n- Attention-grabbing highlights\n- Call-to-action variations\n\n### Red Usage\n- Error states and critical alerts\n- Destructive actions (delete, remove)\n- Urgent notifications\n\n**Important:** Use these colors sparingly. They should draw immediate attention.',
     3, true);

  -- Typography Guidelines
  INSERT INTO style_guidelines (brand_id, category, title, content, order_index, is_published)
  VALUES
    (v_brand_id, 'typography', 'Heading Typography',
     E'## Headings - GilmerBold\n\nAll headings use the GilmerBold font family with Segoe UI as fallback.\n\n### Scale\n- **Display**: 72px / -1px letter-spacing\n- **H1**: 48px / -0.5px letter-spacing\n- **H2**: 36px / -0.25px letter-spacing\n- **H3**: 24px / no letter-spacing\n\n### Guidelines\n- Use negative letter-spacing for large headings\n- Maintain consistent hierarchy across pages\n- Display text should be reserved for hero sections',
     4, true),

    (v_brand_id, 'typography', 'Body Typography',
     E'## Body Text - Hind\n\nBody text uses the Hind font family with Segoe UI as fallback.\n\n### Scale\n- **Body Large**: 20px - Feature text, leads\n- **Body**: 16px - Standard paragraphs\n- **Body Small**: 14px - Secondary information\n- **Caption**: 12px - Labels, metadata\n\n### Code\n- **Code**: Consolas, 14px - Code blocks and inline code',
     5, true);

  -- Component Guidelines
  INSERT INTO style_guidelines (brand_id, category, title, content, order_index, is_published)
  VALUES
    (v_brand_id, 'components', 'Stat Card',
     E'## Stat Card Component\n\nHero statistic display with gradient accent border.\n\n### Variants\n- **Green**: Primary metrics, revenue, growth\n- **Blue**: User/engagement metrics\n- **Orange**: Warning thresholds, attention needed\n- **Red**: Critical metrics, errors\n\n### Structure\n```\n+---------------------------+\n| [Gradient Border Top]     |\n|                           |\n|     1,234                 |  <- Value (3rem, bold, gradient text)\n|     Active Users          |  <- Label (0.9rem, muted)\n|                           |\n+---------------------------+\n```\n\n### CSS Variables\n- Border: `linear-gradient(90deg, var(--centrex-{color}), var(--{color}-light))`\n- Text: Same gradient with `-webkit-background-clip: text`',
     6, true),

    (v_brand_id, 'components', 'Command Palette',
     E'## Command Palette Component\n\nGrouped command interface for quick actions.\n\n### Structure\n- Grouped by category (icon + title)\n- Each command shows code and description\n- Hover state: border highlight, slide right animation\n\n### Example Groups\n- **Deployments**: `/deploy`, `/status`, `/rollback`\n- **Data**: `/query`, `/export`, `/import`\n- **System**: `/health`, `/logs`, `/config`',
     7, true),

    (v_brand_id, 'components', '3D Carousel',
     E'## 3D Carousel (Flywheel)\n\nRotating card display with perspective transform.\n\n### Configuration\n- Cards: 2-8 items\n- Auto-rotate: Optional, speed 1-10\n- Perspective: 1500px\n\n### Card Structure\n- Icon (44x44, bg: primary-dim)\n- Title\n- Description\n- Optional stat box\n- Footer\n\n### Interaction\n- Prev/Next navigation\n- Smooth rotation animation (0.6s ease-out)\n- Depth blur for background cards',
     8, true);

  -- Spacing Guidelines
  INSERT INTO style_guidelines (brand_id, category, title, content, order_index, is_published)
  VALUES
    (v_brand_id, 'spacing', 'Spacing Scale',
     E'## CentrexStyle Spacing Scale\n\n### Base Unit: 4px\n\n| Token | Value | Usage |\n|-------|-------|-------|\n| space-1 | 4px | Tight spacing, icon gaps |\n| space-2 | 8px | Small component gaps |\n| space-3 | 12px | Standard element spacing |\n| space-4 | 16px | Card padding (--space-40) |\n| space-6 | 24px | Section spacing (--space-50) |\n| space-9 | 36px | Large gaps (--space-60) |\n| space-12 | 48px | Section margins |\n| space-16 | 64px | Hero sections |\n\n### Guidelines\n- Use multiples of 4px for consistency\n- Card padding: 24px (1.5rem)\n- Section gaps: 32px-48px\n- Hero padding: 64px+ vertical',
     9, true);

  -- Shadows Guidelines
  INSERT INTO style_guidelines (brand_id, category, title, content, order_index, is_published)
  VALUES
    (v_brand_id, 'other', 'Shadow Tokens',
     E'## CentrexStyle Shadow System\n\n### Natural\n```css\nbox-shadow: 6px 6px 9px rgba(0, 0, 0, 0.2);\n```\nSubtle depth for cards and panels in normal state.\n\n### Deep\n```css\nbox-shadow: 12px 12px 50px rgba(0, 0, 0, 0.4);\n```\nStrong depth for modals, overlays, and focus states.\n\n### Crisp\n```css\nbox-shadow: 6px 6px 0px rgba(0, 0, 0, 1);\n```\nHard shadow for retro/bold aesthetic elements.\n\n### Card Shadow\n```css\nbox-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.9);\n```\nDark theme card elevation.\n\n### Glow\n```css\nbox-shadow: 0 4px 12px rgba(61, 174, 43, 0.3);\n```\nPrimary color glow for active buttons.',
     10, true);

  RAISE NOTICE 'CentrexStyle seed data inserted: % colors, % typography, % guidelines',
    (SELECT COUNT(*) FROM style_colors WHERE brand_id = v_brand_id),
    (SELECT COUNT(*) FROM style_typography WHERE brand_id = v_brand_id),
    (SELECT COUNT(*) FROM style_guidelines WHERE brand_id = v_brand_id);

END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'CentrexStyle complete seed migration finished successfully';
END $$;
