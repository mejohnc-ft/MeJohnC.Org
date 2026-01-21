-- Site Builder Migration
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'Missing prerequisite: update_updated_at_column() function. Run schema.sql first.';
  END IF;
END $$;

-- ============================================
-- SITE BUILDER TABLES
-- ============================================

-- Pages: Store page definitions
CREATE TABLE IF NOT EXISTS sb_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  published_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Page Versions: Track version history
CREATE TABLE IF NOT EXISTS sb_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES sb_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  components JSONB NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, version_number)
);

-- Page Components: Store component instances on pages
CREATE TABLE IF NOT EXISTS sb_page_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES sb_pages(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN (
    'hero', 'features', 'testimonials', 'cta', 'text', 'image',
    'video', 'spacer', 'divider', 'grid', 'columns', 'accordion',
    'tabs', 'gallery', 'stats', 'team', 'pricing', 'faq', 'contact'
  )),
  props JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL,
  parent_id UUID REFERENCES sb_page_components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Component Templates: Reusable component presets
CREATE TABLE IF NOT EXISTS sb_component_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  component_type TEXT NOT NULL,
  preview_image TEXT,
  props JSONB NOT NULL DEFAULT '{}',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sb_pages_slug ON sb_pages(slug);
CREATE INDEX IF NOT EXISTS idx_sb_pages_status ON sb_pages(status);
CREATE INDEX IF NOT EXISTS idx_sb_pages_created_by ON sb_pages(created_by);

CREATE INDEX IF NOT EXISTS idx_sb_page_versions_page_id ON sb_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_sb_page_versions_version ON sb_page_versions(page_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_sb_page_components_page_id ON sb_page_components(page_id);
CREATE INDEX IF NOT EXISTS idx_sb_page_components_order ON sb_page_components(page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sb_page_components_parent ON sb_page_components(parent_id);

CREATE INDEX IF NOT EXISTS idx_sb_component_templates_type ON sb_component_templates(component_type);
CREATE INDEX IF NOT EXISTS idx_sb_component_templates_category ON sb_component_templates(category);
CREATE INDEX IF NOT EXISTS idx_sb_component_templates_active ON sb_component_templates(is_active);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS set_sb_pages_updated_at ON sb_pages;
CREATE TRIGGER set_sb_pages_updated_at
  BEFORE UPDATE ON sb_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_sb_page_components_updated_at ON sb_page_components;
CREATE TRIGGER set_sb_page_components_updated_at
  BEFORE UPDATE ON sb_page_components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_sb_component_templates_updated_at ON sb_component_templates;
CREATE TRIGGER set_sb_component_templates_updated_at
  BEFORE UPDATE ON sb_component_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE sb_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_component_templates ENABLE ROW LEVEL SECURITY;

-- Public read access to published pages
CREATE POLICY "Public read published pages" ON sb_pages
  FOR SELECT USING (status = 'published');

-- Public read access to components of published pages
CREATE POLICY "Public read published page components" ON sb_page_components
  FOR SELECT USING (
    page_id IN (SELECT id FROM sb_pages WHERE status = 'published')
  );

-- Admin full access to pages
CREATE POLICY "Admin full access to pages" ON sb_pages
  FOR ALL USING (is_admin());

-- Admin full access to page versions
CREATE POLICY "Admin full access to page versions" ON sb_page_versions
  FOR ALL USING (is_admin());

-- Admin full access to page components
CREATE POLICY "Admin full access to page components" ON sb_page_components
  FOR ALL USING (is_admin());

-- Admin full access to component templates
CREATE POLICY "Admin full access to component templates" ON sb_component_templates
  FOR ALL USING (is_admin());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create a new page version
CREATE OR REPLACE FUNCTION create_page_version(
  p_page_id UUID,
  p_created_by TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page_record RECORD;
  v_version_number INTEGER;
  v_version_id UUID;
  v_components JSONB;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create page versions';
  END IF;

  -- Get page details
  SELECT * INTO v_page_record FROM sb_pages WHERE id = p_page_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM sb_page_versions
  WHERE page_id = p_page_id;

  -- Get current components as JSON
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'component_type', component_type,
        'props', props,
        'order_index', order_index,
        'parent_id', parent_id
      )
      ORDER BY order_index
    ),
    '[]'::jsonb
  )
  INTO v_components
  FROM sb_page_components
  WHERE page_id = p_page_id;

  -- Create version
  INSERT INTO sb_page_versions (
    page_id,
    version_number,
    title,
    slug,
    description,
    components,
    created_by
  )
  VALUES (
    p_page_id,
    v_version_number,
    v_page_record.title,
    v_page_record.slug,
    v_page_record.description,
    v_components,
    p_created_by
  )
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$;

-- Function to restore a page version
CREATE OR REPLACE FUNCTION restore_page_version(
  p_version_id UUID,
  p_updated_by TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_record RECORD;
  v_component JSONB;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore page versions';
  END IF;

  -- Get version details
  SELECT * INTO v_version_record FROM sb_page_versions WHERE id = p_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Update page metadata
  UPDATE sb_pages
  SET
    title = v_version_record.title,
    slug = v_version_record.slug,
    description = v_version_record.description,
    updated_by = p_updated_by,
    updated_at = now()
  WHERE id = v_version_record.page_id;

  -- Delete current components
  DELETE FROM sb_page_components WHERE page_id = v_version_record.page_id;

  -- Restore components from version
  FOR v_component IN
    SELECT * FROM jsonb_array_elements(v_version_record.components)
  LOOP
    INSERT INTO sb_page_components (
      id,
      page_id,
      component_type,
      props,
      order_index,
      parent_id
    )
    VALUES (
      (v_component->>'id')::UUID,
      v_version_record.page_id,
      v_component->>'component_type',
      v_component->'props',
      (v_component->>'order_index')::INTEGER,
      CASE WHEN v_component->>'parent_id' IS NULL THEN NULL ELSE (v_component->>'parent_id')::UUID END
    );
  END LOOP;

  RETURN v_version_record.page_id;
END;
$$;

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Insert default component templates
INSERT INTO sb_component_templates (name, description, component_type, category, props, is_active, created_by)
VALUES
  (
    'Hero - Centered',
    'Centered hero with headline, description, and CTA',
    'hero',
    'Heroes',
    '{"layout":"centered","headline":"Welcome to Our Site","subheadline":"Build amazing things with ease","ctaText":"Get Started","ctaLink":"#","backgroundImage":null,"backgroundOverlay":true}',
    true,
    'system'
  ),
  (
    'Features - Grid',
    '3-column feature grid',
    'features',
    'Features',
    '{"layout":"grid","columns":3,"items":[{"icon":"check","title":"Feature One","description":"Amazing feature description"},{"icon":"check","title":"Feature Two","description":"Another great feature"},{"icon":"check","title":"Feature Three","description":"One more feature"}]}',
    true,
    'system'
  ),
  (
    'CTA - Banner',
    'Full-width call-to-action banner',
    'cta',
    'CTAs',
    '{"headline":"Ready to get started?","description":"Join thousands of satisfied customers","buttonText":"Sign Up Now","buttonLink":"#","layout":"banner","backgroundColor":"primary"}',
    true,
    'system'
  ),
  (
    'Text - Rich Content',
    'Rich text content block',
    'text',
    'Content',
    '{"content":"<p>Add your rich text content here. Supports <strong>bold</strong>, <em>italic</em>, and more.</p>","alignment":"left","maxWidth":"prose"}',
    true,
    'system'
  )
ON CONFLICT DO NOTHING;
