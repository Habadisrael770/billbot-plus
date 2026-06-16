#!/usr/bin/env node
/**
 * ensure-pnpm.cjs
 * Cross-platform preinstall guard: verify pnpm is available.
 * Replaces the old `sh`-based preinstall script so it works on Windows too.
 */

"use strict";

const { execSync } = require("child_process");
const { version }  = require("../package.json");

// Only enforce when called by pnpm itself (avoid false-positive in CI npm installs)
const agent = process.env.npm_config_user_agent ?? "";
if (!agent.startsWith("pnpm")) {
  console.error(
    "\n\x1b[31m✗ Please use pnpm to install dependencies.\x1b[0m\n" +
    "  Install pnpm:  npm i -g pnpm\n" +
    "  Then run:      pnpm install\n"
  );
  process.exit(1);
}

// Optional: check minimum pnpm version
try {
  const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
  const [major] = pnpmVersion.split(".").map(Number);
  if (major < 8) {
    console.error(
      `\n\x1b[31m✗ pnpm v${pnpmVersion} is too old. Please upgrade to pnpm >= 8.\x1b[0m\n` +
      "  npm i -g pnpm@latest\n"
    );
    process.exit(1);
  }
} catch {
  // pnpm not found — already caught above by user_agent check
}
