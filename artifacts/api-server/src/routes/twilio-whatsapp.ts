import { Router, type IRouter } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import twilio from "twilio";
import { processInvoice } from "../services/invoiceProcessingService.js";
import { db } from "@workspace/db";
import { usersTable, categoriesTable, invoicesTable } from "@workspace/db/schema";
import { eq, ilike, desc } from "drizzle-orm";

// Trusted hostnames from which Twilio serves media — credentials are only sent to these.
const TWILIO_TRUSTED_HOSTS = new Set([
  "api.twilio.com",
  "media.twiliocdn.com",
  "mcs.us1.twilio.com",
]);

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
  | { type: "awaiting_triage";
      invoiceId: string; vendor: string; amount: string;
      date: string; category: string; isDuplicate: boolean; isForeign: boolean; currency: string;
      amountMissing: boolean; catMissing: boolean }
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
      invoiceId: string; vendor: string; category: string; currency: string;
      nextStep: "triage" | "category" | "action"; docType: DocTypeKey }
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
  // Validate that the URL comes from a Twilio-owned hostname before attaching credentials.
  // This prevents SSRF-based credential exfiltration when the webhook has not yet been
  // signature-validated (defence-in-depth) or in the unlikely case validation is bypassed.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    throw new Error("Invalid media URL");
  }
  if (parsedUrl.protocol !== "https:") throw new Error("Media URL must use HTTPS");
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!TWILIO_TRUSTED_HOSTS.has(hostname) && !hostname.endsWith(".twilio.com") && !hostname.endsWith(".twiliocdn.com")) {
    throw new Error(`Refusing to fetch media from untrusted host: ${hostname}`);
  }

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

// ── Triage menu — shown right after processing ─────────────────────────────
// Button layout depends on amountMissing / catMissing:
// Always:  [fix_amount if missing] [fix_category if missing] [fix_doctype] [confirm] [0=menu]
function triageButtons(amountMissing: boolean, catMissing: boolean): Array<{ label: string; action: string }> {
  const btns: Array<{ label: string; action: string }> = [];
  if (amountMissing) btns.push({ label: "✏️  *הכנס סכום*",    action: "fix_amount"   });
  if (catMissing)    btns.push({ label: "🗂  *בחר קטגוריה*",  action: "fix_category" });
  btns.push({ label: "📄  *בחר סוג מסמך*",  action: "fix_doctype" });
  btns.push({ label: "✅  *אשר ושמור כך*",  action: "confirm"     });
  return btns;
}

function buildTriageMenu(
  vendor: string, amount: string, date: string, category: string,
  isDuplicate: boolean, isForeign: boolean, currency: string,
  amountMissing: boolean, catMissing: boolean,
): string {
  const dupLine     = isDuplicate ? `\n⚠️ *שים לב:* ייתכן כפילות!\n` : "";
  const foreignLine = isForeign  ? `\n🌍 *ספק חוץ* זוהה\n` : "";
  const amountLine  = amountMissing
    ? `💰 *סכום:*      ⚠️ לא זוהה`
    : `💰 *סכום:*      ${formatAmount(amount, currency)}`;
  const catLine     = catMissing
    ? `🗂 *קטגוריה:*  ⚠️ לא זוהתה`
    : `🗂 *קטגוריה:*  ${category}`;

  const btns = triageButtons(amountMissing, catMissing);
  const btnLines = btns.map((b, i) => `${i + 1}️⃣  ${b.label}`).join("\n");

  return (
    `✅ *החשבונית עובדה!*\n${divider()}\n` +
    `🏢 *ספק:*      ${vendor || "לא זוהה"}\n` +
    `${amountLine}\n` +
    `📅 *תאריך:*    ${date || "לא זוהה"}\n` +
    `${catLine}\n` +
    `${dupLine}${foreignLine}` +
    `${divider()}\n\n` +
    (amountMissing || catMissing ? `⚠️ *נדרש תיקון לפני שמירה*\n\n` : `📝 *בחר פעולה:*\n\n`) +
    btnLines +
    `\n0️⃣  🏠  *תפריט ראשי*\n\n` +
    `_שלח מספר לבחירה_`
  );
}

function buildDocTypeMenu(vendor: string, amount: string, date: string, category: string,
  isDuplicate: boolean, isForeign: boolean, currency: string): string {
  const dupLine     = isDuplicate ? `\n⚠️ *שים לב:* ייתכן כפילות!\n` : "";
  const foreignLine = isForeign ? `\n🌍 *ספק חוץ* זוהה\n` : "";
  const amountNum   = parseFloat(amount || "0");
  const amountLine  = (isNaN(amountNum) || amountNum === 0)
    ? `💰 *סכום:*     ⚠️ לא זוהה`
    : `💰 *סכום:*     ${formatAmount(amount, currency)}`;
  const catLine     = (!category || category === "לא סווג")
    ? `🗂 *קטגוריה:* ⚠️ לא זוהתה`
    : `🗂 *קטגוריה:* ${category}`;
  return (
    `✅ *החשבונית עובדה!*\n${divider()}\n` +
    `🏢 *ספק:*      ${vendor || "לא זוהה"}\n` +
    `${amountLine}\n` +
    `📅 *תאריך:*    ${date || "לא זוהה"}\n` +
    `${catLine}\n` +
    `${dupLine}${foreignLine}` +
    `${divider()}\n\n` +
    `📄 *מהו סוג המסמך?*\n\n` +
    DOC_TYPES.map((d, i) => `${i + 1}️⃣  ${d.emoji} ${d.label}`).join("\n") +
    `\n\n_שלח מספר לבחירה_`
  );
}

