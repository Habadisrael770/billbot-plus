import { Router, type IRouter } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { processInvoice } from "../services/invoiceProcessingService.js";
import { db } from "@workspace/db";
import { usersTable, categoriesTable, invoicesTable } from "@workspace/db/schema";
import { eq, ilike, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── Document types ────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { key: "tax_invoice",         label: "חשבונית מס",          emoji: "🧾" },
  { key: "receipt",             label: "קבלה",                 emoji: "🧾" },
  { key: "tax_invoice_receipt", label: "חשבונית מס קבלה",     emoji: "🧾" },
  { key: "proforma",            label: "הצעת מחיר",            emoji: "📋" },
  { key: "delivery_note",       label: "תעודת משלוח",          emoji: "📦" },
  { key: "business_invoice",    label: "חשבון עסקה",           emoji: "📄" },
  { key: "other",               label: "מסמך אחר",             emoji: "📎" },
] as const;

// ── Session state ─────────────────────────────────────────────────────────────
type DocTypeKey = (typeof DOC_TYPES)[number]["key"];

type SessionState =
  | { type: "idle" }
  | { type: "awaiting_doc_type";
      invoiceId: string; vendor: string; amount: string;
      date: string; category: string; isDuplicate: boolean; isForeign: boolean; currency: string }
  | { type: "awaiting_category_pick";
      invoiceId: string; docType: DocTypeKey; categories: string[];
      vendor: string; amount: string; currency: string }
  | { type: "awaiting_action";
      invoiceId: string; docType: DocTypeKey; vendor: string;
      amount: string; category: string; currency: string }
  | { type: "awaiting_amount_correct";
      invoiceId: string; docType: DocTypeKey; category: string }
  | { type: "awaiting_note";
      invoiceId: string; docType: DocTypeKey; category: string; amount: string; vendor: string; currency: string };

