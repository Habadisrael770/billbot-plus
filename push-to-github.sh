#!/usr/bin/env bash
# Run this from the Replit Shell tab to push to GitHub
# Usage: bash push-to-github.sh
set -e

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set."
  echo "Make sure it is saved in Replit Secrets."
  exit 1
fi

REMOTE_URL="https://habadisrael770:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/habadisrael770/billbot-plus.git"

echo "Fetching remote..."
git fetch "$REMOTE_URL" master

echo "Merging remote changes (keeping our local changes)..."
git merge FETCH_HEAD --no-edit -m "Merge: sync remote before push"

echo "Pushing to GitHub..."
git push "$REMOTE_URL" master

echo "Done! Code is now on GitHub."