function buildAmountMenu(currentAmount: string, currency: string): string {
  const cur = parseFloat(currentAmount || "0");
  const curLine = (!isNaN(cur) && cur > 0)
    ? `📊 *סכום נוכחי:* ${formatAmount(currentAmount, currency)}\n\n`
    : ``;
  return (
    `✏️ *הכנס סכום*\n${divider()}\n` +
    curLine +
    `הקלד את הסכום הנכון (מספר בלבד):\n` +
    `💡 דוגמה: \`1250.50\`\n\n` +
    `0️⃣  דלג ⏭`
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
  const { accountSid, authToken } = getTwilioCreds();
  if (!accountSid || !authToken) {
    console.warn("Twilio WhatsApp: missing credentials");
    res.set("Content-Type", "text/xml").status(503).send("<Response></Response>");
    return;
  }

  // ── Validate Twilio signature ──────────────────────────────────────────────
  // Reconstruct the full webhook URL that Twilio signed. Prefer an explicit
  // env var so the public hostname is correct behind proxies/CDNs.
  const twilioSignature = (req.headers["x-twilio-signature"] as string | undefined) ?? "";
  const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, "")
    ?? `${req.protocol}://${req.headers.host}`;
  const webhookUrl = `${baseUrl}${req.originalUrl}`;
  const params = req.body as Record<string, string>;

  if (!twilio.validateRequest(authToken, twilioSignature, webhookUrl, params)) {
    console.warn(`[twilio-whatsapp] Rejected request with invalid signature for URL: ${webhookUrl}`);
    res.set("Content-Type", "text/xml").status(403).send("<Response></Response>");
    return;
  }

  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");

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

    // ── State: awaiting_triage ────────────────────────────────────────────────
    if (session.type === "awaiting_triage") {
      const { invoiceId, vendor, amount, date, category, isDuplicate, isForeign, currency, amountMissing, catMissing } = session;
      const btns = triageButtons(amountMissing, catMissing);

      if (text === "0") { clearSession(phone); await sendTwilioReply(from, buildMainMenu(user.name)); return; }

      const num = parseInt(text, 10);
      if (isNaN(num) || num < 1 || num > btns.length) {
        await sendTwilioReply(from, buildTriageMenu(vendor, amount, date, category, isDuplicate, isForeign, currency, amountMissing, catMissing));
        return;
      }
      const action = btns[num - 1].action;

      if (action === "fix_amount") {
        setSession(phone, {
          type: "awaiting_amount_correct",
          invoiceId, vendor, category, currency,
          docType: "tax_invoice", nextStep: catMissing ? "category" : "triage",
        });
        await sendTwilioReply(from, buildAmountMenu(amount, currency));
        return;
      }

      if (action === "fix_category") {
        const cats = await getAllCategories();
        setSession(phone, { type: "awaiting_category_pick", invoiceId, docType: "tax_invoice", categories: cats, vendor, amount, currency });
        await sendTwilioReply(from, buildCategoryMenu(cats, "🗂 *בחר קטגוריה:*"));
        return;
      }

      if (action === "fix_doctype") {
        setSession(phone, { type: "awaiting_doc_type", invoiceId, vendor, amount, date, category, isDuplicate, isForeign, currency });
        await sendTwilioReply(from, buildDocTypeMenu(vendor, amount, date, category, isDuplicate, isForeign, currency));
        return;
      }

      if (action === "confirm") {
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

      const amountNum = parseFloat(session.amount || "0");
      const amountMissing = isNaN(amountNum) || amountNum === 0;
      const catMissing    = !session.category || session.category === "לא סווג";

      // If amount is missing → jump straight to amount correction
      if (amountMissing) {
        setSession(phone, {
          type: "awaiting_amount_correct",
          invoiceId: session.invoiceId, vendor: session.vendor,
          category: session.category, currency: session.currency,
          docType: chosen.key, nextStep: catMissing ? "category" : "action",
        });
        await sendTwilioReply(from, buildAmountMenu("0", session.currency));
        return;
      }

      // If category is missing → jump to category picker
      if (catMissing) {
        const cats = await getAllCategories();
        setSession(phone, {
          type: "awaiting_category_pick",
          invoiceId: session.invoiceId, docType: chosen.key,
          categories: cats, vendor: session.vendor,
          amount: session.amount, currency: session.currency,
        });
        await sendTwilioReply(from, buildCategoryMenu(cats, "🗂 *קטגוריה לא זוהתה — בחר:*"));
        return;
      }

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
        setSession(phone, { type: "awaiting_amount_correct", invoiceId, vendor, category, currency, docType, nextStep: "action" });
        await sendTwilioReply(from, buildAmountMenu(amount, currency));
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

      // No invoice context (just browsing categories)
      if (!invoiceId) {
        clearSession(phone);
        await sendTwilioReply(from,
          `🗂 *${chosen}*\n\nשלח תמונה עם כיתוב *${chosen}* לסיווג אוטומטי!\nשלח *0* לתפריט`
        );
        return;
      }

      await db.update(invoicesTable)
        .set({ final_category: chosen, suggested_category: chosen, updated_at: new Date() })
        .where(eq(invoicesTable.id, invoiceId));

      setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount, category: chosen, currency });
      await sendTwilioReply(from, buildActionMenu(vendor, amount, chosen, docType, currency, invoiceId));
      return;
    }

    // ── State: awaiting_amount_correct ────────────────────────────────────────
    if (session.type === "awaiting_amount_correct") {
      const { invoiceId, vendor, category, currency, docType, nextStep } = session;

      if (text === "0") {
        // Skip — go wherever nextStep says
        if (nextStep === "category") {
          const cats = await getAllCategories();
          setSession(phone, { type: "awaiting_category_pick", invoiceId, docType, categories: cats, vendor, amount: "0", currency });
          await sendTwilioReply(from, buildCategoryMenu(cats, "🗂 *בחר קטגוריה:*"));
        } else if (nextStep === "triage") {
          const [inv] = await db.select({ total: invoicesTable.total, date: invoicesTable.invoice_date })
            .from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);
          const catMissing = !category || category === "לא סווג";
          setSession(phone, { type: "awaiting_triage", invoiceId, vendor, amount: inv?.total ?? "0", date: inv?.date ?? "—", category, isDuplicate: false, isForeign: false, currency, amountMissing: false, catMissing });
          await sendTwilioReply(from, buildTriageMenu(vendor, inv?.total ?? "0", inv?.date ?? "—", category, false, false, currency, false, catMissing));
        } else {
          setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount: "0", category, currency });
          await sendTwilioReply(from, buildActionMenu(vendor, "0", category, docType, currency, invoiceId));
        }
        return;
      }

      const newAmount = parseFloat(text.replace(/[₪$€,]/g, ""));
      if (isNaN(newAmount) || newAmount <= 0) {
        await sendTwilioReply(from,
          `❌ סכום לא תקין.\n\nשלח מספר כגון: \`1250.50\`\n0️⃣  דלג ⏭`
        );
        return;
      }

      await db.update(invoicesTable)
        .set({ total: String(newAmount), updated_at: new Date() })
        .where(eq(invoicesTable.id, invoiceId));

      const confirmed = `✅ *הסכום עודכן ל-${formatAmount(String(newAmount), currency)}*\n\n`;

      if (nextStep === "category") {
        const cats = await getAllCategories();
        setSession(phone, { type: "awaiting_category_pick", invoiceId, docType, categories: cats, vendor, amount: String(newAmount), currency });
        await sendTwilioReply(from, confirmed + buildCategoryMenu(cats, "🗂 *עכשיו בחר קטגוריה:*"));
        return;
      }

      if (nextStep === "triage") {
        const [inv] = await db.select({ date: invoicesTable.invoice_date }).from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);
        const catMissing = !category || category === "לא סווג";
        setSession(phone, { type: "awaiting_triage", invoiceId, vendor, amount: String(newAmount), date: inv?.date ?? "—", category, isDuplicate: false, isForeign: false, currency, amountMissing: false, catMissing });
        await sendTwilioReply(from, confirmed + buildTriageMenu(vendor, String(newAmount), inv?.date ?? "—", category, false, false, currency, false, catMissing));
        return;
      }

      setSession(phone, { type: "awaiting_action", invoiceId, docType, vendor, amount: String(newAmount), category, currency });
      await sendTwilioReply(from, confirmed + buildActionMenu(vendor, String(newAmount), category, docType, currency, invoiceId));
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

      const isDuplicate = result.duplicateStatus !== "unique";
      const amountNum2  = parseFloat(amount || "0");
      const amountMissing = isNaN(amountNum2) || amountNum2 === 0;
      const catMissing    = !category || category === "לא סווג";

      setSession(phone, {
        type: "awaiting_triage",
        invoiceId: result.invoiceId, vendor, amount, date,
        category, isDuplicate, isForeign, currency,
        amountMissing, catMissing,
      });

      await sendTwilioReply(from, buildTriageMenu(vendor, amount, date, category,
        isDuplicate, isForeign, currency, amountMissing, catMissing));
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
