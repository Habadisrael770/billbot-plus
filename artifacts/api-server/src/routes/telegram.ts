import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
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

async function downloadTelegramFile(
  fileId: string
): Promise<{ filePath: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const infoRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  const info = (await infoRes.json()) as {
    ok: boolean;
    result: { file_path: string };
  };
  if (!info.ok) throw new Error("Telegram getFile failed");

  const telegramFilePath = info.result.file_path;
  const ext = path.extname(telegramFilePath) || ".jpg";
  const fileUrl = `https://api.telegram.org/file/bot${token}/${telegramFilePath}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error("Failed to download Telegram file");

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const monthDir = getMonthUploadsDir();
  const filename = `tg-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(monthDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath };
}

async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

// POST /api/telegram/webhook
router.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const update = req.body as {
      message?: {
        chat: { id: number };
        text?: string;
        photo?: { file_id: string; file_size: number }[];
        document?: { file_id: string; mime_type: string; file_name?: string };
      };
    };

    const message = update?.message;
    if (!message) return;
    const chatId = message.chat.id;

    if (message.text === "/start") {
      await sendMessage(
        chatId,
        "👋 <b>שלום!</b>\n\nשלח לי תמונה של חשבונית ואני אשמור אותה בתיקיית ההוצאות של החודש הנוכחי.\n\nפשוט צלם את החשבונית ושלח אותה כאן 📸"
      );
      return;
    }

    let fileId: string | null = null;

    if (message.photo && message.photo.length > 0) {
      const best = message.photo.reduce((a, b) =>
        a.file_size > b.file_size ? a : b
      );
      fileId = best.file_id;
    } else if (message.document) {
      const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (allowed.includes(message.document.mime_type)) {
        fileId = message.document.file_id;
      }
    }

    if (!fileId) {
      if (message.text) {
        await sendMessage(
          chatId,
          "📸 שלח תמונה של חשבונית (JPG/PNG) או קובץ PDF."
        );
      }
      return;
    }

    await sendMessage(chatId, "⏳ מעבד את החשבונית...");

    const { filePath } = await downloadTelegramFile(fileId);
    const now = new Date();
    const monthLabel = now.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
    });

    const result = await processInvoice({
      filePath,
      extracted: { date: now.toISOString().split("T")[0] },
      sourceType: "camera",
    });

    const vendor = result.canonicalVendorName || "לא זוהה";
    const dupWarn =
      result.duplicateStatus === "duplicate"
        ? "\n\n⚠️ <b>שים לב:</b> ייתכן כפילות עם חשבונית קיימת!"
        : "";

    await sendMessage(
      chatId,
      `✅ <b>החשבונית נשמרה!</b>\n\n📁 תיקייה: <b>${monthLabel}</b>\n🏢 ספק: ${vendor}\n🆔 מזהה: <code>${result.invoiceId.slice(0, 8)}</code>${dupWarn}`
    );
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }
});

// GET /api/telegram/setup-webhook
router.get("/setup-webhook", async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      res.status(503).json({ error: "TELEGRAM_BOT_TOKEN לא מוגדר" });
      return;
    }
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      process.env.REPLIT_DEV_DOMAIN;
    const webhookUrl = `https://${host}/api/telegram/webhook`;
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );
    const tgData = await tgRes.json();
    res.json({ ok: true, webhookUrl, telegramResponse: tgData });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/telegram/status
router.get("/status", async (_req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      res.json({ configured: false });
      return;
    }
    const [meRes, webhookRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getMe`),
      fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`),
    ]);
    const me = (await meRes.json()) as {
      ok: boolean;
      result: { username: string; first_name: string };
    };
    const webhook = (await webhookRes.json()) as {
      ok: boolean;
      result: { url: string; pending_update_count: number };
    };
    res.json({
      configured: me.ok,
      botName: me.ok ? me.result.first_name : null,
      botUsername: me.ok ? `@${me.result.username}` : null,
      webhookUrl: webhook.ok ? webhook.result.url : null,
      pendingUpdates: webhook.ok ? webhook.result.pending_update_count : 0,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
