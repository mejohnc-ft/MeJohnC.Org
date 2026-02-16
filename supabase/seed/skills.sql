-- Seed data for skills table
-- Run after 007_command_center.sql migration

INSERT INTO skills (name, slug, description, type, source, invocation, category, dependencies, status, tags) VALUES
('Commit', 'commit', 'Claude Code skill for creating well-formatted git commits', 'skill', '.claude/skills/commit.md', '/commit', 'development', '{"git"}', 'active', '{"git", "automation", "claude-code"}'),
('Review PR', 'review-pr', 'Claude Code skill for reviewing pull requests', 'skill', '.claude/skills/review-pr.md', '/review-pr', 'development', '{"git", "gh"}', 'active', '{"git", "code-review", "claude-code"}'),
('PDF Toolkit', 'pdf', 'Comprehensive PDF manipulation toolkit', 'skill', '.claude/skills/pdf.md', '/pdf', 'content', '{}', 'active', '{"pdf", "documents", "claude-code"}'),
('Claude Code Guide', 'claude-code-guide', 'Agent for answering questions about Claude Code features', 'agent', NULL, 'claude-code-guide', 'development', '{}', 'active', '{"claude-code", "documentation", "agent"}'),
('Explore Agent', 'explore-agent', 'Fast agent for exploring codebases', 'agent', NULL, 'Explore', 'development', '{}', 'active', '{"codebase", "search", "agent"}'),
('Tech Lead Agent', 'tech-lead', 'Architecture decisions and system design agent', 'agent', NULL, 'tech-lead', 'development', '{}', 'active', '{"architecture", "design", "agent"}'),
('Code Reviewer Agent', 'code-reviewer', 'Code quality and TypeScript best practices agent', 'agent', NULL, 'code-reviewer', 'development', '{}', 'active', '{"code-review", "quality", "agent"}'),
('Supabase MCP Server', 'supabase-mcp', 'MCP server for Supabase database operations', 'mcp-server', NULL, NULL, 'data', '{"supabase"}', 'active', '{"mcp", "supabase", "database"}'),
('Build Script', 'build-script', 'npm run build - Vite production build', 'script', 'package.json', 'npm run build', 'deployment', '{"node", "npm", "vite"}', 'active', '{"build", "vite", "production"}'),
('DB Push Script', 'db-push', 'Push Supabase migrations to remote database', 'script', 'package.json', 'npm run db:push', 'deployment', '{"supabase"}', 'active', '{"database", "migrations", "supabase"}')
ON CONFLICT (slug) DO NOTHING;
