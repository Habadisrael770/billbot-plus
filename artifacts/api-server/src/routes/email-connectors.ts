import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { getGmailClient, getGmailStatus } from "../services/gmailOAuth.js";
import { processInvoice } from "../services/invoiceProcessingService.js";

const router: IRouter = Router();

function getMonthUploadsDir(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.resolve(process.cwd(), "uploads", `${year}-${month}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// GET /api/email-connectors/gmail/status
router.get("/gmail/status", async (_req, res) => {
  try {
    const status = await getGmailStatus();
    res.json(status);
  } catch (err) {
    res.json({ connected: false, email: null, error: String(err) });
  }
});

// POST /api/email-connectors/gmail/scan
// Scans Gmail for invoice attachments and processes them
router.post("/gmail/scan", async (_req, res) => {
  try {
    const { client: gmail } = await getGmailClient();

    // Search for emails with PDF/image attachments that look like invoices
    const SEARCH_QUERIES = [
      "has:attachment filename:pdf חשבונית",
      "has:attachment filename:pdf invoice",
      "has:attachment filename:pdf receipt",
      "has:attachment (filename:jpg OR filename:png) חשבונית",
    ];

    const messageIds = new Set<string>();

    for (const q of SEARCH_QUERIES) {
      const listRes = await gmail.users.messages.list({
        userId: "me",
        q,
        maxResults: 20,
      });
      for (const msg of listRes.data.messages ?? []) {
        if (msg.id) messageIds.add(msg.id);
      }
    }

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const msgId of messageIds) {
      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: msgId,
          format: "full",
        });

        const parts = msg.data.payload?.parts ?? [];
        const allParts = flattenParts(parts);

        const attachmentParts = allParts.filter((p) => {
          const fn = p.filename ?? "";
          const mime = p.mimeType ?? "";
          return (
            p.body?.attachmentId &&
            (mime === "application/pdf" ||
              mime === "image/jpeg" ||
              mime === "image/jpg" ||
              mime === "image/png" ||
              fn.endsWith(".pdf") ||
              fn.endsWith(".jpg") ||
              fn.endsWith(".jpeg") ||
              fn.endsWith(".png"))
          );
        });

        if (attachmentParts.length === 0) {
          skipped++;
          continue;
        }

        for (const part of attachmentParts) {
          const attachId = part.body!.attachmentId!;
          const attachRes = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: msgId,
            id: attachId,
          });

          const data = attachRes.data.data;
          if (!data) continue;

          // Gmail uses URL-safe base64
          const buffer = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
          const mime = part.mimeType ?? "application/pdf";
          const extMap: Record<string, string> = {
            "application/pdf": ".pdf",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
          };
          const ext = extMap[mime] || path.extname(part.filename ?? ".pdf");

          const monthDir = getMonthUploadsDir();
          const filename = `gmail-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
          const filePath = path.join(monthDir, filename);
          fs.writeFileSync(filePath, buffer);

          const now = new Date();
          await processInvoice({
            filePath,
            extracted: { date: now.toISOString().split("T")[0] },
            sourceType: "email",
          });
          processed++;
        }
      } catch (err) {
        errors.push(String(err));
      }
    }

    res.json({
      ok: true,
      found: messageIds.size,
      processed,
      skipped,
      errors: errors.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/email-connectors/test  (stub — kept for backward compat with old UI)
router.post("/test", (_req, res) => {
  res.json({ success: false, error: "השתמש בכפתור Connect with Google במקום." });
});

// POST /api/email-connectors/scan  (stub — kept for backward compat with old UI)
router.post("/scan", (_req, res) => {
  res.json({ count: 0, error: "השתמש ב-Gmail OAuth." });
});

export default router;

// ---- helpers ----
interface GmailPart {
  filename?: string | null;
  mimeType?: string | null;
  body?: { attachmentId?: string | null; data?: string | null } | null;
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
