#!/bin/bash
# One-time setup: create GitHub repo and push Hyrlo
set -e

REPO="${1:-Hyrlo}"
OWNER="${2:-Sammy-727}"

echo "=== Hyrlo GitHub Setup ==="
echo ""

if ! command -v gh &>/dev/null; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

if gh repo view "${OWNER}/${REPO}" &>/dev/null; then
  echo "Repo ${OWNER}/${REPO} already exists. Pushing..."
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${OWNER}/${REPO}.git"
  git push -u origin main
else
  echo "Creating ${OWNER}/${REPO}..."
  gh repo create "${OWNER}/${REPO}" \
    --public \
    --description "Hyrlo — hyperlocal hiring platform" \
    --source=. \
    --remote=origin \
    --push
fi

echo ""
echo "✓ Repo: https://github.com/${OWNER}/${REPO}"
echo ""
echo "Next steps:"
echo "  1. Render: https://render.com/deploy → connect ${OWNER}/${REPO}"
echo "  2. Or Vercel: import ${OWNER}/${REPO}"
echo "  3. GitHub Pages: Settings → Pages → GitHub Actions"
