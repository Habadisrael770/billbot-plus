// Admin routes — guarded by a shared secret token (NOT a user session).
// Used for one-off operational tasks like wiping all invoice data in a given
// environment (e.g. clearing junk/duplicate invoices from production).
//
// Auth: send the token in the `x-admin-token` header. The expected value lives
// in the ADMIN_RESET_TOKEN environment variable. If that variable is not set,
// every admin route returns 503 (feature disabled) so the endpoint can never be
// abused when no token is configured.

import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

function tokenValid(provided: string | undefined): boolean {
  const expected = process.env.ADMIN_RESET_TOKEN?.trim();
  if (!expected) return false; // feature disabled when no token configured
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function ensureEnabled(res: import("express").Response): boolean {
  if (!process.env.ADMIN_RESET_TOKEN?.trim()) {
    res.status(503).json({ error: "admin endpoints disabled (no ADMIN_RESET_TOKEN)" });
    return false;
  }
  return true;
}

// ── POST /api/admin/reset-invoices ───────────────────────────────────────────
// Permanently deletes ALL invoice data. Line items and extraction jobs are
// removed automatically via ON DELETE CASCADE on their invoice_id foreign keys.
router.post("/reset-invoices", async (req, res) => {
  if (!ensureEnabled(res)) return;

  const provided = (req.headers["x-admin-token"] as string | undefined)?.trim();
  if (!tokenValid(provided)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  try {
    const [before] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(invoicesTable);

    // Cascades to invoice_line_items and invoice_extraction_jobs.
    await db.delete(invoicesTable);

    const [after] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(invoicesTable);

    console.log(
      `[admin/reset-invoices] deleted ${before?.n ?? 0} invoices, ${after?.n ?? 0} remaining`,
    );
    res.json({ ok: true, deleted: before?.n ?? 0, remaining: after?.n ?? 0 });
  } catch (err) {
    console.error("[admin/reset-invoices]", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
