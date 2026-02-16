-- Seed data for configs table
-- Run after 007_command_center.sql migration

INSERT INTO configs (name, slug, description, type, source_path, format, category, is_active, tags) VALUES
('ESLint Config', 'eslint-config', 'ESLint flat config with TypeScript and React rules', 'file', 'eslint.config.js', 'javascript', 'lint', true, '{"eslint", "linting", "typescript"}'),
('Vite Config', 'vite-config', 'Vite build configuration with React and path aliases', 'file', 'vite.config.ts', 'typescript', 'build', true, '{"vite", "build", "react"}'),
('Tailwind Config', 'tailwind-config', 'Tailwind CSS configuration with custom theme', 'file', 'tailwind.config.js', 'javascript', 'styling', true, '{"tailwind", "css", "theme"}'),
('Netlify Config', 'netlify-config', 'Netlify deployment configuration with redirects and headers', 'file', 'netlify.toml', 'toml', 'deploy', true, '{"netlify", "deploy", "redirects"}'),
('TypeScript Config', 'tsconfig', 'TypeScript compiler configuration', 'file', 'tsconfig.json', 'json', 'build', true, '{"typescript", "compiler", "build"}')
ON CONFLICT (slug) DO NOTHING;
