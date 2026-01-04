-- Migration: Create Profile-related tables for Admin CMS
-- Tables: contact_links, work_history, case_studies

-- ============================================
-- CONTACT LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  value TEXT,
  description TEXT,
  icon TEXT NOT NULL CHECK (icon IN ('email', 'linkedin', 'github', 'twitter', 'calendar')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE contact_links ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view contact_links"
  ON contact_links FOR SELECT
  USING (true);

-- Only authenticated admins can manage
CREATE POLICY "Admin users can insert contact_links"
  ON contact_links FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Admin users can update contact_links"
  ON contact_links FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Admin users can delete contact_links"
  ON contact_links FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================
-- WORK HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS work_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  period TEXT NOT NULL,
  highlights TEXT[] DEFAULT '{}',
  tech TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view work_history"
  ON work_history FOR SELECT
  USING (true);

-- Only authenticated admins can manage
CREATE POLICY "Admin users can insert work_history"
  ON work_history FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Admin users can update work_history"
  ON work_history FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Admin users can delete work_history"
  ON work_history FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================
-- CASE STUDIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL,
  title TEXT NOT NULL,
  before_content TEXT NOT NULL,
  after_content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view case_studies"
  ON case_studies FOR SELECT
  USING (true);

-- Only authenticated admins can manage
CREATE POLICY "Admin users can insert case_studies"
  ON case_studies FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Admin users can update case_studies"
  ON case_studies FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Admin users can delete case_studies"
  ON case_studies FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================
-- SEED DATA FROM EXISTING HARDCODED VALUES
-- ============================================

-- Seed contact links
INSERT INTO contact_links (label, href, value, description, icon, order_index) VALUES
  ('Email', 'mailto:mejohnwc@gmail.com', 'mejohnwc@gmail.com', 'Best way to reach me', 'email', 0),
  ('LinkedIn', 'https://www.linkedin.com/in/mejohnc/', '/in/mejohnc', 'Let''s connect', 'linkedin', 1),
  ('GitHub', 'https://github.com/mejohnc-ft', '@mejohnc-ft', 'See my code', 'github', 2),
  ('Calendar', 'https://calendly.com/jonathan-christensen', 'Book a call', 'Schedule time to chat', 'calendar', 3);

-- Seed work history
INSERT INTO work_history (title, company, period, highlights, tech, order_index) VALUES
  (
    'AI Automation Engineer II',
    'centrexIT',
    '2023 — Present',
    ARRAY[
      'Designed agentic workflows in n8n, Make.com, and Power Automate—reduced provisioning time by 70%',
      'Built AI-driven service desk triage using custom LLM pipelines, cutting manual routing by 60%',
      'Developed internal tools with Graph API, PowerShell, and OCR for automated intake processing',
      'Containerized workflows with Docker on Proxmox; maintained M365/Entra/Intune integrations at scale'
    ],
    ARRAY['n8n', 'Make.com', 'Graph API', 'Docker', 'LLMs', 'PowerShell'],
    0
  ),
  (
    'Tier 2 Support Engineer',
    'centrexIT',
    '2020 — 2023',
    ARRAY[
      'Escalation point for 15+ tier 1 techs across multiple client environments',
      'Built PowerShell automation suite that eliminated 8+ hours of weekly manual work',
      'Deployed and maintained Azure AD, Intune, and M365 environments for 20+ clients',
      'Created documentation systems that reduced onboarding time by 40%'
    ],
    ARRAY['Azure AD', 'Intune', 'M365', 'PowerShell', 'Networking'],
    1
  ),
  (
    'IT Support Technician',
    'centrexIT',
    '2019 — 2020',
    ARRAY[
      'Resolved 50+ tickets weekly across diverse client environments',
      'Specialized in printer deployment, network troubleshooting, and user provisioning',
      'Developed first automation scripts for recurring tasks',
      'Maintained 98% customer satisfaction rating'
    ],
    ARRAY['Windows', 'Networking', 'Active Directory', 'Help Desk'],
    2
  ),
  (
    'Freelance Web Developer',
    'Self-Employed',
    '2017 — 2019',
    ARRAY[
      'Built custom websites for local businesses using WordPress and HTML/CSS',
      'Managed hosting, domains, and basic SEO for 10+ clients',
      'First exposure to automation through IFTTT and Zapier integrations',
      'Developed client communication and project management skills'
    ],
    ARRAY['WordPress', 'HTML/CSS', 'JavaScript', 'SEO', 'Zapier'],
    3
  );

-- Seed case studies
INSERT INTO case_studies (metric, title, before_content, after_content, order_index) VALUES
  (
    '70%',
    'Provisioning Automation',
    'Manual parsing of intake forms across 20+ client domains',
    'End-to-end OCR + Graph API pipeline with zero manual parsing',
    0
  ),
  (
    '60%',
    'AI Service Desk Triage',
    'Tier 1 agents manually transcribed and routed every call',
    'LLM-based transcription and auto-ticket creation',
    1
  ),
  (
    '40%',
    'Faster Onboarding',
    'Scattered documentation across multiple platforms',
    'Centralized knowledge base with searchable procedures',
    2
  ),
  (
    '2→0',
    'Manual Intervention',
    'Two manual steps required for every new user setup',
    'Fully automated provisioning with zero-touch deployment',
    3
  );
