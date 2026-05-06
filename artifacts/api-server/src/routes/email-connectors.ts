import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { getAllGmailClients, getGmailStatus } from "../services/gmailOAuth.js";
import { processInvoice } from "../services/invoiceProcessingService.js";
import { scanImapForInvoices, listImapAccounts } from "../services/imapService.js";

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
    const gmailStatus = await getGmailStatus();
    const imapAccounts = await listImapAccounts();
    const imapConnected = imapAccounts.length > 0;
    res.json({
      ...gmailStatus,
      connected: gmailStatus.connected || imapConnected,
      imapAccounts,
      imapConnected,
    });
  } catch (err) {
    res.json({ connected: false, email: null, error: String(err) });
  }
});

// ── Helper: run the actual scan logic, calling onProgress as work proceeds ──
async function runGmailScan(
  body: { yearsBack?: number; sinceDate?: string },
  onProgress: (pct: number, msg: string, extra?: object) => void,
): Promise<{ found: number; processed: number; skipped: number; errors: string[]; yearsScanned: number; accounts_scanned: number }> {
  const allClients = await getAllGmailClients();
  const imapAccounts = await listImapAccounts();
  const hasGmail = allClients.length > 0;
  const hasImap  = imapAccounts.length > 0;

  if (!hasGmail && !hasImap) {
    throw new Error("אין חשבון מחובר. חבר Gmail או הכנס סיסמת אפליקציה.");
  }

  onProgress(5, "מתחבר לתיבת הדואר...");

  let afterDate: Date;
  const yearsBack = Math.min(Math.max(Number(body?.yearsBack) || 4, 1), 4);
  if (body?.sinceDate) {
    afterDate = new Date(body.sinceDate);
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

  for (const { client: gmail, email: accountEmail } of allClients) {
    const messageIds = new Set<string>();
    const MAX_PER_QUERY = 100;

    onProgress(12, `מחפש מיילים ב-${accountEmail}...`);

    for (const q of SEARCH_QUERIES) {
      let pageToken: string | undefined;
      do {
        const listRes = await gmail.users.messages.list({
          userId: "me", q, maxResults: MAX_PER_QUERY, pageToken,
        });
        for (const msg of listRes.data.messages ?? []) {
          if (msg.id) messageIds.add(msg.id);
        }
        pageToken = listRes.data.nextPageToken ?? undefined;
      } while (pageToken && messageIds.size < 500);
    }

    const total = messageIds.size;
    totalFound += total;
    onProgress(30, `נמצאו ${total} מיילים — מוריד קבצים...`);

    let idx = 0;
    for (const msgId of messageIds) {
      idx++;
      // Real progress: 30% → 95% across all messages
      const pct = 30 + Math.round((idx / Math.max(total, 1)) * 65);
      if (idx % 3 === 0 || idx === 1) {
        onProgress(pct, `מעבד מייל ${idx} מתוך ${total}...`, { processed, skipped });
      }

      try {
        const msg = await gmail.users.messages.get({ userId: "me", id: msgId, format: "full" });
        const parts = msg.data.payload?.parts ?? [];
        const allParts = flattenParts(parts);

        const attachmentParts = allParts.filter((p) => {
          const fn = p.filename ?? "";
          const mime = p.mimeType ?? "";
          return (
            p.body?.attachmentId &&
            (mime === "application/pdf" || mime === "image/jpeg" ||
             mime === "image/jpg"  || mime === "image/png" ||
             fn.endsWith(".pdf")   || fn.endsWith(".jpg") ||
             fn.endsWith(".jpeg")  || fn.endsWith(".png"))
          );
        });

        if (attachmentParts.length === 0) { skipped++; continue; }

        const emailDate = msg.data.internalDate
          ? new Date(Number(msg.data.internalDate))
          : new Date();

        for (const part of attachmentParts) {
          const attachId = part.body!.attachmentId!;
          const attachRes = await gmail.users.messages.attachments.get({
            userId: "me", messageId: msgId, id: attachId,
          });
          const data = attachRes.data.data;
          if (!data) continue;

          const buffer = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
          const mime = part.mimeType ?? "application/pdf";
          const extMap: Record<string, string> = {
            "application/pdf": ".pdf", "image/jpeg": ".jpg",
            "image/jpg": ".jpg",       "image/png":  ".png",
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
        const errMsg = String(err);
        if (errMsg.includes("VENDOR_BLOCKED:")) skipped++;
        else errors.push(`[${accountEmail}] ${errMsg}`);
      }
    }
  }

  // ── IMAP scan (App Password accounts) ─────────────────────────────────────
  if (hasImap) {
    onProgress(85, "סורק תיבות IMAP...");
    try {
      const imapAttachments = await scanImapForInvoices(afterDate, (pct, msg) => {
        onProgress(85 + Math.round(pct * 0.1), msg);
      });
      totalFound += imapAttachments.length;
      for (const att of imapAttachments) {
        try {
          const extMap: Record<string, string> = { pdf: ".pdf", jpeg: ".jpg", jpg: ".jpg", png: ".png" };
          const rawExt = att.filename.split(".").pop()?.toLowerCase() ?? "pdf";
          const ext = extMap[rawExt] ?? ".pdf";
          const monthDir = getMonthUploadsDir();
          const fname = `imap-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
          const filePath = path.join(monthDir, fname);
          fs.writeFileSync(filePath, att.buffer);
          await processInvoice({
            filePath,
            extracted: { date: att.date.toISOString().split("T")[0] },
            sourceType: "email",
          });
          processed++;
        } catch (err) {
          const errMsg = String(err);
          if (errMsg.includes("VENDOR_BLOCKED:")) skipped++;
          else errors.push(`[IMAP:${att.email}] ${errMsg}`);
        }
      }
    } catch (err) {
      errors.push(`[IMAP] ${String(err)}`);
    }
  }

  return { found: totalFound, processed, skipped, errors: errors.slice(0, 5), yearsScanned: yearsBack, accounts_scanned: allClients.length + imapAccounts.length };
}

// ── SSE streaming scan (real-time progress — no proxy timeout) ─────────────
router.post("/gmail/scan-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx/proxy buffering
  res.flushHeaders();

  const send = (data: object) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      // @ts-ignore — flush if compression middleware is active
      if (typeof (res as any).flush === "function") (res as any).flush();
    }
  };

  // Keep-alive ping every 15s so the proxy doesn't close idle connections
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(": ping\n\n");
  }, 15_000);

  try {
    const result = await runGmailScan(req.body, (pct, msg, extra) => {
      send({ type: "progress", pct, msg, ...extra });
    });
    send({ type: "done", ...result });
  } catch (err) {
    send({ type: "error", error: String(err) });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
});

// ── Legacy JSON scan (kept for backward compat) ────────────────────────────
router.post("/gmail/scan", async (req, res) => {
  try {
    const result = await runGmailScan(req.body, () => {});
    res.json({ ok: true, ...result });
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
