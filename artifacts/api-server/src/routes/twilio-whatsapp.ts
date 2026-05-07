import { Router, type IRouter } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { processInvoice } from "../services/invoiceProcessingService.js";
import { db } from "@workspace/db";
import { usersTable, categoriesTable, invoicesTable } from "@workspace/db/schema";
import { eq, ilike, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── Session state (in-memory) ─────────────────────────────────────────────────
type SessionState =
  | { type: "idle" }
  | { type: "main_menu" }
  | { type: "awaiting_category_pick"; invoiceId: string; categories: string[] }
  | { type: "awaiting_post_invoice"; invoiceId: string; vendor: string; category: string };

const sessions = new Map<string, SessionState>();

function getSession(phone: string): SessionState {
  return sessions.get(phone) ?? { type: "idle" };
}
function setSession(phone: string, state: SessionState) {
  sessions.set(phone, state);
}
function clearSession(phone: string) {
  sessions.set(phone, { type: "idle" });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function firstName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
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

async function getAllCategories(): Promise<string[]> {
  try {
    const rows = await db
      .select({ name: categoriesTable.name })
      .from(categoriesTable)
      .orderBy(categoriesTable.sort_order)
      .limit(20);
    return rows.map((r) => r.name);
  } catch {
    return [];
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

async function getRecentInvoices(userId: string, limit = 5) {
  try {
    const rows = await db
      .select({
        id: invoicesTable.id,
        vendor: invoicesTable.normalized_vendor_name,
        rawVendor: invoicesTable.raw_vendor_name,
        total: invoicesTable.total,
        currency: invoicesTable.currency,
        category: invoicesTable.final_category,
        date: invoicesTable.invoice_date,
        createdAt: invoicesTable.created_at,
      })
      .from(invoicesTable)
      .where(eq(invoicesTable.vendor_id, userId))
      .orderBy(desc(invoicesTable.created_at))
      .limit(limit);
    return rows;
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
      body: new URLSearchParams({ From: from, To: toFormatted, Body: message }).toString(),
    }
  );
}

async function downloadTwilioMedia(mediaUrl: string): Promise<{ filePath: string; mimeType: string }> {
  const { accountSid, authToken } = getTwilioCreds();
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(mediaUrl, { headers: { Authorization: `Basic ${credentials}` } });
  if (!res.ok) throw new Error(`Failed to download Twilio media: ${res.status}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg",
    "image/png": ".png", "application/pdf": ".pdf",
  };
  const ext = extMap[contentType.split(";")[0].trim()] || ".jpg";
  const buffer = Buffer.from(await res.arrayBuffer());
  const monthDir = getMonthUploadsDir();
  const filename = `twilio-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(monthDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath, mimeType: contentType };
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildMainMenu(name: string | null | undefined): string {
  const greet = firstName(name) ? `${firstName(name)}` : "";
  return (
    `🤖 *BillBOT+${greet ? " — שלום " + greet + "!" : ""}*\n\n` +
    `בחר פעולה:\n\n` +
    `1️⃣  📸 העלה חשבונית (שלח תמונה/PDF)\n` +
    `2️⃣  🗂 רשימת קטגוריות\n` +
    `3️⃣  📊 חשבוניות אחרונות\n` +
    `4️⃣  ❓ עזרה ופקודות\n\n` +
    `_שלח מספר לבחירה, או שלח תמונה ישירות_`
  );
}

function buildHelpMenu(): string {
  return (
    `📋 *BillBOT+ — מדריך שימוש*\n\n` +
    `📸 *שלח תמונה/PDF* — ניתוח חשבונית אוטומטי\n` +
    `🗂 *שם קטגוריה + תמונה* — שייך לקטגוריה\n` +
    `   לדוגמה: _"דלק"_ עם תמונה מצורפת\n\n` +
    `*פקודות מהירות:*\n` +
    `• שלח *0* או *תפריט* — תפריט ראשי\n` +
    `• שלח *קטגוריות* — רשימת קטגוריות\n` +
    `• שלח *סיכום* — 5 חשבוניות אחרונות\n` +
    `• שלח *?* — תפריט זה\n\n` +
    `_BillBOT+ — ניהול חשבוניות חכם_ 🧾`
  );
}

function buildCategoryMenu(cats: string[]): string {
  const list = cats.map((c, i) => `${i + 1}️⃣  ${c}`).join("\n");
  return (
    `🗂 *קטגוריות זמינות:*\n\n${list}\n\n` +
    `_שלח מספר לבחירה, או שם חופשי_\n` +
    `שלח *0* לחזרה לתפריט`
  );
}

function buildPostInvoiceMenu(vendor: string, category: string, invoiceId: string): string {
  return (
    `✅ *החשבונית נשמרה!*\n\n` +
    `🏢 ספק: *${vendor || "לא זוהה"}*\n` +
    `🗂 קטגוריה: *${category || "לא סווג"}*\n` +
    `🆔 מזהה: \`${invoiceId.slice(0, 8)}\`\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `1️⃣  ✅ הקטגוריה נכונה\n` +
    `2️⃣  🔄 שנה קטגוריה\n` +
    `3️⃣  🏠 תפריט ראשי\n` +
    `━━━━━━━━━━━━━━`
  );
}

function buildSummary(invoices: Awaited<ReturnType<typeof getRecentInvoices>>, name: string | null | undefined): string {
  if (!invoices.length) {
    return `📊 ${firstName(name) ? firstName(name) + ", " : ""}אין עדיין חשבוניות במערכת.\n\nשלח תמונה של חשבונית כדי להתחיל! 📸`;
  }
  const lines = invoices.map((inv, i) => {
    const vendor = inv.vendor || inv.rawVendor || "לא ידוע";
    const total = inv.total ? `₪${parseFloat(inv.total).toLocaleString("he-IL")}` : "—";
    const cat = inv.category || "לא סווג";
    const date = inv.date || (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("he-IL") : "—");
    return `${i + 1}. *${vendor}* — ${total}\n   🗂 ${cat} | 📅 ${date}`;
  });
  return (
    `📊 *${firstName(name) ? firstName(name) + " — " : ""}חשבוניות אחרונות:*\n\n` +
    lines.join("\n\n") +
    `\n\n_שלח *0* לתפריט הראשי_`
  );
}

// ── Webhook ───────────────────────────────────────────────────────────────────
router.post("/webhook", express.urlencoded({ extended: false }), async (req, res) => {
  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");

  const { accountSid, authToken } = getTwilioCreds();
  if (!accountSid || !authToken) {
    console.warn("Twilio WhatsApp: missing credentials");
    return;
  }

  try {
    const body = req.body as {
      From?: string; Body?: string;
      NumMedia?: string; MediaUrl0?: string; MediaContentType0?: string;
    };

    const from = body.From || "";
    const text = (body.Body || "").trim();
    const lower = text.toLowerCase();
    const numMedia = parseInt(body.NumMedia || "0", 10);
    const mediaUrl = body.MediaUrl0;
    const mediaContentType = body.MediaContentType0 || "image/jpeg";

    const phone = from.replace("whatsapp:", "").replace(/\D/g, "");
    const user = await findUserByPhone(phone);
    const session = getSession(phone);
    const fname = firstName(user?.name);

    // ── Unregistered user ────────────────────────────────────────────────────
    if (!user) {
      await sendTwilioReply(from,
        `👋 שלום!\n\nכדי להשתמש ב-BillBOT+ דרך WhatsApp:\n\n` +
        `📱 היכנס לאפליקציה → *הגדרות* → *WhatsApp* → הכנס את המספר שלך\n\n` +
        `לאחר הרישום תוכל לשלוח חשבוניות ישירות מכאן! 🧾`
      );
      return;
    }

    // ── Global commands (work from any state) ────────────────────────────────
    const isMenuCmd = lower === "0" || lower === "תפריט" || lower === "menu" || lower === "בית";
    const isHelpCmd = lower === "?" || lower.includes("עזרה") || lower === "help";
    const isCatsCmd = lower === "קטגוריות" || lower === "categories";
    const isSummaryCmd = lower === "סיכום" || lower === "summary" || lower === "היסטוריה";

    if (isMenuCmd) {
      clearSession(phone);
      await sendTwilioReply(from, buildMainMenu(user.name));
      return;
    }

    if (isHelpCmd) {
      clearSession(phone);
      await sendTwilioReply(from, buildHelpMenu());
      return;
    }

    if (isCatsCmd) {
      const cats = await getAllCategories();
      setSession(phone, { type: "awaiting_category_pick", invoiceId: "", categories: cats });
      await sendTwilioReply(from, buildCategoryMenu(cats));
      return;
    }

    if (isSummaryCmd) {
      clearSession(phone);
      const invoices = await getRecentInvoices(user.id);
      await sendTwilioReply(from, buildSummary(invoices, user.name));
      return;
    }

    // ── State: awaiting post-invoice decision ────────────────────────────────
    if (session.type === "awaiting_post_invoice") {
      const { invoiceId, vendor, category } = session;

      if (text === "1") {
        clearSession(phone);
        await sendTwilioReply(from,
          `✅ מעולה${fname ? ", " + fname : ""}! הקטגוריה *${category}* נשמרה.\n\n` +
          `שלח חשבונית נוספת או שלח *0* לתפריט 🏠`
        );
        return;
      }

      if (text === "2") {
        const cats = await getAllCategories();
        setSession(phone, { type: "awaiting_category_pick", invoiceId, categories: cats });
        await sendTwilioReply(from, buildCategoryMenu(cats));
        return;
      }

      if (text === "3") {
        clearSession(phone);
        await sendTwilioReply(from, buildMainMenu(user.name));
        return;
      }

      // Re-show menu if unrecognized
      await sendTwilioReply(from, buildPostInvoiceMenu(vendor, category, invoiceId));
      return;
    }

    // ── State: awaiting category pick ────────────────────────────────────────
    if (session.type === "awaiting_category_pick") {
      const { invoiceId, categories } = session;
      let chosenCategory: string | null = null;

      // Numeric selection
      const num = parseInt(text, 10);
      if (!isNaN(num) && num >= 1 && num <= categories.length) {
        chosenCategory = categories[num - 1];
      } else if (text.length > 1) {
        // Free-text match
        const matched = await findCategoryByKeyword(text);
        chosenCategory = matched || text;
      }

      if (chosenCategory && invoiceId) {
        // Update invoice category
        await db.update(invoicesTable)
          .set({ final_category: chosenCategory, suggested_category: chosenCategory, updated_at: new Date() })
          .where(eq(invoicesTable.id, invoiceId));
        clearSession(phone);
        await sendTwilioReply(from,
          `✅ קטגוריה עודכנה ל-*${chosenCategory}*${fname ? ", " + fname : ""}!\n\n` +
          `שלח חשבונית נוספת או שלח *0* לתפריט 🏠`
        );
        return;
      }

      if (chosenCategory && !invoiceId) {
        // Was just browsing categories
        clearSession(phone);
        await sendTwilioReply(from,
          `🗂 קטגוריה *${chosenCategory}* — שלח תמונה עם הכיתוב *${chosenCategory}* כדי לשייך אוטומטית!\n\n` +
          `שלח *0* לתפריט`
        );
        return;
      }

      await sendTwilioReply(from, buildCategoryMenu(categories));
      return;
    }

    // ── Main menu numeric navigation (idle state) ────────────────────────────
    if (text === "1") {
      await sendTwilioReply(from,
        `📸 *${fname ? fname + " — " : ""}שלח חשבונית*\n\n` +
        `שלח תמונה (JPG/PNG) או קובץ PDF של חשבונית.\n` +
        `ניתן לכתוב שם קטגוריה כ-_כיתוב_ לתמונה לסיווג מהיר.\n\n` +
        `שלח *0* לחזרה לתפריט`
      );
      return;
    }

    if (text === "2") {
      const cats = await getAllCategories();
      setSession(phone, { type: "awaiting_category_pick", invoiceId: "", categories: cats });
      await sendTwilioReply(from, buildCategoryMenu(cats));
      return;
    }

    if (text === "3") {
      const invoices = await getRecentInvoices(user.id);
      await sendTwilioReply(from, buildSummary(invoices, user.name));
      return;
    }

    if (text === "4") {
      await sendTwilioReply(from, buildHelpMenu());
      return;
    }

    // ── Media message ─────────────────────────────────────────────────────────
    if (numMedia > 0 && mediaUrl) {
      const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      const mimeBase = mediaContentType.split(";")[0].trim();

      if (!allowed.includes(mimeBase)) {
        await sendTwilioReply(from, "⚠️ סוג קובץ לא נתמך. שלח JPG, PNG, או PDF.");
        return;
      }

      await sendTwilioReply(from, `⏳ מעבד את החשבונית שלך${fname ? ", " + fname : ""}... רגע אחד`);

      const { filePath } = await downloadTwilioMedia(mediaUrl);

      // Category hint from caption
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
        await db.update(invoicesTable)
          .set({ final_category: categoryHint, suggested_category: categoryHint, updated_at: new Date() })
          .where(eq(invoicesTable.id, result.invoiceId));
      }

      const vendor = result.canonicalVendorName || "לא זוהה";
      const category = categoryHint || result.suggestedCategory || "לא סווג";
      const dupWarn = result.duplicateStatus === "duplicate"
        ? "\n\n⚠️ *שים לב:* ייתכן כפילות עם חשבונית קיימת!" : "";

      // Set state for post-invoice menu
      setSession(phone, { type: "awaiting_post_invoice", invoiceId: result.invoiceId, vendor, category });

      await sendTwilioReply(from, buildPostInvoiceMenu(vendor, category, result.invoiceId) + dupWarn);
      return;
    }

    // ── First message / greeting ─────────────────────────────────────────────
    if (lower.includes("שלום") || lower.includes("היי") || lower.includes("hello") || lower.includes("hi") || lower === "start") {
      await sendTwilioReply(from, buildMainMenu(user.name));
      return;
    }

    // ── Fallback ─────────────────────────────────────────────────────────────
    await sendTwilioReply(from,
      `${fname ? fname + ", " : ""}לא הבנתי את ההודעה 🤔\n\n` +
      `📸 שלח תמונה/PDF של חשבונית\n` +
      `🏠 שלח *0* לתפריט הראשי\n` +
      `❓ שלח *?* לעזרה`
    );

  } catch (err) {
    console.error("Twilio WhatsApp webhook error:", err);
  }
});

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
