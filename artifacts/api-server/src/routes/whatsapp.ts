import { Router, type IRouter } from "express";
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

function getMetaCreds() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  return { phoneNumberId, accessToken, verifyToken };
}

function normalizeIncoming(from: string): string {
  return from.replace(/\D/g, "");
}

/** Find user by their registered WhatsApp phone */
async function findUserByPhone(from: string) {
  const normalized = normalizeIncoming(from);
  try {
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.whatsappPhone, normalized))
      .limit(1);
    return user ?? null;
  } catch { return null; }
}

/** Find category by keyword in name */
async function findCategoryByKeyword(keyword: string): Promise<string | null> {
  try {
    const rows = await db.select({ name: categoriesTable.name })
      .from(categoriesTable)
      .where(ilike(categoriesTable.name, `%${keyword}%`))
      .limit(1);
    return rows[0]?.name ?? null;
  } catch { return null; }
}

/** Fetch all category names for the "menu" message */
async function getCategoryList(): Promise<string[]> {
  try {
    const rows = await db.select({ name: categoriesTable.name })
      .from(categoriesTable)
      .orderBy(categoriesTable.sort_order)
      .limit(15);
    return rows.map(r => r.name);
  } catch { return []; }
}

/** Download media file via Meta Graph API */
async function downloadMetaMedia(
  mediaId: string,
  accessToken: string
): Promise<{ filePath: string; mimeType: string }> {
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) throw new Error(`Meta media lookup failed: ${metaRes.status}`);
  const { url, mime_type } = (await metaRes.json()) as { url: string; mime_type: string };

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

// ── Webhook verification (GET) ────────────────────────────────────────────────
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
              image?: { id: string; mime_type: string; caption?: string };
              document?: { id: string; mime_type: string; caption?: string; filename?: string };
            }>;
          };
        }>;
      }>;
    };

    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    const msg = messages[0];
    const from = msg.from;

    // ── Look up registered user ──────────────────────────────────────────────
    const user = await findUserByPhone(from);

    // ── Text-only message ────────────────────────────────────────────────────
    if (msg.type === "text") {
      const text = (msg.text?.body ?? "").trim();
      const lower = text.toLowerCase();

      if (!user) {
        // Unregistered sender — explain how to register
        await sendReply(phoneNumberId, accessToken, from,
          `👋 שלום!\n\nכדי לשלוח חשבוניות דרך WhatsApp, עליך לרשום את המספר הזה ב-BillBOT+:\n\n📱 היכנס לאפליקציה → הגדרות → WhatsApp → הכנס מספר זה\n\nלאחר הרישום תוכל לשלוח תמונות וקבצי PDF של חשבוניות ישירות לכאן! 🧾`
        );
        return;
      }

      // Help / menu
      if (lower.includes("עזרה") || lower.includes("help") || lower === "?") {
        const cats = await getCategoryList();
        const catList = cats.slice(0, 10).map((c, i) => `  ${i + 1}. ${c}`).join("\n");
        await sendReply(phoneNumberId, accessToken, from,
          `🤖 BillBOT+ — רשימת פקודות:\n\n📸 *שלח תמונה/PDF* — ניתוח חשבונית אוטומטי\n📋 *קטגוריה + תמונה* — שייך לקטגוריה ספציפית\n   לדוגמה: "דלק 📸" יסווג לדלק ונסיעות\n\n🗂 קטגוריות זמינות:\n${catList}\n\nשלח "?" לתפריט זה`
        );
        return;
      }

      // Category list request
      if (lower.includes("קטגוריות") || lower.includes("categories")) {
        const cats = await getCategoryList();
        await sendReply(phoneNumberId, accessToken, from,
          `🗂 קטגוריות זמינות:\n\n${cats.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nשלח תמונה עם שם הקטגוריה כדי לשייך אותה ישירות`
        );
        return;
      }

      // General greeting
      if (lower.includes("שלום") || lower.includes("hello") || lower.includes("hi")) {
        await sendReply(phoneNumberId, accessToken, from,
          `👋 שלום ${user.name ?? ""}! \n\nשלח תמונה של חשבונית ואני אשמור אותה אוטומטית ✅\n\nניתן גם לכתוב שם קטגוריה לפני התמונה, למשל:\n"דלק [תמונה]" או "מכולת [PDF]"\n\nשלח "?" לרשימת פקודות`
        );
        return;
      }

      await sendReply(phoneNumberId, accessToken, from,
        `📸 שלח תמונה של חשבונית (JPG/PNG) או קובץ PDF.\nניתן לכתוב שם קטגוריה לפני הקובץ כדי לשייך אותה אוטומטית.`
      );
      return;
    }

    // ── Media message ────────────────────────────────────────────────────────
    const mediaObj = msg.type === "image" ? msg.image : msg.document;
    if (!mediaObj) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(mediaObj.mime_type)) {
      await sendReply(phoneNumberId, accessToken, from, "⚠️ סוג קובץ לא נתמך. שלח JPG, PNG, או PDF.");
      return;
    }

    if (!user) {
      await sendReply(phoneNumberId, accessToken, from,
        `❌ המספר שלך לא רשום במערכת.\n\nכדי להשתמש ב-BillBOT+ דרך WhatsApp:\n📱 היכנס לאפליקציה → הגדרות → WhatsApp → הכנס מספר זה`
      );
      return;
    }

    // Extract category hint from caption
    const caption = (msg.image?.caption ?? msg.document?.caption ?? "").trim();
    let categoryHint: string | null = null;

    const { filePath } = await downloadMetaMedia(mediaObj.id, accessToken);

    // Try to match category from caption text
    if (caption) {
      const matched = await findCategoryByKeyword(caption);
      if (matched) categoryHint = matched;
      else categoryHint = caption; // Keep raw caption as hint even if no exact match
    }

    const result = await processInvoice({
      filePath,
      extracted: { date: new Date().toISOString().split("T")[0] },
      sourceType: "camera",
    });

    // Override final_category if user specified one via caption
    if (categoryHint) {
      await db.update(invoicesTable)
        .set({ final_category: categoryHint, suggested_category: categoryHint, updated_at: new Date() })
        .where(eq(invoicesTable.id, result.invoiceId));
    }

    const vendor   = result.canonicalVendorName || "לא זוהה";
    const category = categoryHint || result.suggestedCategory || "לא סווג";
    const dupWarn = result.duplicateStatus === "duplicate"
      ? "\n\n⚠️ *שים לב:* ייתכן כפילות עם חשבונית קיימת!"
      : "";

    await sendReply(phoneNumberId, accessToken, from,
      `✅ *החשבונית נשמרה!*\n\n🏢 ספק: ${vendor}\n🗂 קטגוריה: ${category}\n🆔 מזהה: ${result.invoiceId.slice(0, 8)}${dupWarn}\n\n💡 שלח "?" לעזרה ורשימת קטגוריות`
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
