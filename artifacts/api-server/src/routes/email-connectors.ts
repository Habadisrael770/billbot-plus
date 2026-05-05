import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { getAllGmailClients, getGmailStatus } from "../services/gmailOAuth.js";
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

router.get("/gmail/status", async (_req, res) => {
  try {
    const status = await getGmailStatus();
    res.json(status);
  } catch (err) {
    res.json({ connected: false, email: null, error: String(err) });
  }
});

router.post("/gmail/scan", async (req, res) => {
  try {
    const allClients = await getAllGmailClients();

    let afterDate: Date;
    let yearsBack = Math.min(Math.max(Number(req.body?.yearsBack) || 4, 1), 4);
    if (req.body?.sinceDate) {
      afterDate = new Date(req.body.sinceDate);
    } else {
      afterDate = new Date();
      afterDate.setFullYear(afterDate.getFullYear() - yearsBack);
    }
    const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, "0")}/${String(afterDate.getDate()).padStart(2, "0")}`;

    const SEARCH_QUERIES = [
      `has:attachment filename:pdf חשבונית after:${afterStr}`,
      `has:attachment filename:pdf invoice after:${afterStr}`,
      `has:attachment filename:pdf receipt after:${afterStr}`,
      `has:attachment filename:pdf קבלה after:${afterStr}`,
      `has:attachment filename:pdf tax after:${afterStr}`,
      `has:attachment (filename:jpg OR filename:png) חשבונית after:${afterStr}`,
    ];

    let totalFound = 0;
    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Scan ALL connected accounts
    for (const { client: gmail, email: accountEmail } of allClients) {
      const messageIds = new Set<string>();
      const MAX_PER_QUERY = 100;

      for (const q of SEARCH_QUERIES) {
        let pageToken: string | undefined;
        do {
          const listRes = await gmail.users.messages.list({
            userId: "me",
            q,
            maxResults: MAX_PER_QUERY,
            pageToken,
          });
          for (const msg of listRes.data.messages ?? []) {
            if (msg.id) messageIds.add(msg.id);
          }
          pageToken = listRes.data.nextPageToken ?? undefined;
        } while (pageToken && messageIds.size < 500);
      }

      totalFound += messageIds.size;

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

          if (attachmentParts.length === 0) { skipped++; continue; }

          const emailDate = msg.data.internalDate
            ? new Date(Number(msg.data.internalDate))
            : new Date();

          for (const part of attachmentParts) {
            const attachId = part.body!.attachmentId!;
            const attachRes = await gmail.users.messages.attachments.get({
              userId: "me",
              messageId: msgId,
              id: attachId,
            });
            const data = attachRes.data.data;
            if (!data) continue;

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

            await processInvoice({
              filePath,
              extracted: { date: emailDate.toISOString().split("T")[0] },
              sourceType: "email",
            });
            processed++;
          }
        } catch (err) {
          const msg = String(err);
          if (msg.includes("VENDOR_BLOCKED:")) skipped++;
          else errors.push(`[${accountEmail}] ${msg}`);
        }
      }
    } // end accounts loop

    res.json({
      ok: true,
      found: totalFound,
      processed,
      skipped,
      errors: errors.slice(0, 5),
      yearsScanned: yearsBack,
      accounts_scanned: allClients.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post("/test", (_req, res) => {
  res.json({ success: false, error: "השתמש בכפתור Connect with Google במקום." });
});

router.post("/scan", (_req, res) => {
  res.json({ count: 0, error: "השתמש ב-Gmail OAuth." });
});

router.post("/support", (req, res) => {
  const { subject, body, from_name, from_email } = req.body ?? {};
  if (!from_name || !from_email || !body) {
    return res.status(400).json({ error: "נא למלא את כל השדות" });
  }
  console.log("[SUPPORT MESSAGE]", { subject, from_name, from_email, body });
  return res.json({ ok: true, message: "ההודעה התקבלה. ניצור קשר בקרוב." });
});

export default router;

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
