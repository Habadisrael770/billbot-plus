---
name: Hermes Starter Kit integration
description: How the third-party "Hermes" AI chat + credit system was adapted into BillBOT+ (api-server + invoice-dashboard).
---

# Hermes kit adaptation

The kit ships standalone (its own `pg` pool, standalone Express app, absolute paths). It was adapted, not copied verbatim.

**Decisions made (keep consistent):**
- Credits reuse the shared `pool` from `@workspace/db` — do NOT add a separate `pg` dependency. Credit tables live in the main app DB.
- Chat API is an Express Router (`createHermesRouter(resolveUser)`) mounted at `/api/hermes`. `/health` is public; all other routes self-guard via `resolveUser`.
- `resolveUser` uses the existing `bb_sid` cookie session (readSessionUserId + DB user lookup). Admin = caller email matches optional `HERMES_ADMIN_EMAIL` secret.
- Frontend calls must use `credentials:"include"` (cookie auth) and prefix paths with Vite `BASE_URL`.
- Bridge needs secrets `HERMES_BRIDGE_URL` + `HERMES_BRIDGE_TOKEN`. Health reports `mode:"safe"` when bridge reachable.

**Credit-ledger correctness rules (a code review caught bugs here):**
- `getOrCreateCredits` must use `INSERT ... ON CONFLICT DO NOTHING RETURNING balance`; log the "initial grant" txn ONLY when a row is returned (i.e. actually inserted). Otherwise concurrent first-touch requests create duplicate initial-grant rows.
- Admins are treated as UNLIMITED, not high-balance: `getOrCreateCredits`/`deductCredit` short-circuit for `isAdmin` and never write/decrement. `deductCredit` takes an `isAdmin` arg that the `/message` route must pass.
**Why:** the kit's original code seeded admins with 999_999 and still deducted, and always logged an initial grant — both are accounting-integrity bugs.

**Tables:** `hermes_credits`, `hermes_credit_txns` created via raw SQL (`db-migration.sql`), not drizzle schema — drizzle-kit push will not know about them.
