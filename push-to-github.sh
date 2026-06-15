#!/usr/bin/env bash
# Run this from the Replit Shell tab to force-push to GitHub.
# This OVERWRITES the remote master branch with local history.
# Usage: bash push-to-github.sh
set -e

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set in Replit Secrets."
  exit 1
fi

echo "WARNING: This will OVERWRITE the remote master branch on GitHub."
echo "Any commits that exist only on GitHub will be lost."
read -r -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Set origin to authenticated URL (token not printed to terminal)
git remote set-url origin "https://habadisrael770:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/habadisrael770/billbot-plus.git"

echo "Force-pushing master to GitHub..."
git push origin master --force

# Reset origin URL to non-authenticated form so token is not stored in .git/config
git remote set-url origin "https://github.com/habadisrael770/billbot-plus.git"

echo "Done! Code is now on GitHub: https://github.com/habadisrael770/billbot-plus"
