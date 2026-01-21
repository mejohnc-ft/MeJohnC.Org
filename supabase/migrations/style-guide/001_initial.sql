-- Style Guide Feature Migration
-- Run this in Supabase SQL Editor
-- Prerequisites: core migrations must be applied first
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run core migrations first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'Missing prerequisite: update_updated_at_column() function. Run core migrations first.';
  END IF;
END $$;

-- ============================================
-- STYLE GUIDE TABLES
-- ============================================

-- Brands: Store brand definitions
CREATE TABLE IF NOT EXISTS style_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  design_tokens JSONB DEFAULT '{}',
  figma_file_key TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, name)
);

-- Assets: Store brand assets (logos, icons, images, etc.)
CREATE TABLE IF NOT EXISTS style_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  brand_id UUID REFERENCES style_brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('logo', 'icon', 'image', 'illustration', 'font', 'document', 'other')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Guidelines: Store style guidelines and documentation
CREATE TABLE IF NOT EXISTS style_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  brand_id UUID REFERENCES style_brands(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'logo-usage',
    'color-palette',
    'typography',
    'imagery',
    'voice-tone',
    'spacing',
    'components',
    'accessibility',
    'other'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Color Tokens: Store extracted/defined colors
CREATE TABLE IF NOT EXISTS style_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES style_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_value TEXT NOT NULL,
  rgba_r INTEGER CHECK (rgba_r >= 0 AND rgba_r <= 255),
  rgba_g INTEGER CHECK (rgba_g >= 0 AND rgba_g <= 255),
  rgba_b INTEGER CHECK (rgba_b >= 0 AND rgba_b <= 255),
  rgba_a NUMERIC(3,2) CHECK (rgba_a >= 0 AND rgba_a <= 1),
  category TEXT DEFAULT 'other' CHECK (category IN (
    'primary', 'secondary', 'accent', 'semantic', 'neutral',
    'background', 'foreground', 'border', 'other'
  )),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Typography Tokens: Store font definitions
CREATE TABLE IF NOT EXISTS style_typography (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES style_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_size NUMERIC(6,2) NOT NULL,
  font_weight INTEGER NOT NULL CHECK (font_weight >= 100 AND font_weight <= 900),
  line_height NUMERIC(4,2) NOT NULL,
  letter_spacing NUMERIC(4,2) DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_style_brands_tenant ON style_brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_style_brands_default ON style_brands(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_style_brands_deleted ON style_brands(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_style_assets_tenant ON style_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_style_assets_brand ON style_assets(brand_id);
CREATE INDEX IF NOT EXISTS idx_style_assets_type ON style_assets(type);
CREATE INDEX IF NOT EXISTS idx_style_assets_tags ON style_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_style_assets_deleted ON style_assets(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_style_guidelines_tenant ON style_guidelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_style_guidelines_brand ON style_guidelines(brand_id);
CREATE INDEX IF NOT EXISTS idx_style_guidelines_category ON style_guidelines(category);
CREATE INDEX IF NOT EXISTS idx_style_guidelines_deleted ON style_guidelines(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_style_colors_brand ON style_colors(brand_id);
CREATE INDEX IF NOT EXISTS idx_style_typography_brand ON style_typography(brand_id);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS style_brands_updated_at ON style_brands;
CREATE TRIGGER style_brands_updated_at
  BEFORE UPDATE ON style_brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS style_assets_updated_at ON style_assets;
CREATE TRIGGER style_assets_updated_at
  BEFORE UPDATE ON style_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS style_guidelines_updated_at ON style_guidelines;
CREATE TRIGGER style_guidelines_updated_at
  BEFORE UPDATE ON style_guidelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS style_colors_updated_at ON style_colors;
CREATE TRIGGER style_colors_updated_at
  BEFORE UPDATE ON style_colors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS style_typography_updated_at ON style_typography;
CREATE TRIGGER style_typography_updated_at
  BEFORE UPDATE ON style_typography
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE style_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_typography ENABLE ROW LEVEL SECURITY;

-- Brands: Admin full access
DROP POLICY IF EXISTS style_brands_admin_all ON style_brands;
CREATE POLICY style_brands_admin_all ON style_brands
  FOR ALL USING (is_admin());

-- Assets: Admin full access
DROP POLICY IF EXISTS style_assets_admin_all ON style_assets;
CREATE POLICY style_assets_admin_all ON style_assets
  FOR ALL USING (is_admin());

-- Guidelines: Public read for published, admin full access
DROP POLICY IF EXISTS style_guidelines_public_read ON style_guidelines;
CREATE POLICY style_guidelines_public_read ON style_guidelines
  FOR SELECT USING (is_published = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS style_guidelines_admin_all ON style_guidelines;
CREATE POLICY style_guidelines_admin_all ON style_guidelines
  FOR ALL USING (is_admin());

-- Colors: Admin full access
DROP POLICY IF EXISTS style_colors_admin_all ON style_colors;
CREATE POLICY style_colors_admin_all ON style_colors
  FOR ALL USING (is_admin());

-- Typography: Admin full access
DROP POLICY IF EXISTS style_typography_admin_all ON style_typography;
CREATE POLICY style_typography_admin_all ON style_typography
  FOR ALL USING (is_admin());

-- ============================================
-- SEED DEFAULT BRAND (CentrexStyle)
-- ============================================

INSERT INTO style_brands (name, description, primary_color, secondary_color, is_default, design_tokens)
VALUES (
  'CentrexStyle',
  'Official CentrexIT brand design system with PMS color specifications.',
  '#3dae2b',
  '#0071ce',
  true,
  '{
    "colors": [
      {"name": "Primary Green", "value": "#3dae2b", "rgba": {"r": 61, "g": 174, "b": 43, "a": 1}, "category": "primary"},
      {"name": "Secondary Blue", "value": "#0071ce", "rgba": {"r": 0, "g": 113, "b": 206, "a": 1}, "category": "secondary"},
      {"name": "Tertiary Orange", "value": "#ff8300", "rgba": {"r": 255, "g": 131, "b": 0, "a": 1}, "category": "accent"},
      {"name": "Accent Red", "value": "#e1251b", "rgba": {"r": 225, "g": 37, "b": 27, "a": 1}, "category": "accent"}
    ],
    "typography": [
      {"name": "Heading", "fontFamily": "GilmerBold, Segoe UI, system-ui, sans-serif", "fontSize": 36, "fontWeight": 700, "lineHeight": 1.2, "letterSpacing": 0},
      {"name": "Body", "fontFamily": "Hind, Segoe UI, system-ui, sans-serif", "fontSize": 16, "fontWeight": 400, "lineHeight": 1.6, "letterSpacing": 0}
    ],
    "spacing": [
      {"name": "space-40", "value": 16, "unit": "px"},
      {"name": "space-50", "value": 24, "unit": "px"},
      {"name": "space-60", "value": 36, "unit": "px"}
    ],
    "shadows": [
      {"name": "natural", "value": "6px 6px 9px rgba(0, 0, 0, 0.2)"},
      {"name": "deep", "value": "12px 12px 50px rgba(0, 0, 0, 0.4)"},
      {"name": "crisp", "value": "6px 6px 0px rgba(0, 0, 0, 1)"}
    ],
    "radii": [
      {"name": "sm", "value": 4, "unit": "px"},
      {"name": "md", "value": 8, "unit": "px"},
      {"name": "lg", "value": 16, "unit": "px"},
      {"name": "xl", "value": 24, "unit": "px"}
    ],
    "metadata": {
      "source": "custom",
      "fileName": "CentrexStyle",
      "lastModified": "2024-01-01T00:00:00Z",
      "extractedAt": "2024-01-01T00:00:00Z"
    }
  }'::jsonb
)
ON CONFLICT (tenant_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  design_tokens = EXCLUDED.design_tokens,
  updated_at = now();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Style Guide migration completed successfully';
  RAISE NOTICE 'Tables created: style_brands, style_assets, style_guidelines, style_colors, style_typography';
END $$;
