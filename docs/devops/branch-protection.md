# Branch Protection Configuration

This document describes the branch protection rules for the `main` branch of the MeJohnC.Org repository.

## Overview

Branch protection rules help maintain code quality and stability by requiring certain conditions to be met before changes can be merged into protected branches.

## Current Status

**Important**: Branch protection rules require either:
- GitHub Pro, Team, or Enterprise subscription for private repositories
- A public repository (free tier supports branch protection for public repos)

The repository is currently **private** on a free GitHub account. The configuration below will be applied when either:
1. The repository is made public
2. The account is upgraded to GitHub Pro or higher

## Protected Branches

### `main` Branch

The main branch is the production branch and has the following protection rules configured:

#### Required Pull Request Reviews

| Setting | Value | Description |
|---------|-------|-------------|
| Required approving reviews | 1 | At least one approval required before merging |
| Dismiss stale reviews | Yes | Previous approvals are dismissed when new commits are pushed |
| Require review from code owners | No | Code owners review not required (can be enabled if CODEOWNERS file is added) |

#### Required Status Checks

The following CI checks must pass before merging:

| Status Check | Job Name | Description |
|--------------|----------|-------------|
| Code Quality | `quality` | ESLint and TypeScript type checking |
| Tests | `test` | Unit and integration tests via Vitest |
| Build | `build` | Production build verification |

Additional settings:
- **Require branches to be up to date**: Yes - PR branch must be current with base branch

#### Branch Restrictions

| Setting | Value | Description |
|---------|-------|-------------|
| Enforce for administrators | Yes | Admins must also follow rules |
| Allow force pushes | No | Force pushes are prohibited |
| Allow deletions | No | Branch cannot be deleted |
| Require linear history | Yes | Only allow squash or rebase merges (no merge commits) |

## Configuration Commands

### Using GitHub CLI

Once the repository meets the requirements (public or Pro account), run the following command to configure branch protection:

```bash
# Set branch protection rules for main branch
gh api repos/mejohnc-ft/MeJohnC.Org/branches/main/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["Code Quality","Tests","Build"]}' \
  -F enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  -F restrictions=null \
  -F required_linear_history=true \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

### Verifying Configuration

To verify the branch protection rules are correctly applied:

```bash
# Get current branch protection settings
gh api repos/mejohnc-ft/MeJohnC.Org/branches/main/protection

# Get required status checks
gh api repos/mejohnc-ft/MeJohnC.Org/branches/main/protection/required_status_checks

# Get required pull request reviews
gh api repos/mejohnc-ft/MeJohnC.Org/branches/main/protection/required_pull_request_reviews
```

### Removing Protection (if needed)

```bash
# Remove all branch protection rules
gh api repos/mejohnc-ft/MeJohnC.Org/branches/main/protection -X DELETE
```

## CI/CD Integration

The branch protection rules are integrated with the CI/CD pipeline defined in `.github/workflows/ci.yml`:

```
Pull Request to main
        |
        v
+-------+-------+
|   quality     |  (lint + typecheck)
+-------+-------+
        |
        v
+-------+-------+
|     test      |  (unit tests)
+-------+-------+
        |
        v
+-------+-------+
|    build      |  (depends on quality + test)
+-------+-------+
        |
        v
Branch Protection Check
(all status checks must pass)
        |
        v
     Merge
```

## Workflow for Contributors

1. **Create a feature branch** from `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push and create a pull request**
   ```bash
   git push -u origin feature/your-feature-name
   gh pr create --title "Your PR title" --body "Description"
   ```

4. **Wait for CI checks to pass**
   - Code Quality (lint + typecheck)
   - Tests
   - Build

5. **Request review** from a team member

6. **Address review feedback** if any

7. **Merge** (squash or rebase only, no merge commits)

## Alternative: Repository Rulesets

GitHub also supports Repository Rulesets as a newer, more flexible alternative to branch protection rules. When available, consider using rulesets for:
- More granular control over rules
- Ability to target multiple branches with one ruleset
- Easier management of complex rule configurations

```bash
# Create a ruleset (when available)
gh api repos/mejohnc-ft/MeJohnC.Org/rulesets \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -f name="Main Branch Protection" \
  -f target="branch" \
  -f enforcement="active" \
  -f conditions='{"ref_name":{"include":["refs/heads/main"],"exclude":[]}}' \
  -f rules='[
    {"type":"pull_request","parameters":{"required_approving_review_count":1,"dismiss_stale_reviews_on_push":true}},
    {"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":true,"required_status_checks":[{"context":"Code Quality"},{"context":"Tests"},{"context":"Build"}]}},
    {"type":"non_fast_forward"},
    {"type":"deletion"}
  ]'
```

## Troubleshooting

### "Upgrade to GitHub Pro" Error

If you receive this error when trying to configure branch protection:
```
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

Options:
1. Upgrade to GitHub Pro ($4/month) or Team plan
2. Make the repository public in Settings > General > Danger Zone

### Status Checks Not Appearing

If status checks don't appear in the PR:
1. Ensure the workflow file exists at `.github/workflows/ci.yml`
2. Verify the workflow runs on `pull_request` events for the `main` branch
3. Check that job names match the contexts in branch protection

### Merge Blocked Despite Passing Checks

1. Verify all required status checks have passed (green checkmarks)
2. Ensure at least one approving review exists
3. Check if the branch is up to date with `main`
4. Confirm you have write access to the repository

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub REST API - Branch Protection](https://docs.github.com/en/rest/branches/branch-protection)
- [GitHub Repository Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [CI/CD Workflow](./.github/workflows/ci.yml)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-20 | Initial documentation created | Claude Code |
