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

async function downloadWhatsAppMedia(
  mediaUrl: string,
  mimeType: string
): Promise<{ filePath: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Twilio credentials missing");

  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
  };
  const ext = extMap[mimeType] || ".jpg";

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const fileRes = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!fileRes.ok) throw new Error("Failed to download WhatsApp media");

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const monthDir = getMonthUploadsDir();
  const filename = `wa-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(monthDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath };
}

function twimlReply(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

// POST /api/whatsapp/webhook
router.post("/webhook", async (req, res) => {
  res.set("Content-Type", "text/xml");

  try {
    const body = req.body as Record<string, string>;
    const numMedia = parseInt(body.NumMedia ?? "0", 10);
    const messageBody = (body.Body ?? "").trim();

    if (numMedia === 0) {
      if (messageBody.toLowerCase().includes("שלום") || messageBody === "") {
        res.send(
          twimlReply(
            "👋 שלום! שלח לי תמונה של חשבונית ואני אשמור אותה בתיקיית ההוצאות של החודש הנוכחי 📸"
          )
        );
      } else {
        res.send(
          twimlReply("📸 שלח תמונה של חשבונית (JPG/PNG) או קובץ PDF.")
        );
      }
      return;
    }

    const mediaUrl = body["MediaUrl0"];
    const mediaType = body["MediaContentType0"] ?? "image/jpeg";

    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(mediaType)) {
      res.send(twimlReply("⚠️ סוג קובץ לא נתמך. שלח JPG, PNG, או PDF."));
      return;
    }

    const { filePath } = await downloadWhatsAppMedia(mediaUrl, mediaType);

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
        ? "\n⚠️ שים לב: ייתכן כפילות עם חשבונית קיימת!"
        : "";

    res.send(
      twimlReply(
        `✅ החשבונית נשמרה!\n\n📁 תיקייה: ${monthLabel}\n🏢 ספק: ${vendor}\n🆔 מזהה: ${result.invoiceId.slice(0, 8)}${dupWarn}`
      )
    );
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    res.send(twimlReply("❌ שגיאה בעיבוד החשבונית. נסה שוב."));
  }
});

// GET /api/whatsapp/status
router.get("/status", (_req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  res.json({
    configured: !!(accountSid && authToken && phoneNumber),
    phoneNumber: phoneNumber || null,
  });
});

export default router;
