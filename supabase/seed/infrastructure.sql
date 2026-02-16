-- Seed data for infrastructure_nodes table
-- Run after 007_command_center.sql migration

INSERT INTO infrastructure_nodes (name, slug, description, type, provider, url, status, tier, environment, monthly_cost, tags) VALUES
('Netlify Production', 'netlify-production', 'Production hosting for mejohnc.org SPA', 'service', 'netlify', 'https://app.netlify.com', 'active', 'Free', 'production', 0.00, '{"hosting", "cdn", "deploy"}'),
('Supabase Production', 'supabase-production', 'Production PostgreSQL database and auth backend', 'database', 'supabase', 'https://supabase.com/dashboard', 'active', 'Free', 'production', 0.00, '{"database", "auth", "api"}'),
('GitHub Repository', 'github-repo', 'Source code repository for MeJohnC.Org', 'repository', 'github', 'https://github.com/MeJohnC', 'active', 'Free', 'production', 0.00, '{"git", "source-code", "ci-cd"}'),
('Clerk Auth', 'clerk-auth', 'Authentication and user management service', 'service', 'clerk', 'https://dashboard.clerk.com', 'active', 'Free', 'production', 0.00, '{"auth", "users", "sso"}'),
('Ghost CMS', 'ghost-cms', 'Blog content management system', 'service', 'ghost', NULL, 'active', 'Self-hosted', 'production', 0.00, '{"blog", "cms", "content"}'),
('Cloudflare DNS', 'cloudflare-dns', 'DNS management and CDN', 'dns', 'cloudflare', 'https://dash.cloudflare.com', 'active', 'Free', 'production', 0.00, '{"dns", "cdn", "security"}'),
('Sentry Monitoring', 'sentry-monitoring', 'Error tracking and performance monitoring', 'monitoring', 'sentry', 'https://sentry.io', 'active', 'Developer', 'production', 0.00, '{"monitoring", "errors", "performance"}'),
('GitHub Actions CI/CD', 'github-actions', 'Continuous integration and deployment pipelines', 'ci-cd', 'github', NULL, 'active', 'Free', 'production', 0.00, '{"ci-cd", "automation", "deploy"}')
ON CONFLICT (slug) DO NOTHING;
