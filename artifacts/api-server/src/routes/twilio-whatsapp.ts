import { Router, type IRouter } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { processInvoice } from "../services/invoiceProcessingService.js";
import { db } from "@workspace/db";
import { usersTable, categoriesTable, invoicesTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";

const router: IRouter = Router();

function getMonthUploadsDir(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.resolve(process.cwd(), "uploads", `${year}-${month}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getTwilioCreds() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
  };
}

async function findUserByPhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.whatsappPhone, normalized))
      .limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

async function findCategoryByKeyword(keyword: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ name: categoriesTable.name })
      .from(categoriesTable)
      .where(ilike(categoriesTable.name, `%${keyword}%`))
      .limit(1);
    return rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

async function getCategoryList(): Promise<string[]> {
  try {
    const rows = await db
      .select({ name: categoriesTable.name })
      .from(categoriesTable)
      .orderBy(categoriesTable.sort_order)
      .limit(15);
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

async function sendTwilioReply(to: string, message: string): Promise<void> {
  const { accountSid, authToken, from } = getTwilioCreds();
  if (!accountSid || !authToken) return;

  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: toFormatted,
        Body: message,
      }).toString(),
    }
  );
}

async function downloadTwilioMedia(
  mediaUrl: string
): Promise<{ filePath: string; mimeType: string }> {
  const { accountSid, authToken } = getTwilioCreds();
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Failed to download Twilio media: ${res.status}`);

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
  };
  const ext = extMap[contentType.split(";")[0].trim()] || ".jpg";
  const buffer = Buffer.from(await res.arrayBuffer());
  const monthDir = getMonthUploadsDir();
  const filename = `twilio-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(monthDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath, mimeType: contentType };
}

// ── Webhook (POST) — Twilio sends form-encoded body ──────────────────────────
router.post(
  "/webhook",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    // Twilio requires an empty TwiML response
    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");

    const { accountSid, authToken } = getTwilioCreds();
    if (!accountSid || !authToken) {
      console.warn("Twilio WhatsApp: missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
      return;
    }

    try {
      const body = req.body as {
        From?: string;
        Body?: string;
        NumMedia?: string;
        MediaUrl0?: string;
        MediaContentType0?: string;
      };

      const from = body.From || "";
      const text = (body.Body || "").trim();
      const numMedia = parseInt(body.NumMedia || "0", 10);
      const mediaUrl = body.MediaUrl0;
      const mediaContentType = body.MediaContentType0 || "image/jpeg";

      // Normalize phone: remove "whatsapp:" prefix and non-digits
      const phone = from.replace("whatsapp:", "").replace(/\D/g, "");

      const user = await findUserByPhone(phone);

      // ── Text-only message ────────────────────────────────────────────────────
      if (numMedia === 0) {
        const lower = text.toLowerCase();

        if (!user) {
          await sendTwilioReply(
            from,
            `👋 שלום!\n\nכדי לשלוח חשבוניות דרך WhatsApp, עליך לרשום את המספר הזה ב-BillBOT+:\n\n📱 היכנס לאפליקציה → הגדרות → WhatsApp → הכנס מספר זה\n\nלאחר הרישום תוכל לשלוח תמונות וקבצי PDF ישירות לכאן! 🧾`
          );
          return;
        }

        if (lower.includes("עזרה") || lower.includes("help") || lower === "?") {
          const cats = await getCategoryList();
          const catList = cats.slice(0, 10).map((c, i) => `  ${i + 1}. ${c}`).join("\n");
          await sendTwilioReply(
            from,
            `🤖 BillBOT+ — רשימת פקודות:\n\n📸 *שלח תמונה/PDF* — ניתוח חשבונית אוטומטי\n📋 *קטגוריה + תמונה* — שייך לקטגוריה ספציפית\n\n🗂 קטגוריות:\n${catList}\n\nשלח "?" לתפריט זה`
          );
          return;
        }

        if (lower.includes("קטגוריות") || lower.includes("categories")) {
          const cats = await getCategoryList();
          await sendTwilioReply(
            from,
            `🗂 קטגוריות:\n\n${cats.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nשלח תמונה עם שם הקטגוריה כדי לשייך אותה`
          );
          return;
        }

        if (lower.includes("שלום") || lower.includes("hello") || lower.includes("hi")) {
          await sendTwilioReply(
            from,
            `👋 שלום ${user.name ?? ""}!\n\nשלח תמונה של חשבונית ואני אשמור אותה אוטומטית ✅\n\nשלח "?" לרשימת פקודות`
          );
          return;
        }

        await sendTwilioReply(
          from,
          `📸 שלח תמונה של חשבונית (JPG/PNG) או קובץ PDF.\nניתן לכתוב שם קטגוריה כדי לשייך אוטומטית.`
        );
        return;
      }

      // ── Media message ─────────────────────────────────────────────────────
      if (!user) {
        await sendTwilioReply(
          from,
          `❌ המספר שלך לא רשום במערכת.\n\n📱 היכנס ל-BillBOT+ → הגדרות → WhatsApp → הכנס מספר זה`
        );
        return;
      }

      if (!mediaUrl) return;

      const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      const mimeBase = mediaContentType.split(";")[0].trim();
      if (!allowed.includes(mimeBase)) {
        await sendTwilioReply(from, "⚠️ סוג קובץ לא נתמך. שלח JPG, PNG, או PDF.");
        return;
      }

      const { filePath } = await downloadTwilioMedia(mediaUrl);

      let categoryHint: string | null = null;
      if (text) {
        const matched = await findCategoryByKeyword(text);
        categoryHint = matched || text;
      }

      const result = await processInvoice({
        filePath,
        extracted: { date: new Date().toISOString().split("T")[0] },
        sourceType: "camera",
      });

      if (categoryHint) {
        await db
          .update(invoicesTable)
          .set({
            final_category: categoryHint,
            suggested_category: categoryHint,
            updated_at: new Date(),
          })
          .where(eq(invoicesTable.id, result.invoiceId));
      }

      const vendor = result.canonicalVendorName || "לא זוהה";
      const category = categoryHint || result.suggestedCategory || "לא סווג";
      const dupWarn =
        result.duplicateStatus === "duplicate"
          ? "\n\n⚠️ *שים לב:* ייתכן כפילות עם חשבונית קיימת!"
          : "";

      await sendTwilioReply(
        from,
        `✅ *החשבונית נשמרה!*\n\n🏢 ספק: ${vendor}\n🗂 קטגוריה: ${category}\n🆔 מזהה: ${result.invoiceId.slice(0, 8)}${dupWarn}\n\n💡 שלח "?" לעזרה`
      );
    } catch (err) {
      console.error("Twilio WhatsApp webhook error:", err);
    }
  }
);

// ── Status ────────────────────────────────────────────────────────────────────
router.get("/status", (_req, res) => {
  const { accountSid, authToken, from } = getTwilioCreds();
  res.json({
    configured: !!(accountSid && authToken),
    provider: "twilio",
    sandboxNumber: from,
    accountSid: accountSid ? accountSid.slice(0, 8) + "..." : null,
  });
});

export default router;
