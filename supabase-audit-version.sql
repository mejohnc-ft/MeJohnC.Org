-- Audit Log Table
-- Tracks all changes to content (create, update, delete)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  user_id TEXT, -- Clerk user ID
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Version History Table
-- Stores complete snapshots for content versioning
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  change_summary TEXT,
  user_id TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name, record_id, version_number)
);

-- Index for faster version queries
CREATE INDEX IF NOT EXISTS idx_content_versions_record ON content_versions(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_version ON content_versions(table_name, record_id, version_number DESC);

-- RLS Policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the application can insert audit logs (via service role)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for content_versions
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view version history
CREATE POLICY "Authenticated users can view versions"
  ON content_versions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can manage versions
CREATE POLICY "Service role can manage versions"
  ON content_versions FOR ALL
  WITH CHECK (true);

-- Function to get the next version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_table_name TEXT, p_record_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM content_versions
  WHERE table_name = p_table_name AND record_id = p_record_id;
  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-create audit logs and versions for blog_posts
CREATE OR REPLACE FUNCTION audit_blog_posts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data)
    VALUES ('blog_posts', NEW.id, 'create', to_jsonb(NEW));

    INSERT INTO content_versions (table_name, record_id, version_number, data, change_summary)
    VALUES ('blog_posts', NEW.id, 1, to_jsonb(NEW), 'Initial creation');

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES ('blog_posts', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));

    INSERT INTO content_versions (table_name, record_id, version_number, data, change_summary)
    VALUES ('blog_posts', NEW.id, get_next_version_number('blog_posts', NEW.id), to_jsonb(NEW), 'Content updated');

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data)
    VALUES ('blog_posts', OLD.id, 'delete', to_jsonb(OLD));

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for blog_posts
DROP TRIGGER IF EXISTS audit_blog_posts_trigger ON blog_posts;
CREATE TRIGGER audit_blog_posts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION audit_blog_posts();

-- Trigger function for apps
CREATE OR REPLACE FUNCTION audit_apps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data)
    VALUES ('apps', NEW.id, 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES ('apps', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data)
    VALUES ('apps', OLD.id, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_apps_trigger ON apps;
CREATE TRIGGER audit_apps_trigger
  AFTER INSERT OR UPDATE OR DELETE ON apps
  FOR EACH ROW EXECUTE FUNCTION audit_apps();

-- Trigger function for projects
CREATE OR REPLACE FUNCTION audit_projects()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data)
    VALUES ('projects', NEW.id, 'create', to_jsonb(NEW));

    INSERT INTO content_versions (table_name, record_id, version_number, data, change_summary)
    VALUES ('projects', NEW.id, 1, to_jsonb(NEW), 'Initial creation');

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES ('projects', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));

    INSERT INTO content_versions (table_name, record_id, version_number, data, change_summary)
    VALUES ('projects', NEW.id, get_next_version_number('projects', NEW.id), to_jsonb(NEW), 'Content updated');

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data)
    VALUES ('projects', OLD.id, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_projects_trigger ON projects;
CREATE TRIGGER audit_projects_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_projects();
