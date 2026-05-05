/**
 * PUBLIC API — for external systems to access BillBOT+ data.
 *
 * Authentication: X-API-Key header (managed via /api/internal/api-keys)
 *
 * Public endpoints:
 *   POST /api/public/gmail-scan          — scan Gmail for last 3 months, process & return counts
 *   GET  /api/public/invoices            — get invoices from last 3 months
 *   GET  /api/public/summary             — aggregated stats for last 3 months
 *
 * Internal management (no key required — call only from trusted backend):
 *   GET    /api/internal/api-keys        — list all keys
 *   POST   /api/internal/api-keys        — generate new key
 *   DELETE /api/internal/api-keys/:id    — revoke key
 */

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { invoicesTable, vendorsTable } from "@workspace/db/schema";
import { sql, gte, and, lte } from "drizzle-orm";
import { getGmailClient } from "../services/gmailOAuth.js";
import { processInvoice } from "../services/invoiceProcessingService.js";

// ─── DB bootstrap: create table if not exists ───────────────────────────────
async function ensureApiKeysTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS public_api_keys (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      label       TEXT NOT NULL,
      key_hash    TEXT NOT NULL UNIQUE,
      key_prefix  TEXT NOT NULL,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at TIMESTAMPTZ
    )
  `);
}
ensureApiKeysTable().catch((e) => console.error("[public-api] table init error:", e));

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateApiKey() {
  const raw = `bbp_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12); // e.g. bbp_a1b2c3d4
  return { raw, hash, prefix };
}

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function getThreeMonthsRange() {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 3);
  from.setHours(0, 0, 0, 0);
  return { from, to: now };
}

// ─── Auth Middleware ─────────────────────────────────────────────────────────
async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = (req.headers["x-api-key"] as string | undefined)?.trim();
  if (!key) {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }

  const hash = hashKey(key);
  const rows = await db.execute(sql`
    SELECT id, label, is_active FROM public_api_keys WHERE key_hash = ${hash}
  `);

  if (!rows.rows.length) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const row = rows.rows[0] as { id: string; label: string; is_active: boolean };
  if (!row.is_active) {
    res.status(403).json({ error: "API key is revoked" });
    return;
  }

  // Update last used timestamp (fire & forget)
  db.execute(sql`
    UPDATE public_api_keys SET last_used_at = now() WHERE id = ${row.id}
  `).catch(() => {});

  (req as any).apiKeyLabel = row.label;
  next();
}

// ─── Public Router ───────────────────────────────────────────────────────────
export const publicRouter: IRouter = Router();

/**
 * POST /api/public/gmail-scan
 * Scans Gmail for the last 3 months, processes new invoices, returns counts.
 * Body: {} (optional: { monthsBack: 1-6 })
 */