const sessions = new Map<string, SessionState>();
function getSession(phone: string): SessionState { return sessions.get(phone) ?? { type: "idle" }; }
function setSession(phone: string, state: SessionState) { sessions.set(phone, state); }
function clearSession(phone: string) { sessions.set(phone, { type: "idle" }); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMonthUploadsDir(): string {
  const now = new Date();
  const dir = path.resolve(process.cwd(), "uploads", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getTwilioCreds() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken:  process.env.TWILIO_AUTH_TOKEN,
    from:       process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
  };
}

function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function formatAmount(amount: string | null | undefined, currency: string = "ILS"): string {
  if (!amount) return "—";
  const num = parseFloat(amount);
  if (isNaN(num)) return "—";
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₪";
  return `${sym}${num.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function divider() { return "━━━━━━━━━━━━━━━━━"; }

async function findUserByPhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.whatsappPhone, normalized))
      .limit(1);
    return user ?? null;
  } catch { return null; }
}

async function getAllCategories(): Promise<string[]> {
  try {
    const rows = await db.select({ name: categoriesTable.name }).from(categoriesTable)
      .orderBy(categoriesTable.sort_order).limit(20);
    return rows.map((r) => r.name);
  } catch { return []; }
}

async function findCategoryByKeyword(keyword: string): Promise<string | null> {
  try {
    const rows = await db.select({ name: categoriesTable.name }).from(categoriesTable)
      .where(ilike(categoriesTable.name, `%${keyword}%`)).limit(1);
    return rows[0]?.name ?? null;
  } catch { return null; }
}

async function getRecentInvoices(userId: string, limit = 5) {
  try {
    return await db.select({
      id: invoicesTable.id, vendor: invoicesTable.normalized_vendor_name,
      rawVendor: invoicesTable.raw_vendor_name, total: invoicesTable.total,
      currency: invoicesTable.currency, category: invoicesTable.final_category,
      date: invoicesTable.invoice_date, docType: invoicesTable.document_type,
      createdAt: invoicesTable.created_at,
    }).from(invoicesTable)
      .where(eq(invoicesTable.vendor_id, userId))
      .orderBy(desc(invoicesTable.created_at)).limit(limit);
  } catch { return []; }
}

async function sendTwilioReply(to: string, message: string): Promise<void> {
  const { accountSid, authToken, from } = getTwilioCreds();
  if (!accountSid || !authToken) return;
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: from, To: toFormatted, Body: message }).toString(),
  });
}

async function downloadTwilioMedia(mediaUrl: string): Promise<{ filePath: string; mimeType: string }> {
  const { accountSid, authToken } = getTwilioCreds();
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(mediaUrl, { headers: { Authorization: `Basic ${credentials}` } });
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "application/pdf": ".pdf",
  };
  const ext = extMap[contentType.split(";")[0].trim()] || ".jpg";
  const buffer = Buffer.from(await res.arrayBuffer());
  const filePath = path.join(getMonthUploadsDir(), `twilio-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  fs.writeFileSync(filePath, buffer);
  return { filePath, mimeType: contentType };
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildMainMenu(name: string | null | undefined): string {
  const greet = firstName(name);
  return (
    `🤖 *BillBOT+${greet ? ` — שלום ${greet}!` : ""}*\n\n` +
    `${divider()}\n` +
    `1️⃣  📸  *שלח חשבונית*\n` +
    `      JPG / PNG / PDF\n\n` +
    `2️⃣  📊  *חשבוניות אחרונות*\n` +
    `      5 הרשומות האחרונות\n\n` +
    `3️⃣  🗂  *רשימת קטגוריות*\n` +
    `      כל הקטגוריות שלך\n\n` +
    `4️⃣  ❓  *עזרה*\n` +
    `${divider()}\n\n` +
    `_💡 אפשר גם לשלוח תמונה/PDF ישירות_`
  );
}

function buildHelpMenu(): string {
  return (
    `📋 *BillBOT+ — מדריך*\n\n` +
    `${divider()}\n` +
    `📸 *שלח תמונה/PDF* — ניתוח אוטומטי\n` +
    `📝 *שלח קטגוריה + תמונה* — לסיווג מהיר\n\n` +
    `*פקודות מהירות:*\n` +
    `• *0* / *תפריט* — תפריט ראשי\n` +
    `• *סיכום* — 5 חשבוניות אחרונות\n` +
    `• *קטגוריות* — רשימת קטגוריות\n` +
    `• *?* / *עזרה* — מדריך זה\n` +
    `${divider()}\n\n` +
    `_BillBOT+ v2 — ניהול חשבוניות חכם_ 🧾`
  );
}

function buildDocTypeMenu(vendor: string, amount: string, date: string, category: string,
  isDuplicate: boolean, isForeign: boolean, currency: string): string {
  const dupLine   = isDuplicate ? `\n⚠️ *שים לב:* ייתכן כפילות!\n` : "";
  const foreignLine = isForeign ? `\n🌍 *ספק חוץ* זוהה\n` : "";
  return (
    `✅ *החשבונית עובדה!*\n${divider()}\n` +
    `🏢 *ספק:*      ${vendor || "לא זוהה"}\n` +
    `💰 *סכום:*     ${formatAmount(amount, currency)}\n` +
    `📅 *תאריך:*    ${date || "לא זוהה"}\n` +
    `🗂 *קטגוריה:* ${category || "לא סווג"}\n` +
    `${dupLine}${foreignLine}` +
    `${divider()}\n\n` +
    `📄 *מהו סוג המסמך?*\n\n` +
    DOC_TYPES.map((d, i) => `${i + 1}️⃣  ${d.emoji} ${d.label}`).join("\n") +
    `\n\n_שלח מספר לבחירה_`
  );
}

function buildActionMenu(vendor: string, amount: string, category: string,
  docType: DocTypeKey, currency: string, invoiceId: string): string {
  const docLabel = DOC_TYPES.find((d) => d.key === docType)?.label ?? docType;
  return (
    `${divider()}\n` +
    `🏢 ${vendor || "לא זוהה"} | ${formatAmount(amount, currency)}\n` +
    `📄 ${docLabel} | 🗂 ${category || "לא סווג"}\n` +
    `🆔 \`${invoiceId.slice(0, 8)}\`\n` +
    `${divider()}\n\n` +
    `בחר פעולה:\n\n` +
    `1️⃣  ✅  *אשר ושמור*\n` +
    `2️⃣  🔄  *שנה קטגוריה*\n` +
    `3️⃣  ✏️  *תקן סכום*\n` +
    `4️⃣  💬  *הוסף הערה*\n` +
    `5️⃣  🏠  *תפריט ראשי*\n` +
    `${divider()}`
  );
}

function buildCategoryMenu(cats: string[], title = "🗂 *בחר קטגוריה:*"): string {
  const numbered = cats.map((c, i) => `${i + 1}️⃣  ${c}`).join("\n");
  return `${title}\n${divider()}\n${numbered}\n${divider()}\n\n_שלח מספר או הקלד שם קטגוריה_\nשלח *0* לחזרה`;
}

function buildSummary(invs: Awaited<ReturnType<typeof getRecentInvoices>>, name: string | null | undefined): string {
  if (!invs.length) {
    return `📊 אין עדיין חשבוניות במערכת.\n\nשלח תמונה של חשבונית כדי להתחיל! 📸`;
  }
  const docLabel = (dt: string | null) => DOC_TYPES.find((d) => d.key === dt)?.label ?? "מסמך";
  const lines = invs.map((inv, i) => {
    const vendor = inv.vendor || inv.rawVendor || "לא ידוע";
    const total  = formatAmount(inv.total, inv.currency || "ILS");
    const date   = inv.date || (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("he-IL") : "—");
    return (
      `${i + 1}. *${vendor}*\n` +
      `   💰 ${total}  |  📅 ${date}\n` +
      `   📄 ${docLabel(inv.docType)}  |  🗂 ${inv.category || "לא סווג"}`
    );
  });
  return (
    `📊 *${firstName(name) ? firstName(name) + " — " : ""}חשבוניות אחרונות:*\n${divider()}\n` +
    lines.join(`\n${divider()}\n`) +
    `\n${divider()}\n_שלח *0* לתפריט_`
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

    const from         = body.From || "";
    const text         = (body.Body || "").trim();
    const lower        = text.toLowerCase();
    const numMedia     = parseInt(body.NumMedia || "0", 10);
    const mediaUrl     = body.MediaUrl0;
    const mediaType    = (body.MediaContentType0 || "image/jpeg").split(";")[0].trim();
    const phone        = from.replace("whatsapp:", "").replace(/\D/g, "");
    const user         = await findUserByPhone(phone);
    const session      = getSession(phone);
    const fname        = firstName(user?.name);

    // ── Unregistered user ─────────────────────────────────────────────────────
    if (!user) {
      await sendTwilioReply(from,
        `👋 שלום!\n\n` +
        `כדי להשתמש ב-BillBOT+ דרך WhatsApp:\n\n` +
        `📱 היכנס לאפליקציה\n` +
        `⚙️  הגדרות → חיבורים → WhatsApp\n` +
        `📞 הכנס את המספר שלך\n\n` +
        `לאחר הרישום תוכל לשלוח חשבוניות ישירות מכאן! 🧾`
      );
      return;
    }

    // ── Global commands ───────────────────────────────────────────────────────
    const isMenu    = /^(0|תפריט|menu|בית|start)$/i.test(lower);
    const isHelp    = /^(\?|עזרה|help)$/i.test(lower);
    const isCats    = /^(קטגוריות|categories)$/i.test(lower);
    const isSummary = /^(סיכום|summary|היסטוריה)$/i.test(lower);

    if (isMenu)    { clearSession(phone); await sendTwilioReply(from, buildMainMenu(user.name)); return; }
    if (isHelp)    { clearSession(phone); await sendTwilioReply(from, buildHelpMenu()); return; }
    if (isSummary) { clearSession(phone); await sendTwilioReply(from, buildSummary(await getRecentInvoices(user.id), user.name)); return; }
    if (isCats) {
      const cats = await getAllCategories();
      setSession(phone, { type: "awaiting_category_pick", invoiceId: "", docType: "other", categories: cats, vendor: "", amount: "0", currency: "ILS" });
      await sendTwilioReply(from, buildCategoryMenu(cats));
      return;
    }

    // ── State: awaiting_doc_type ──────────────────────────────────────────────
    if (session.type === "awaiting_doc_type") {
      const num = parseInt(text, 10);
      if (isNaN(num) || num < 1 || num > DOC_TYPES.length) {
        await sendTwilioReply(from,
          `❓ שלח מספר בין 1 ל-${DOC_TYPES.length}:\n\n` +
          DOC_TYPES.map((d, i) => `${i + 1}️⃣  ${d.label}`).join("\n")
        );
        return;
      }
      const chosen = DOC_TYPES[num - 1];
      await db.update(invoicesTable)
        .set({ document_type: chosen.key, updated_at: new Date() })
        .where(eq(invoicesTable.id, session.invoiceId));

      setSession(phone, {
        type: "awaiting_action",
        invoiceId: session.invoiceId, docType: chosen.key,
        vendor: session.vendor, amount: session.amount,
        category: session.category, currency: session.currency,
      });
      await sendTwilioReply(from, buildActionMenu(
        session.vendor, session.amount, session.category,
        chosen.key, session.currency, session.invoiceId
      ));
      return;
    }

    // ── State: awaiting_action ────────────────────────────────────────────────
    if (session.type === "awaiting_action") {
      const { invoiceId, docType, vendor, amount, category, currency } = session;

      if (text === "1") {
        // Confirm & save
        await db.update(invoicesTable)
          .set({ status: "approved", updated_at: new Date() })
          .where(eq(invoicesTable.id, invoiceId));
        clearSession(phone);
        await sendTwilioReply(from,
          `🎉 *נשמר!*\n\n` +
          `✅ חשבונית #\`${invoiceId.slice(0, 8)}\` אושרה.\n` +
          `🏢 ${vendor || "—"} | ${formatAmount(amount, currency)}\n\n` +
          `שלח חשבונית נוספת או שלח *0* לתפריט 🏠`
        );
        return;
      }

      if (text === "2") {
        // Change category
        const cats = await getAllCategories();
        setSession(phone, { type: "awaiting_category_pick", invoiceId, docType, categories: cats, vendor, amount, currency });
        await sendTwilioReply(from, buildCategoryMenu(cats, "🔄 *בחר קטגוריה חדשה:*"));
        return;
      }

      if (text === "3") {
        // Correct amount
        setSession(phone, { type: "awaiting_amount_correct", invoiceId, docType, category });
        await sendTwilioReply(from,
          `✏️ *תיקון סכום*\n\n` +
          `הסכום הנוכחי: *${formatAmount(amount, currency)}*\n\n` +
          `הקלד את הסכום הנכון (מספר בלבד, ללא סמלים):\n` +
          `דוגמה: \`1250.50\`\n\n` +
          `שלח *0* לביטול`
        );
        return;
      }

      if (text === "4") {
        // Add note
        setSession(phone, { type: "awaiting_note", invoiceId, docType, category, amount, vendor, currency });
        await sendTwilioReply(from,
          `💬 *הוסף הערה לחשבונית*\n\n` +
          `הקלד את ההערה שלך (עד 200 תווים):\n\n` +
          `שלח *0* לביטול`
        );
        return;
      }

      if (text === "5") {
        clearSession(phone);
        await sendTwilioReply(from, buildMainMenu(user.name));
        return;
      }

      await sendTwilioReply(from, buildActionMenu(vendor, amount, category, docType, currency, invoiceId));
      return;
    }

    // ── State: awaiting_category_pick ─────────────────────────────────────────
    if (session.type === "awaiting_category_pick") {
      const { invoiceId, docType, categories, vendor, amount, currency } = session;

      let chosen: string | null = null;
      const num = parseInt(text, 10);
      if (!isNaN(num) && num >= 1 && num <= categories.length) {
        chosen = categories[num - 1];
      } else if (text.length > 1) {
        chosen = await findCategoryByKeyword(text) || text;
      }

      if (!chosen) {
        await sendTwilioReply(from, buildCategoryMenu(categories));
        return;
      }

      await db.update(invoicesTable)
        .set({ final_category: chosen, suggested_category: chosen, updated_at: new Date() })
        .where(eq(invoicesTable.id, invoiceId));

      if (!invoiceId) {
        // Was browsing categories without invoice context
        clearSession(phone);
        await sendTwilioReply(from,
          `🗂 *${chosen}*\n\nשלח תמונה עם כיתוב *${chosen}* לסיווג אוטומטי!\nשלח *0* לתפריט`
        );
        return;
      }

      setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount, category: chosen, currency });
      await sendTwilioReply(from, buildActionMenu(vendor, amount, chosen, docType, currency, invoiceId));
      return;
    }

    // ── State: awaiting_amount_correct ────────────────────────────────────────
    if (session.type === "awaiting_amount_correct") {
      const { invoiceId, docType, category } = session;

      if (text === "0") {
        // Fetch current invoice to restore action menu
        const [inv] = await db.select({ total: invoicesTable.total, normalized_vendor_name: invoicesTable.normalized_vendor_name, currency: invoicesTable.currency })
          .from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);
        const vendor = inv?.normalized_vendor_name ?? "";
        const amount = inv?.total ?? "0";
        const currency = inv?.currency ?? "ILS";
        setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount, category, currency });
        await sendTwilioReply(from, buildActionMenu(vendor, amount, category, docType, currency, invoiceId));
        return;
      }

      const newAmount = parseFloat(text.replace(/[₪$€,]/g, ""));
      if (isNaN(newAmount) || newAmount <= 0) {
        await sendTwilioReply(from,
          `❌ סכום לא תקין.\n\nשלח מספר כגון: \`1250.50\`\nשלח *0* לביטול`
        );
        return;
      }

      await db.update(invoicesTable)
        .set({ total: String(newAmount), updated_at: new Date() })
        .where(eq(invoicesTable.id, invoiceId));

      const [inv] = await db.select({ normalized_vendor_name: invoicesTable.normalized_vendor_name, currency: invoicesTable.currency })
        .from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);
      const vendor   = inv?.normalized_vendor_name ?? "";
      const currency = inv?.currency ?? "ILS";

      setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount: String(newAmount), category, currency });
      await sendTwilioReply(from,
        `✅ הסכום עודכן ל-*${formatAmount(String(newAmount), currency)}*\n\n` +
        buildActionMenu(vendor, String(newAmount), category, docType, currency, invoiceId)
      );
      return;
    }

    // ── State: awaiting_note ──────────────────────────────────────────────────
    if (session.type === "awaiting_note") {
      const { invoiceId, docType, category, amount, vendor, currency } = session;

      if (text === "0") {
        setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount, category, currency });
        await sendTwilioReply(from, buildActionMenu(vendor, amount, category, docType, currency, invoiceId));
        return;
      }

      const note = text.slice(0, 200);
      await db.update(invoicesTable)
        .set({ review_reason: note, updated_at: new Date() } as Record<string, unknown>)
        .where(eq(invoicesTable.id, invoiceId));

      setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount, category, currency });
      await sendTwilioReply(from,
        `💬 ההערה נשמרה ✅\n_"${note.slice(0, 60)}${note.length > 60 ? "..." : ""}"_\n\n` +
        buildActionMenu(vendor, amount, category, docType, currency, invoiceId)
      );
      return;
    }

    // ── Main menu numeric options (idle state) ────────────────────────────────
    if (text === "1") {
      await sendTwilioReply(from,
        `📸 *שלח חשבונית*\n\n` +
        `שלח תמונה (JPG/PNG) או קובץ PDF.\n` +
        `💡 ניתן לכתוב שם קטגוריה ב_כיתוב_ לסיווג מהיר.\n\n` +
        `שלח *0* לחזרה`
      );
      return;
    }
    if (text === "2") {
      await sendTwilioReply(from, buildSummary(await getRecentInvoices(user.id), user.name));
      return;
    }
    if (text === "3") {
      const cats = await getAllCategories();
      setSession(phone, { type: "awaiting_category_pick", invoiceId: "", docType: "other", categories: cats, vendor: "", amount: "0", currency: "ILS" });
      await sendTwilioReply(from, buildCategoryMenu(cats));
      return;
    }
    if (text === "4") {
      await sendTwilioReply(from, buildHelpMenu());
      return;
    }

    // ── Media message ─────────────────────────────────────────────────────────
    if (numMedia > 0 && mediaUrl) {
      const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (!allowed.includes(mediaType)) {
        await sendTwilioReply(from, "⚠️ סוג קובץ לא נתמך.\nשלח JPG, PNG, או PDF.");
        return;
      }

      await sendTwilioReply(from, `⏳ *מעבד את החשבונית${fname ? `, ${fname}` : ""}...*\nרגע אחד 🔍`);

      const { filePath } = await downloadTwilioMedia(mediaUrl);

      // Category hint from caption
      let categoryHint: string | null = null;
      if (text) {
        categoryHint = await findCategoryByKeyword(text) || text;
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

      // Fetch saved invoice details from DB
      const [savedInv] = await db
        .select({
          total:    invoicesTable.total,
          currency: invoicesTable.currency,
          date:     invoicesTable.invoice_date,
          vendor:   invoicesTable.normalized_vendor_name,
        })
        .from(invoicesTable)
        .where(eq(invoicesTable.id, result.invoiceId))
        .limit(1);

      const vendor   = result.canonicalVendorName || savedInv?.vendor || "לא זוהה";
      const amount   = savedInv?.total ?? "0";
      const date     = savedInv?.date ?? new Date().toLocaleDateString("he-IL");
      const category = categoryHint || result.suggestedCategory || "לא סווג";
      const currency = savedInv?.currency ?? "ILS";
      const isForeign = false; // runtime: detected inside processInvoice pipeline

      setSession(phone, {
        type: "awaiting_doc_type",
        invoiceId: result.invoiceId, vendor, amount, date,
        category, isDuplicate: result.duplicateStatus === "duplicate",
        isForeign, currency,
      });

      await sendTwilioReply(from, buildDocTypeMenu(vendor, amount, date, category,
        result.duplicateStatus === "duplicate", isForeign, currency));
      return;
    }

    // ── Greeting ──────────────────────────────────────────────────────────────
    if (/^(שלום|היי|hello|hi|start)$/i.test(lower)) {
      await sendTwilioReply(from, buildMainMenu(user.name));
      return;
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    await sendTwilioReply(from,
      `${fname ? `${fname}, ` : ""}לא הבנתי 🤔\n\n` +
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
    configured:    !!(accountSid && authToken),
    provider:      "twilio",
    sandboxNumber: from,
    accountSid:    accountSid ? accountSid.slice(0, 8) + "..." : null,
  });
});

export default router;
