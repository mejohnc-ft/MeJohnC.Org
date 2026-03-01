-- Add tenant_id and author columns to blog_posts
-- Supports Ghost CMS decoupling (#307)

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES app.tenants(id);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_email TEXT;

-- Backfill existing rows with default tenant
UPDATE blog_posts SET tenant_id = app.default_tenant_id() WHERE tenant_id IS NULL;

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant_id ON blog_posts(tenant_id);
