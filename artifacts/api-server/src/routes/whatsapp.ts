import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { processInvoice } from "../services/invoiceProcessingService.js";

const router: IRouter = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function getMonthUploadsDir(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.resolve(process.cwd(), "uploads", `${year}-${month}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getMetaCreds() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  return { phoneNumberId, accessToken, verifyToken };
}

/** Download media file via Meta Graph API */
async function downloadMetaMedia(
  mediaId: string,
  accessToken: string
): Promise<{ filePath: string; mimeType: string }> {
  // Step 1: Get media URL
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) throw new Error(`Meta media lookup failed: ${metaRes.status}`);
  const { url, mime_type } = (await metaRes.json()) as { url: string; mime_type: string };

  // Step 2: Download actual file
  const fileRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileRes.ok) throw new Error("Failed to download WhatsApp media");

  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
  };
  const ext = extMap[mime_type] || ".jpg";

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const monthDir = getMonthUploadsDir();
  const filename = `wa-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(monthDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath, mimeType: mime_type };
}

/** Send a text reply via Meta Cloud API */
async function sendReply(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

// ── Webhook verification (GET) — Meta challenge handshake ─────────────────────
router.get("/webhook", (req, res) => {
  const { verifyToken } = getMetaCreds();
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === (verifyToken || "billbot_verify")) {
    console.log("WhatsApp webhook verified ✓");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

// ── Incoming message webhook (POST) ──────────────────────────────────────────
router.post("/webhook", async (req, res) => {
  // Acknowledge immediately — Meta requires fast 200 response
  res.sendStatus(200);

  const { phoneNumberId, accessToken } = getMetaCreds();
  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp: missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    return;
  }

  try {
    const body = req.body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from: string;
              type: string;
              text?: { body: string };
              image?: { id: string; mime_type: string };
              document?: { id: string; mime_type: string };
            }>;
          };
        }>;
      }>;
    };

    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    const msg = messages[0];
    const from = msg.from;

    // Text-only message
    if (msg.type === "text") {
      const text = msg.text?.body?.toLowerCase() ?? "";
      if (text.includes("שלום") || text.includes("hello") || text.includes("hi")) {
        await sendReply(
          phoneNumberId,
          accessToken,
          from,
          "👋 שלום! שלח לי תמונה של חשבונית ואני אשמור אותה אוטומטית ב-BillBOT+ 📸"
        );
      } else {
        await sendReply(
          phoneNumberId,
          accessToken,
          from,
          "📸 שלח תמונה של חשבונית (JPG/PNG) או קובץ PDF ואני אטפל בה."
        );
      }
      return;
    }

    // Media message (image or document)
    const mediaObj = msg.type === "image" ? msg.image : msg.document;
    if (!mediaObj) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(mediaObj.mime_type)) {
      await sendReply(phoneNumberId, accessToken, from, "⚠️ סוג קובץ לא נתמך. שלח JPG, PNG, או PDF.");
      return;
    }

    const { filePath } = await downloadMetaMedia(mediaObj.id, accessToken);

    const result = await processInvoice({
      filePath,
      extracted: { date: new Date().toISOString().split("T")[0] },
      sourceType: "camera",
    });

    const vendor = result.canonicalVendorName || "לא זוהה";
    const dupWarn =
      result.duplicateStatus === "duplicate"
        ? "\n⚠️ שים לב: ייתכן כפילות עם חשבונית קיימת!"
        : "";

    await sendReply(
      phoneNumberId,
      accessToken,
      from,
      `✅ החשבונית נשמרה!\n\n🏢 ספק: ${vendor}\n🆔 מזהה: ${result.invoiceId.slice(0, 8)}${dupWarn}`
    );
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }
});

// ── Status ────────────────────────────────────────────────────────────────────
router.get("/status", (_req, res) => {
  const { phoneNumberId, accessToken, verifyToken } = getMetaCreds();
  res.json({
    configured: !!(phoneNumberId && accessToken),
    phoneNumberId: phoneNumberId || null,
    verifyToken: verifyToken || null,
    provider: "meta",
  });
});

export default router;
