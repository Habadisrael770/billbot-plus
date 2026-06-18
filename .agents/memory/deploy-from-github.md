---
name: Deployment is GitHub-sourced, not workspace-sourced
description: Why "publish says no changes" while prod serves old code — deploy reads from GitHub origin, which lags the workspace.
---

# Deployment pulls from GitHub origin, not the local workspace

This repl's autoscale deployment (billibot.net) is wired to deploy from its
GitHub remote `origin` (github.com/habadisrael770/billbot-plus), **not** from the
local Replit workspace tree.

**Symptom seen:** Production served stale code (missing newly-added routes, old
secrets), yet the Publish UI reported "already published, no changes to publish,"
and `listDeploymentBuilds` showed no new build despite repeated Publish clicks.
Root cause: the local `master` was many commits ahead of `origin/master`, so
GitHub (the deploy source) had not changed → publish saw nothing to deploy.

**Why:** Replit compares/deploys the connected GitHub branch. If commits live only
in the workspace and were never pushed to GitHub, publishing is a no-op.

**How to apply:** When prod won't update / publish says "no changes" but the
workspace clearly has newer committed code:
1. Check `git --no-optional-locks status -sb` — look for `ahead N` vs origin.
2. The fix is to **push the commits to GitHub**, then Publish/Redeploy.
3. CLI `git push` fails in the sandbox: "Password authentication is not supported"
   (no GitHub token in env). The push must be done by the **user** via Replit's
   Version Control pane (it holds the GitHub OAuth), or via a path that has creds.
4. If `git merge-base --is-ancestor origin/master HEAD` is true, it's a clean
   fast-forward (no force needed). Force is only needed if histories diverged.
