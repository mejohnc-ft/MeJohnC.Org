-- Command Center Migration
-- Prerequisites: schema.sql must be applied first (is_admin, update_updated_at_column)
-- This migration is idempotent and safe to re-run
-- Tables: skills, infrastructure_nodes, configs, runbooks

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
-- SKILLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'skill',
  source TEXT,
  invocation TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  dependencies TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT skills_type_check CHECK (type IN ('skill', 'agent', 'mcp-server', 'script', 'automation')),
  CONSTRAINT skills_category_check CHECK (category IN ('development', 'deployment', 'testing', 'content', 'data', 'other')),
  CONSTRAINT skills_status_check CHECK (status IN ('active', 'inactive', 'draft'))
);

CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING GIN(tags);

DROP TRIGGER IF EXISTS skills_updated_at ON skills;
CREATE TRIGGER skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skills_admin_all ON skills;
CREATE POLICY skills_admin_all ON skills
  FOR ALL USING (is_admin());

-- ============================================
-- INFRASTRUCTURE_NODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS infrastructure_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'service',
  provider TEXT NOT NULL DEFAULT 'other',
  url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT,
  region TEXT,
  config_notes TEXT,
  environment TEXT NOT NULL DEFAULT 'production',
  connected_to UUID[] DEFAULT '{}',
  monthly_cost DECIMAL(10,2),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT infra_type_check CHECK (type IN ('service', 'server', 'database', 'cdn', 'dns', 'domain', 'repository', 'ci-cd', 'monitoring')),
  CONSTRAINT infra_provider_check CHECK (provider IN ('netlify', 'supabase', 'github', 'cloudflare', 'sentry', 'clerk', 'ghost', 'vercel', 'aws', 'other')),
  CONSTRAINT infra_status_check CHECK (status IN ('active', 'degraded', 'inactive')),
  CONSTRAINT infra_environment_check CHECK (environment IN ('production', 'staging', 'development'))
);

CREATE INDEX IF NOT EXISTS idx_infra_slug ON infrastructure_nodes(slug);
CREATE INDEX IF NOT EXISTS idx_infra_type ON infrastructure_nodes(type);
CREATE INDEX IF NOT EXISTS idx_infra_provider ON infrastructure_nodes(provider);
CREATE INDEX IF NOT EXISTS idx_infra_status ON infrastructure_nodes(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_infra_environment ON infrastructure_nodes(environment);
CREATE INDEX IF NOT EXISTS idx_infra_tags ON infrastructure_nodes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_infra_connected_to ON infrastructure_nodes USING GIN(connected_to);

DROP TRIGGER IF EXISTS infra_updated_at ON infrastructure_nodes;
CREATE TRIGGER infra_updated_at
  BEFORE UPDATE ON infrastructure_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE infrastructure_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS infra_admin_all ON infrastructure_nodes;
CREATE POLICY infra_admin_all ON infrastructure_nodes
  FOR ALL USING (is_admin());

-- ============================================
-- CONFIGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'file',
  source_path TEXT,
  content TEXT,
  format TEXT NOT NULL DEFAULT 'text',
  category TEXT NOT NULL DEFAULT 'other',
  version TEXT,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT configs_type_check CHECK (type IN ('file', 'snippet', 'setting', 'template')),
  CONSTRAINT configs_format_check CHECK (format IN ('json', 'yaml', 'toml', 'javascript', 'typescript', 'markdown', 'text', 'env')),
  CONSTRAINT configs_category_check CHECK (category IN ('build', 'lint', 'deploy', 'auth', 'database', 'styling', 'testing', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_configs_slug ON configs(slug);
CREATE INDEX IF NOT EXISTS idx_configs_type ON configs(type);
CREATE INDEX IF NOT EXISTS idx_configs_format ON configs(format);
CREATE INDEX IF NOT EXISTS idx_configs_category ON configs(category);
CREATE INDEX IF NOT EXISTS idx_configs_is_active ON configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_configs_tags ON configs USING GIN(tags);

DROP TRIGGER IF EXISTS configs_updated_at ON configs;
CREATE TRIGGER configs_updated_at
  BEFORE UPDATE ON configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configs_admin_all ON configs;
CREATE POLICY configs_admin_all ON configs
  FOR ALL USING (is_admin());

-- ============================================
-- RUNBOOKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  type TEXT NOT NULL DEFAULT 'runbook',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'normal',
  related_skills UUID[] DEFAULT '{}',
  related_infra UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT runbooks_category_check CHECK (category IN ('deployment', 'troubleshooting', 'onboarding', 'security', 'maintenance', 'architecture', 'api', 'other')),
  CONSTRAINT runbooks_type_check CHECK (type IN ('runbook', 'guide', 'reference', 'decision-record')),
  CONSTRAINT runbooks_status_check CHECK (status IN ('current', 'outdated', 'draft')),
  CONSTRAINT runbooks_priority_check CHECK (priority IN ('critical', 'high', 'normal', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_runbooks_slug ON runbooks(slug);
CREATE INDEX IF NOT EXISTS idx_runbooks_category ON runbooks(category);
CREATE INDEX IF NOT EXISTS idx_runbooks_type ON runbooks(type);
CREATE INDEX IF NOT EXISTS idx_runbooks_status ON runbooks(status) WHERE status = 'current';
CREATE INDEX IF NOT EXISTS idx_runbooks_priority ON runbooks(priority);
CREATE INDEX IF NOT EXISTS idx_runbooks_tags ON runbooks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_runbooks_related_skills ON runbooks USING GIN(related_skills);
CREATE INDEX IF NOT EXISTS idx_runbooks_related_infra ON runbooks USING GIN(related_infra);

DROP TRIGGER IF EXISTS runbooks_updated_at ON runbooks;
CREATE TRIGGER runbooks_updated_at
  BEFORE UPDATE ON runbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runbooks_admin_all ON runbooks;
CREATE POLICY runbooks_admin_all ON runbooks
  FOR ALL USING (is_admin());

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Command Center migration completed successfully';
  RAISE NOTICE 'Tables created: skills, infrastructure_nodes, configs, runbooks';
END $$;
