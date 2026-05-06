import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { conversations, messages, chatMemories } from "@workspace/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { invoicesTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router: IRouter = Router();
const MODEL = "deepseek/deepseek-chat";

// ── System prompt ─────────────────────────────────────────────────────────
async function buildSystemPrompt(): Promise<string> {
  const today = new Date().toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  try {
    // Live invoice stats
    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(invoicesTable);
    const total = countRow?.count ?? 0;

    const [pendingRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoicesTable)
      .where(eq(invoicesTable.status, "pending_review"));
    const pending = pendingRow?.count ?? 0;

    const [dupRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoicesTable)
      .where(sql`${invoicesTable.duplicate_status} != 'unique'`);
    const duplicates = dupRow?.count ?? 0;

    // Recent invoices for context
    const recent = await db
      .select({
        vendor: invoicesTable.vendor_name,
        amount: invoicesTable.total_amount,
        currency: invoicesTable.currency,
        date: invoicesTable.invoice_date,
        category: invoicesTable.category,
        status: invoicesTable.status,
      })
      .from(invoicesTable)
      .orderBy(desc(invoicesTable.created_at))
      .limit(8);

    const recentBlock = recent.length > 0
      ? `\n== 8 חשבוניות אחרונות ==\n${recent.map((r) =>
          `• ${r.vendor ?? "—"} | ${r.amount ?? "?"} ${r.currency ?? "₪"} | ${r.date ?? "?"} | ${r.category ?? "ללא קטגוריה"} | ${r.status ?? ""}`
        ).join("\n")}`
      : "";

    // Memories
    const mems = await db.select().from(chatMemories).orderBy(desc(chatMemories.createdAt)).limit(30);
    const memBlock = mems.length > 0
      ? `\n== זיכרון קבוע על המשתמש ==\n${mems.map((m) => `• ${m.content}`).join("\n")}`
      : "";

    return `אתה BillBOT+ AI — עוזר עסקי חכם ומקצועי למערכת ניהול חשבוניות והוצאות לעסקים ישראלים.
השם שלך הוא "בילי" (Billy). אתה מדבר עברית תקנית, מקצועית, וידידותית — כמו יועץ כלכלי טוב.

== היום ==
${today}
${memBlock}
== נתוני המערכת כרגע ==
• סה"כ חשבוניות במאגר: ${total}
• ממתינות לאישור: ${pending}
• חשודות כפילות: ${duplicates}
${recentBlock}

== היכולות שלך ==
**ניתוח פיננסי:**
- ענה על שאלות על הוצאות, ספקים, קטגוריות, תקציבים
- זהה מגמות: "מה ספק ההוצאות הגדול שלי?" "כמה הוצאתי החודש?"
- הסבר אנומליות בנתונים

**מיסוי וחשבונאות ישראלית:**
- סיווג הוצאות לפי תקנות מס הכנסה ומע"מ (עסקאות חייבות/פטורות)
- הכרה בהוצאות: ארוחות עסקיות (80%), רכב (25%/67%), ייצוגיות (80%)
- הסבר על חשבונית עסקה מול חשבונית מס
- תזכורות לניכוי מס במקור

**ניהול החשבוניות:**
- עזרה בזיהוי כפילויות ומה לעשות איתן
- הסבר על סטטוסים (ממתין / מאושר / מסורב)
- ייצוא לרואה חשבון — מה לשלוח ואיך

**אינטגרציות:**
- Gmail: חיבור לסריקת חשבוניות מהאימייל
- Invoice4U: סנכרון עם מערכת הנהלת חשבונות
- Telegram: קבלת עדכונים על חשבוניות חדשות

**שאלות כלליות:**
- ענה על שאלות עסקיות כלליות (תקציב, ניהול, תזרים מזומנים)
- עזור לנסח מיילים לרואה חשבון, לספקים
- טיפים לייעול ניהול ההוצאות

== כללי תגובה ==
• **ענה תמיד בעברית** — גם אם שאלו באנגלית
• **היה תמציתי וממוקד** — אל תפרט יותר ממה שצריך
• **השתמש בנתוני המערכת** — אם יש מידע רלוונטי בנתונים למעלה, השתמש בו ראשון
• **כשאין לך נתון** — אמור בפירוש "אין לי גישה לנתון הזה, אבל..."
• **פורמט קריא** — השתמש ב-bullets, מספרים, headers כשמתאים
• **שמור על טון מקצועי-ידידותי** — לא יבש מדי, לא פארי מדי
• **אל תמציא נתונים** — אם אין לך מידע ספציפי, אמור זאת בכנות
• **זכרון:** אם המשתמש אומר פרטים חשובים על עסקו (שם עסק, ענף, שם, העדפות) — שמור אותם בזיכרון לשיחות הבאות`;
  } catch {
    return `אתה BillBOT+ AI — עוזר עסקי חכם למערכת ניהול חשבוניות לעסקים ישראלים. השם שלך הוא "בילי".
ענה תמיד בעברית, בצורה מקצועית וידידותית. היום: ${today}.`;
  }
}

