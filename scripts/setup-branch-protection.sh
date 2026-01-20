#!/bin/bash
# =============================================================================
# Branch Protection Setup Script
# =============================================================================
# This script configures branch protection rules for the main branch.
#
# Prerequisites:
# - GitHub CLI (gh) installed and authenticated
# - Repository must be public OR account must have GitHub Pro/Team/Enterprise
#
# Usage:
#   ./scripts/setup-branch-protection.sh
#
# =============================================================================

set -e

# Configuration
OWNER="mejohnc-ft"
REPO="MeJohnC.Org"
BRANCH="main"

echo "=========================================="
echo "Branch Protection Setup"
echo "=========================================="
echo "Repository: $OWNER/$REPO"
echo "Branch: $BRANCH"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

echo "Checking repository access..."
REPO_INFO=$(gh api repos/$OWNER/$REPO --jq '{visibility: .visibility, private: .private}' 2>&1) || {
    echo "Error: Cannot access repository. Check your permissions."
    exit 1
}

echo "Repository info: $REPO_INFO"
echo ""

# Check if branch exists
echo "Checking if branch '$BRANCH' exists..."
gh api repos/$OWNER/$REPO/branches/$BRANCH --jq '.name' > /dev/null 2>&1 || {
    echo "Error: Branch '$BRANCH' does not exist."
    exit 1
}
echo "Branch '$BRANCH' exists."
echo ""

# Apply branch protection rules
echo "Applying branch protection rules..."
echo ""

# Build the JSON payload for required_status_checks
STATUS_CHECKS_JSON='{
  "strict": true,
  "contexts": ["Code Quality", "Tests", "Build"]
}'

# Build the JSON payload for required_pull_request_reviews
PR_REVIEWS_JSON='{
  "required_approving_review_count": 1,
  "dismiss_stale_reviews": true,
  "require_code_owner_reviews": false
}'

# Apply the protection rules
echo "Setting branch protection rules..."
RESULT=$(gh api repos/$OWNER/$REPO/branches/$BRANCH/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks="$STATUS_CHECKS_JSON" \
  -F enforce_admins=true \
  -f required_pull_request_reviews="$PR_REVIEWS_JSON" \
  -F restrictions=null \
  -F required_linear_history=true \
  -F allow_force_pushes=false \
  -F allow_deletions=false 2>&1) || {
    echo ""
    echo "Error: Failed to set branch protection rules."
    echo ""
    if echo "$RESULT" | grep -q "Upgrade to GitHub Pro"; then
        echo "This error indicates the repository requires GitHub Pro or higher"
        echo "for branch protection on private repositories."
        echo ""
        echo "Options:"
        echo "  1. Upgrade to GitHub Pro (\$4/month)"
        echo "  2. Make the repository public"
        echo ""
    fi
    echo "API Response: $RESULT"
    exit 1
}

echo "Branch protection rules applied successfully!"
echo ""

# Verify the configuration
echo "Verifying configuration..."
echo ""

echo "Required Status Checks:"
gh api repos/$OWNER/$REPO/branches/$BRANCH/protection/required_status_checks \
  --jq '{strict: .strict, contexts: .contexts}' 2>/dev/null || echo "  Unable to retrieve"
echo ""

echo "Required Pull Request Reviews:"
gh api repos/$OWNER/$REPO/branches/$BRANCH/protection/required_pull_request_reviews \
  --jq '{required_approving_review_count: .required_approving_review_count, dismiss_stale_reviews: .dismiss_stale_reviews}' 2>/dev/null || echo "  Unable to retrieve"
echo ""

echo "Enforcement Settings:"
gh api repos/$OWNER/$REPO/branches/$BRANCH/protection \
  --jq '{enforce_admins: .enforce_admins.enabled, required_linear_history: .required_linear_history.enabled, allow_force_pushes: .allow_force_pushes.enabled, allow_deletions: .allow_deletions.enabled}' 2>/dev/null || echo "  Unable to retrieve"
echo ""

echo "=========================================="
echo "Branch protection setup complete!"
echo "=========================================="
echo ""
echo "The following rules are now active on '$BRANCH':"
echo "  - Require 1 approving pull request review"
echo "  - Dismiss stale reviews on new commits"
echo "  - Require status checks to pass:"
echo "      - Code Quality"
echo "      - Tests"
echo "      - Build"
echo "  - Require branch to be up to date"
echo "  - Enforce rules for administrators"
echo "  - Require linear history (no merge commits)"
echo "  - Prohibit force pushes"
echo "  - Prohibit branch deletion"
echo ""
