# Claude Code Instructions for MeJohnC.Org

## Project Board

**Always check the GitHub Project before starting development work:**

```bash
gh project item-list 4 --owner mejohnc-ft --limit 50
```

Project URL: https://github.com/users/mejohnc-ft/projects/4

## Workflow

1. **At session start**: Check the project board for current priorities
2. **Before coding**: Find or create an issue for the work
3. **During work**: Reference issue numbers in commits (e.g., "Fixes #15")
4. **After completion**: Close issues via PR or manually

## Issue Management

- All backlog items are GitHub Issues in `mejohnc-ft/MeJohnC.Org`
- Issues are organized on the project board by status
- Use labels: `enhancement`, `bug`, `infrastructure`
- PRs should reference issues: `Closes #XX` or `Fixes #XX`

## Quick Commands

```bash
# List open issues
gh issue list --repo mejohnc-ft/MeJohnC.Org --state open

# View project board
gh project item-list 4 --owner mejohnc-ft

# Create new issue
gh issue create --repo mejohnc-ft/MeJohnC.Org --title "Title" --body "Description"

# Add issue to project
gh project item-add 4 --owner mejohnc-ft --url <issue-url>
```

## Architecture

- **Frontend**: React 18 + Vite + TypeScript
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Clerk (JWT integration)
- **Hosting**: Netlify
- **CI/CD**: GitHub Actions

## Related Projects

- `site-manager-agent/` - AI agent for site management (sibling directory)

## Current Phases

- **Phase 1**: AI Site Manager Core (mostly complete)
- **Phase 2**: Twitter/X Bookmark Importer
- **Phase 3**: CRM, Metrics Dashboard, Style Guide, Marketing, Site Builder, Task System