// ── Memory extraction (async, non-blocking) ──────────────────────────────
async function extractAndSaveMemories(userText: string, assistantText: string): Promise<void> {
  try {
    const extractPrompt = `You are a memory extractor for an invoice management assistant.
Given the following conversation snippet, extract any NEW important facts about the USER that would be useful to remember in future sessions.
Examples: business name, industry, who their accountant is, preferences, recurring issues, their name.
Return ONLY a JSON array of short Hebrew strings (each under 80 chars). Return [] if nothing new to remember.
User: ${userText}
Assistant: ${assistantText}`;

    const resp = await openrouter.chat.completions.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: extractPrompt }],
      stream: false,
    });

    const raw = resp.choices[0]?.message?.content ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return;
    const facts: unknown[] = JSON.parse(match[0]);
    if (!Array.isArray(facts) || facts.length === 0) return;

    for (const fact of facts) {
      if (typeof fact === "string" && fact.trim().length > 3) {
        await db.insert(chatMemories).values({ content: fact.trim(), source: "extracted" });
      }
    }
  } catch { /* silent */ }
}

// ── Conversations CRUD ────────────────────────────────────────────────────
router.get("/conversations", async (_req, res) => {
  const list = await db.select().from(conversations).orderBy(sql`${conversations.createdAt} desc`);
  res.json(list);
});

router.post("/conversations", async (req, res) => {
  const { title } = req.body as { title?: string };
  const [conv] = await db.insert(conversations).values({ title: title ?? "שיחה חדשה" }).returning();
  res.status(201).json(conv);
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "לא נמצא" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

// ── Chat (SSE streaming) ──────────────────────────────────────────────────
router.post("/conversations/:id/messages", async (req, res) => {
  const convId = Number(req.params.id);
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "תוכן לא יכול להיות ריק" }); return; }

  await db.insert(messages).values({ conversationId: convId, role: "user", content: content.trim() });

  const history = await db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(asc(messages.createdAt));
  const systemPrompt = await buildSystemPrompt();
  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";
  try {
    const stream = await openrouter.chat.completions.create({ model: MODEL, max_tokens: 8192, messages: chatMessages, stream: true });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }
    if (fullResponse) {
      await db.insert(messages).values({ conversationId: convId, role: "assistant", content: fullResponse });
      // Extract memories in background (non-blocking)
      extractAndSaveMemories(content.trim(), fullResponse).catch(() => {});
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error("OpenRouter stream error:", err);
    res.write(`data: ${JSON.stringify({ error: "שגיאה בשרת AI" })}\n\n`);
  } finally {
    res.end();
  }
});

// ── Memories CRUD ─────────────────────────────────────────────────────────
router.get("/memories", async (_req, res) => {
  const mems = await db.select().from(chatMemories).orderBy(desc(chatMemories.createdAt));
  res.json(mems);
});

router.post("/memories", async (req, res) => {
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "תוכן חסר" }); return; }
  const [mem] = await db.insert(chatMemories).values({ content: content.trim(), source: "manual" }).returning();
  res.status(201).json(mem);
});

router.delete("/memories/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(chatMemories).where(eq(chatMemories.id, id));
  res.status(204).end();
});

router.delete("/memories", async (_req, res) => {
  await db.delete(chatMemories);
  res.status(204).end();
});

export default router;
