-- Migration: Create Timelines tables for reusable timeline components
-- Tables: timelines, timeline_entries

-- ============================================
-- TIMELINES TABLE (parent)
-- ============================================
CREATE TABLE IF NOT EXISTS timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  chart_type TEXT DEFAULT 'growth' CHECK (chart_type IN ('growth', 'linear', 'decline')),
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;

-- Public read access for active timelines
CREATE POLICY "Public can view active timelines"
  ON timelines FOR SELECT
  USING (is_active = true);

-- Only authenticated admins can manage
CREATE POLICY "Admin users can manage timelines"
  ON timelines FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================
-- TIMELINE ENTRIES TABLE (children)
-- ============================================
CREATE TABLE IF NOT EXISTS timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  phase TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  dot_position INTEGER DEFAULT 50 CHECK (dot_position >= 0 AND dot_position <= 100),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view timeline_entries"
  ON timeline_entries FOR SELECT
  USING (true);

-- Only authenticated admins can manage
CREATE POLICY "Admin users can manage timeline_entries"
  ON timeline_entries FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_timeline_entries_timeline_id ON timeline_entries(timeline_id);

-- ============================================
-- SEED DATA: Provisioning Roadmap Timeline
-- ============================================

-- Insert the main timeline
INSERT INTO timelines (name, slug, description, chart_type, order_index) VALUES
  ('Provisioning Roadmap', 'provisioning-roadmap', 'Automation & Logistics Transformation journey from 2022 to future state', 'growth', 0);

-- Get the timeline ID and insert entries
WITH provisioning_timeline AS (
  SELECT id FROM timelines WHERE slug = 'provisioning-roadmap'
)
INSERT INTO timeline_entries (timeline_id, label, phase, summary, content, dot_position, order_index)
SELECT
  pt.id,
  e.label,
  e.phase,
  e.summary,
  e.content,
  e.dot_position,
  e.order_index
FROM provisioning_timeline pt,
(VALUES
  (
    '2022-2023',
    'Recovery & Foundation',
    'Cleared COVID backlog, created inventory sheets, standardized SOPs & SLAs',
    'Starting in 2022, I inherited a provisioning backlog of over 72,000 tickets accumulated during the COVID-19 pandemic. Within 6 months, I systematically cleared this backlog by implementing standardized workflows and creating comprehensive inventory tracking sheets. I reintroduced media sanitization protocols that had lapsed and established the SOPs and SLAs that would become the foundation for all future automation work. This phase was about building trust, understanding the systems, and laying groundwork for what was to come.',
    13,
    0
  ),
  (
    '2024',
    'Automation & Knowledge',
    'Completed Immy.Bot buildout, standardized Provisioning KB',
    '2024 marked the shift from manual processes to intelligent automation. I completed the full Immy.Bot buildout, enabling automated software deployments and configurations across our entire client base. The Provisioning Knowledge Base was standardized and made accessible, transforming tribal knowledge into documented, searchable resources. This year laid the technical foundation that would enable the dramatic improvements seen in 2025.',
    24,
    1
  ),
  (
    '2025',
    'Optimization & Growth',
    'One-touch provisions for 75%+ clients, <5 day turnaround, record-breaking October',
    '2025 was the year everything came together. We achieved in-house one-touch provisioning for over 75% of our clients. Provisioning turnaround dropped to under 5 business days—a dramatic improvement from the weeks-long timelines of previous years. October 2025 became our largest provisioning month ever, and we launched a brand-new Inventory system with enhanced UX. I successfully handed off operations to a new hire, established the Provisioning ToolBox with 15 knowledge pieces, and ended the year with fully automated provisioning and inventory intake systems.',
    41,
    2
  ),
  (
    '2026+',
    'Future State',
    'Autopilot/White glove for all clients, 3PL integration, office-free logistics',
    'Looking ahead, the vision is complete automation independence. Every client will have Autopilot or White Glove configuration ready from day one. Third-party logistics (3PL) integration will reduce costs while maintaining our rigorous SLAs. The ultimate goal: eliminate any reliance on physical office space for inventory and logistics, enabling a fully distributed, resilient provisioning operation.',
    75,
    3
  )
) AS e(label, phase, summary, content, dot_position, order_index);
