/**
 * Inbound Email Webhook — Email Forwarding Processing
 *
 * Compatible with:
 *  • SendGrid Inbound Parse (multipart/form-data)
 *  • Mailgun Inbound (multipart/form-data)
 *  • Postmark Inbound (JSON body)
 *
 * User setup:
 *  Gmail → Settings → Forwarding → Forward to invoices+{token}@{INBOUND_EMAIL_DOMAIN}
 *
 * Webhook URL: POST /api/inbound-email
 */

import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { usersTable, invoicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { processInvoice } from "../services/invoiceProcessingService.js";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

const INBOUND_DOMAIN  = process.env.INBOUND_EMAIL_DOMAIN ?? "inbound.billbot.co.il";
const ALLOWED_MIME    = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/gif", "image/tiff"];
const MAX_FILE_SIZE   = 20 * 1024 * 1024; // 20 MB

// Shared secret that must be present in the webhook URL as ?secret=<value>.
// Configure the same value in your email provider's webhook URL so only the
// provider can successfully post inbound emails. Without a secret configured,
// the endpoint refuses all incoming webhooks in production.
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET ?? "";

// Multer — store in memory, we'll move to disk after token lookup
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });

function getMonthUploadsDir(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir   = path.resolve(process.cwd(), "uploads", `${year}-${month}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Extract the +token from an email address like invoices+abc123@domain.com */
function extractToken(toField: string): string | null {
  // Could be: "BillBOT <invoices+abc123@domain>" or "invoices+abc123@domain"
  const match = toField.match(/invoices\+([a-z0-9]+)@/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/** Find user by their forwarding token */
async function findUserByToken(token: string) {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.forwardingToken, token))
    .limit(1);
  return user ?? null;
}

/** Save a buffer to the uploads directory with appropriate extension */
function saveBuffer(buffer: Buffer, mimeType: string): string {
  const extMap: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg":      ".jpg",
    "image/jpg":       ".jpg",
    "image/png":       ".png",
    "image/gif":       ".gif",
    "image/tiff":      ".tiff",
  };
  const ext      = extMap[mimeType] ?? ".bin";
  const filename = `email-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const dir      = getMonthUploadsDir();
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ── POST /api/inbound-email ───────────────────────────────────────────────────
// SendGrid & Mailgun send multipart/form-data
router.post(
  "/",
  upload.any(),
  async (req, res) => {
    // ── Verify webhook secret ───────────────────────────────────────────────
    // The secret must be embedded in the webhook URL (?secret=...) when
    // configuring the provider. Requests without a matching secret are rejected
    // to prevent forged invoice submission from arbitrary HTTP clients.
    const isProduction = process.env.NODE_ENV === "production";
    if (!WEBHOOK_SECRET && isProduction) {
      console.error("[inbound-email] INBOUND_EMAIL_WEBHOOK_SECRET is not set — refusing webhook in production.");
      res.sendStatus(403);
      return;
    }
    if (WEBHOOK_SECRET) {
      const providedSecret = (req.query.secret as string | undefined) ?? "";
      const expected = Buffer.from(WEBHOOK_SECRET);
      const provided  = Buffer.from(providedSecret);
      const secretsMatch =
        expected.length === provided.length &&
        crypto.timingSafeEqual(expected, provided);
      if (!secretsMatch) {
        console.warn("[inbound-email] Rejected webhook: invalid or missing secret.");
        res.sendStatus(403);
        return;
      }
    }

    // Always respond 200 immediately so the mail provider doesn't retry
    res.sendStatus(200);

    try {
      // ── 1. Extract "to" field ───────────────────────────────────────────────
      const toField   = (req.body as Record<string, string>)["to"] ?? (req.body as Record<string, string>)["To"] ?? "";
      const fromField = (req.body as Record<string, string>)["from"] ?? (req.body as Record<string, string>)["From"] ?? "";
      const subject   = (req.body as Record<string, string>)["subject"] ?? (req.body as Record<string, string>)["Subject"] ?? "";

      console.log(`[inbound-email] from="${fromField}" to="${toField}" subject="${subject}"`);

      // ── 2. Extract token and find user ─────────────────────────────────────
      const token = extractToken(toField);
      if (!token) {
        console.warn(`[inbound-email] No forwarding token found in to="${toField}"`);
        return;
      }

      const user = await findUserByToken(token);
      if (!user) {
        console.warn(`[inbound-email] No user found for token="${token}"`);
        return;
      }

      console.log(`[inbound-email] Matched user: ${user.email}`);

      // ── 3. Extract attachments ─────────────────────────────────────────────
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const invoiceFiles: Array<{ buffer: Buffer; mimeType: string; originalName: string }> = [];

      for (const file of files) {
        const mime = file.mimetype.toLowerCase();
        if (ALLOWED_MIME.includes(mime)) {
          invoiceFiles.push({ buffer: file.buffer, mimeType: mime, originalName: file.originalname });
        }
      }

      // SendGrid also sends attachments as numbered fields (attachment1, attachment2…)
      // and attachment-info JSON describing them
      const attachmentInfoRaw = (req.body as Record<string, string>)["attachment-info"] ?? "{}";
      let attachmentInfo: Record<string, { type?: string; name?: string }> = {};
      try { attachmentInfo = JSON.parse(attachmentInfoRaw); } catch { /* empty */ }

      for (const [key, info] of Object.entries(attachmentInfo)) {
        const mime = (info.type ?? "").toLowerCase();
        if (!ALLOWED_MIME.includes(mime)) continue;
        // SendGrid field name is "attachment1", "attachment2"…
        const fieldBuffer = (req.body as Record<string, string | Buffer>)[key];
        if (Buffer.isBuffer(fieldBuffer)) {
          invoiceFiles.push({ buffer: fieldBuffer, mimeType: mime, originalName: info.name ?? key });
        }
      }

      if (invoiceFiles.length === 0) {
        console.log(`[inbound-email] No valid invoice attachments in email from ${fromField}`);
        return;
      }

      // ── 4. Process each attachment ─────────────────────────────────────────
      let processedCount = 0;
      for (const { buffer, mimeType, originalName } of invoiceFiles) {
        try {
          const filePath = saveBuffer(buffer, mimeType);
          const result   = await processInvoice({
            filePath,
            extracted: { date: new Date().toISOString().split("T")[0] },
            sourceType: "email",
          });
          console.log(
            `[inbound-email] Processed "${originalName}" → invoice ${result.invoiceId} ` +
            `vendor="${result.canonicalVendorName}" category="${result.suggestedCategory}"`
          );
          processedCount++;
        } catch (fileErr) {
          console.error(`[inbound-email] Failed to process "${originalName}":`, fileErr);
        }
      }

      console.log(`[inbound-email] Done — ${processedCount}/${invoiceFiles.length} files processed for ${user.email}`);
    } catch (err) {
      console.error("[inbound-email] Fatal error:", err);
    }
  }
);

// ── GET /api/inbound-email/address — get/generate forwarding address ──────────
// Requires an authenticated session. Returns the forwarding address for the
// currently logged-in user only — callers cannot look up another user's token.
router.get("/address", requireAuth, async (req, res) => {
  const userId = req.userId!;

  try {
    const [user] = await db
      .select({ forwardingToken: usersTable.forwardingToken })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return res.status(404).json({ error: "משתמש לא נמצא" });

    let token = user.forwardingToken;

    // Auto-generate token if missing
    if (!token) {
      token = crypto.randomBytes(5).toString("hex"); // 10-char hex
      await db
        .update(usersTable)
        .set({ forwardingToken: token, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));
    }

    return res.json({
      token,
      address: `invoices+${token}@${INBOUND_DOMAIN}`,
      domain: INBOUND_DOMAIN,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /api/inbound-email/regenerate — regenerate forwarding token ──────────
// Requires an authenticated session. Rotates only the currently logged-in
// user's token — callers cannot invalidate another user's forwarding address.
router.post("/regenerate", requireAuth, async (req, res) => {
  const userId = req.userId!;

  try {
    const token = crypto.randomBytes(5).toString("hex");
    await db
      .update(usersTable)
      .set({ forwardingToken: token, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    const domain = INBOUND_DOMAIN;
    return res.json({ token, address: `invoices+${token}@${domain}`, domain });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
