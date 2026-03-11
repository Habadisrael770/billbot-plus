import { Router, type IRouter } from "express";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { invoicesTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const MODEL = "deepseek/deepseek-chat";

// System prompt with invoice context + skills
async function buildSystemPrompt(): Promise<string> {
  try {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoicesTable);
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

    return `אתה עוזר AI חכם למערכת ניהול חשבוניות בעברית. השם שלך הוא "אינבוי".

== נתוני מערכת נוכחיים ==
- סה"כ חשבוניות: ${total}
- ממתינות לאישור: ${pending}
- חשודות כפילות: ${duplicates}

== Skills (יכולות) ==
1. ניתוח חשבוניות: תוכל לענות על שאלות לגבי חשבוניות, ספקים, קטגוריות
2. זיהוי כפילויות: הסבר מה לעשות עם חשבוניות כפולות
3. ייצוא לרו"ח: הסבר איך לשלוח לרואה חשבון
4. חיבורי מייל: הסבר איך לחבר Gmail/Outlook
5. קטגוריות: עזרה בסיווג הוצאות לפי תקנות המס בישראל

== כללי עבודה ==
- ענה תמיד בעברית
- היה ממוקד ותמציתי
- אם שואלים על נתון ספציפי שאין לך גישה אליו, אמור זאת בצורה ברורה
- הצע פעולות רלוונטיות במערכת כשרלוונטי`;
  } catch {
    return `אתה עוזר AI למערכת ניהול חשבוניות. ענה תמיד בעברית.`;
  }
}

// GET /openrouter/conversations
router.get("/conversations", async (_req, res) => {
  const list = await db
    .select()
    .from(conversations)
    .orderBy(sql`${conversations.createdAt} desc`);
  res.json(list);
});

// POST /openrouter/conversations
router.post("/conversations", async (req, res) => {
  const { title } = req.body as { title?: string };
  const [conv] = await db
    .insert(conversations)
    .values({ title: title ?? "שיחה חדשה" })
    .returning();
  res.status(201).json(conv);
});

// GET /openrouter/conversations/:id
router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "לא נמצא" }); return; }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

// DELETE /openrouter/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

// GET /openrouter/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

// POST /openrouter/conversations/:id/messages  (SSE streaming)
router.post("/conversations/:id/messages", async (req, res) => {
  const convId = Number(req.params.id);
  const { content } = req.body as { content?: string };

  if (!content?.trim()) {
    res.status(400).json({ error: "תוכן לא יכול להיות ריק" });
    return;
  }

  // Save user message
  await db.insert(messages).values({ conversationId: convId, role: "user", content: content.trim() });

  // Load chat history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt));

  const systemPrompt = await buildSystemPrompt();

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";
  try {
    const stream = await openrouter.chat.completions.create({
      model: MODEL,
      max_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    // Save assistant response
    if (fullResponse) {
      await db.insert(messages).values({ conversationId: convId, role: "assistant", content: fullResponse });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error("OpenRouter stream error:", err);
    res.write(`data: ${JSON.stringify({ error: "שגיאה בשרת AI" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