publicRouter.post("/gmail-scan", requireApiKey, async (req, res) => {
  try {
    const monthsBack = Math.min(Math.max(Number(req.body?.monthsBack) || 3, 1), 6);
    const { client: gmail } = await getGmailClient();

    const from = new Date();
    from.setMonth(from.getMonth() - monthsBack);
    const afterStr = `${from.getFullYear()}/${String(from.getMonth() + 1).padStart(2, "0")}/${String(from.getDate()).padStart(2, "0")}`;

    const SEARCH_QUERIES = [
      `has:attachment filename:pdf חשבונית after:${afterStr}`,
      `has:attachment filename:pdf invoice after:${afterStr}`,
      `has:attachment filename:pdf receipt after:${afterStr}`,
      `has:attachment filename:pdf קבלה after:${afterStr}`,
      `has:attachment (filename:jpg OR filename:png) חשבונית after:${afterStr}`,
    ];

    const messageIds = new Set<string>();
    for (const q of SEARCH_QUERIES) {
      let pageToken: string | undefined;
      do {
        const listRes = await gmail.users.messages.list({
          userId: "me",
          q,
          maxResults: 100,
          pageToken,
        });
        for (const msg of listRes.data.messages ?? []) {
          if (msg.id) messageIds.add(msg.id);
        }
        pageToken = listRes.data.nextPageToken ?? undefined;
      } while (pageToken && messageIds.size < 300);
    }

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    const monthDir = (() => {
      const now = new Date();
      const d = path.resolve(process.cwd(), "uploads", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      return d;
    })();

    for (const msgId of messageIds) {
      try {
        const msg = await gmail.users.messages.get({ userId: "me", id: msgId, format: "full" });
        const parts = flattenParts(msg.data.payload?.parts ?? []);
        const attachments = parts.filter((p) => {
          const fn = p.filename ?? "";
          const mime = p.mimeType ?? "";
          return p.body?.attachmentId && (
            mime === "application/pdf" || mime === "image/jpeg" || mime === "image/png" ||
            fn.endsWith(".pdf") || fn.endsWith(".jpg") || fn.endsWith(".png")
          );
        });

        if (!attachments.length) { skipped++; continue; }

        const emailDate = msg.data.internalDate
          ? new Date(Number(msg.data.internalDate))
          : new Date();

        for (const part of attachments) {
          const attachRes = await gmail.users.messages.attachments.get({
            userId: "me", messageId: msgId, id: part.body!.attachmentId!,
          });
          const data = attachRes.data.data;
          if (!data) continue;

          const buffer = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
          const extMap: Record<string, string> = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };
          const ext = extMap[part.mimeType ?? ""] || ".pdf";
          const filename = `public-api-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
          const filePath = path.join(monthDir, filename);
          fs.writeFileSync(filePath, buffer);

          await processInvoice({ filePath, extracted: { date: emailDate.toISOString().split("T")[0] }, sourceType: "email" });
          processed++;
        }
      } catch (err) {
        const msg = String(err);
        if (msg.includes("VENDOR_BLOCKED:")) skipped++;
        else errors.push(msg.slice(0, 120));
      }
    }

    res.json({
      ok: true,
      scanned_months: monthsBack,
      found_emails: messageIds.size,
      processed,
      skipped,
      errors: errors.slice(0, 5),
      triggered_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/public/invoices
 * Returns invoices from the last 3 months (or ?monthsBack=N).
 * Query params: monthsBack (default 3), page (default 1), limit (default 100, max 500)
 */
publicRouter.get("/invoices", requireApiKey, async (req, res) => {
  try {
    const monthsBack = Math.min(Math.max(Number(req.query.monthsBack) || 3, 1), 12);
    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = (page - 1) * limit;

    const { from } = getThreeMonthsRange();
    from.setMonth(new Date().getMonth() - monthsBack);

    const fromStr = from.toISOString().split("T")[0];

    const rows = await db.execute(sql`
      SELECT
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.raw_vendor_name,
        i.normalized_vendor_name,
        v.canonical_name AS canonical_vendor_name,
        i.tax_id,
        i.subtotal,
        i.vat,
        i.total,
        i.currency,
        i.document_type,
        i.status,
        i.duplicate_status,
        i.suggested_category,
        i.final_category,
        i.is_foreign,
        i.supplier_country,
        i.source_type,
        i.created_at
      FROM invoices i
      LEFT JOIN vendors v ON v.id = i.vendor_id
      WHERE i.invoice_date >= ${fromStr}::date
      ORDER BY i.invoice_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countRow = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM invoices WHERE invoice_date >= ${fromStr}::date
    `);

    const total = (countRow.rows[0] as any)?.total ?? 0;

    res.json({
      ok: true,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        from_date: fromStr,
      },
      invoices: rows.rows,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/public/summary
 * Returns aggregated totals for the last 3 months.
 */
publicRouter.get("/summary", requireApiKey, async (req, res) => {
  try {
    const monthsBack = Math.min(Math.max(Number(req.query.monthsBack) || 3, 1), 12);
    const from = new Date();
    from.setMonth(from.getMonth() - monthsBack);
    const fromStr = from.toISOString().split("T")[0];

    const row = await db.execute(sql`
      SELECT
        COUNT(*)::int                                                        AS total_invoices,
        COUNT(*) FILTER (WHERE document_type = 'supplier_invoice')::int     AS supplier_invoices,
        COUNT(*) FILTER (WHERE document_type = 'receipt')::int              AS receipts,
        COALESCE(SUM(total::numeric),    0)::numeric                        AS total_amount,
        COALESCE(SUM(vat::numeric),      0)::numeric                        AS total_vat,
        COALESCE(SUM(subtotal::numeric), 0)::numeric                        AS total_subtotal,
        COUNT(*) FILTER (WHERE status = 'pending_review')::int              AS pending_review,
        COUNT(*) FILTER (WHERE duplicate_status IN ('duplicate','probable_duplicate'))::int AS duplicates,
        COUNT(*) FILTER (WHERE is_foreign = true)::int                      AS foreign_invoices
      FROM invoices
      WHERE invoice_date >= ${fromStr}::date
    `);

    res.json({
      ok: true,
      period_months: monthsBack,
      from_date: fromStr,
      summary: row.rows[0] ?? {},
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── Internal Key Management Router ──────────────────────────────────────────
export const internalApiKeysRouter: IRouter = Router();

/** GET /api/internal/api-keys — list all keys (no secret shown) */
internalApiKeysRouter.get("/", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, label, key_prefix, is_active, created_at, last_used_at
      FROM public_api_keys ORDER BY created_at DESC
    `);
    res.json({ keys: rows.rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/internal/api-keys — generate a new key */
internalApiKeysRouter.post("/", async (req, res) => {
  try {
    const { label } = req.body as { label?: string };
    if (!label?.trim()) {
      res.status(400).json({ error: "label is required" });
      return;
    }
    const { raw, hash, prefix } = generateApiKey();
    await db.execute(sql`
      INSERT INTO public_api_keys (label, key_hash, key_prefix)
      VALUES (${label.trim()}, ${hash}, ${prefix})
    `);
    // Return raw key ONCE — never stored in plain text
    res.json({
      ok: true,
      label: label.trim(),
      api_key: raw,
      prefix,
      note: "שמור את המפתח עכשיו — הוא לא יוצג שוב",
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /api/internal/api-keys/:id — revoke a key */
internalApiKeysRouter.delete("/:id", async (req, res) => {
  try {
    await db.execute(sql`
      UPDATE public_api_keys SET is_active = false WHERE id = ${req.params.id}
    `);
    res.json({ ok: true, revoked: req.params.id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
interface GmailPart {
  filename?: string | null;
  mimeType?: string | null;
  body?: { attachmentId?: string | null } | null;
  parts?: GmailPart[] | null;
}
function flattenParts(parts: GmailPart[]): GmailPart[] {
  const result: GmailPart[] = [];
  for (const p of parts) {
    result.push(p);
    if (p.parts) result.push(...flattenParts(p.parts));
  }
  return result;
}
