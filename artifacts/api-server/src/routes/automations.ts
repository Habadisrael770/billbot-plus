import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { automationsTable, usersTable } from "@workspace/db/schema";
import { eq, and, lte } from "drizzle-orm";
import {
  sendEmailNotification,
  sendWhatsAppNotification,
  sendTelegramNotification,
} from "../services/notificationService.js";

const router: IRouter = Router();

// ── Schedule helpers ──────────────────────────────────────────────────────────
function calculateNextRun(
  scheduleType: string,
  scheduleDay: number,
  scheduleHour: number,
  scheduleMinute = 0,
  scheduleDate?: string | null,
): Date {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  let next    = new Date();

  if (scheduleType === "one_time") {
    // Parse the target date from scheduleDate (YYYY-MM-DD) + scheduleHour + scheduleMinute
    if (scheduleDate) {
      const [y, m, d] = scheduleDate.split("-").map(Number);
      next = new Date(y, m - 1, d, scheduleHour, scheduleMinute, 0, 0);
    } else {
      // Fallback: 1 minute from now
      next = new Date(now.getTime() + 60 * 1000);
    }
  } else if (scheduleType === "end_of_month") {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const target  = Math.max(1, lastDay - (scheduleDay - 1));
    next = new Date(year, month, target, scheduleHour, scheduleMinute, 0, 0);
    if (next <= now) {
      const nm  = month + 1 > 11 ? 0        : month + 1;
      const ny  = month + 1 > 11 ? year + 1 : year;
      const nld = new Date(ny, nm + 1, 0).getDate();
      next = new Date(ny, nm, Math.max(1, nld - (scheduleDay - 1)), scheduleHour, scheduleMinute, 0, 0);
    }
  } else if (scheduleType === "start_of_month") {
    next = new Date(year, month, 1, scheduleHour, scheduleMinute, 0, 0);
    if (next <= now) next = new Date(year, month + 1, 1, scheduleHour, scheduleMinute, 0, 0);
  } else {
    next = new Date(year, month, scheduleDay || 1, scheduleHour, scheduleMinute, 0, 0);
    if (next <= now) next = new Date(year, month + 1, scheduleDay || 1, scheduleHour, scheduleMinute, 0, 0);
  }

  return next;
}

function buildMessage(template: string, user: { name: string | null; email: string }): string {
  const now = new Date();
  const monthHe = now.toLocaleDateString("he-IL", { month: "long" });
  const yearNum  = now.getFullYear();
  const firstName = user.name?.trim().split(/\s+/)[0] ?? "";
  return template
    .replace(/\{\{שם\}\}/g,    firstName)
    .replace(/\{\{חודש\}\}/g,   monthHe)
    .replace(/\{\{שנה\}\}/g,    String(yearNum))
    .replace(/\{\{מייל\}\}/g,   user.email);
}

async function getUserByEmail(email: string) {
  const [user] = await db
    .select({
      id:             usersTable.id,
      email:          usersTable.email,
      name:           usersTable.name,
      whatsappPhone:  usersTable.whatsappPhone,
      telegramChatId: usersTable.telegramChatId,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);
  return user ?? null;
}

async function runAutomation(
  automation: typeof automationsTable.$inferSelect,
  user: { id: string; email: string; name: string | null; whatsappPhone: string | null; telegramChatId: string | null }
): Promise<{ sent: string[]; errors: string[] }> {
  const channels: string[] = JSON.parse(automation.channels || '["email"]');
  const message = buildMessage(automation.message, user);
  const sent: string[] = [];
  const errors: string[] = [];

  for (const channel of channels) {
    if (channel === "email") {
      const r = await sendEmailNotification(
        user.email,
        `BillBOT+ — ${automation.name}`,
        message
      );
      if (r.ok) sent.push("email");
      else errors.push(`email: ${r.error}`);
    }
    if (channel === "whatsapp" && user.whatsappPhone) {
      const r = await sendWhatsAppNotification(user.whatsappPhone, message);
      if (r.ok) sent.push("whatsapp");
      else errors.push(`whatsapp: ${r.error}`);
    }
    if (channel === "telegram" && user.telegramChatId) {
      const r = await sendTelegramNotification(user.telegramChatId, message);
      if (r.ok) sent.push("telegram");
      else errors.push(`telegram: ${r.error}`);
    }
  }

  const now = new Date();
  const isOneTime = automation.scheduleType === "one_time";
  await db
    .update(automationsTable)
    .set({
      lastRunAt: now,
      nextRunAt: isOneTime ? null : calculateNextRun(
        automation.scheduleType, automation.scheduleDay, automation.scheduleHour,
        automation.scheduleMinute ?? 0, automation.scheduleDate,
      ),
      isActive:  isOneTime ? false : automation.isActive,
      updatedAt: now,
    })
    .where(eq(automationsTable.id, automation.id));

  return { sent, errors };
}

// ── Background scheduler (runs every 5 min) ───────────────────────────────────
async function tickScheduler() {
  try {
    const now = new Date();
    const due = await db
      .select()
      .from(automationsTable)
      .where(
        and(
          eq(automationsTable.isActive, true),
          lte(automationsTable.nextRunAt, now)
        )
      )
      .limit(20);

    for (const automation of due) {
      const [user] = await db
        .select({
          id: usersTable.id, email: usersTable.email, name: usersTable.name,
          whatsappPhone: usersTable.whatsappPhone, telegramChatId: usersTable.telegramChatId,
        })
        .from(usersTable)
        .where(eq(usersTable.id, automation.userId))
        .limit(1);

      if (!user) continue;
      await runAutomation(automation, user);
      console.log(`[Automations] Ran "${automation.name}" for ${user.email}`);
    }
  } catch (err) {
    console.error("[Automations] Scheduler error:", err);
  }
}

setInterval(tickScheduler, 5 * 60 * 1000);

// ── GET /api/automations?email=... ────────────────────────────────────────────
router.get("/", async (req, res) => {
  const email = String(req.query.email ?? "");
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const user = await getUserByEmail(email);
  if (!user) { res.json([]); return; }
  const rows = await db
    .select()
    .from(automationsTable)
    .where(eq(automationsTable.userId, user.id))
    .orderBy(automationsTable.createdAt);
  res.json(rows);
});

// ── POST /api/automations ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { email, name, message, channels, scheduleType, scheduleDay, scheduleHour, scheduleMinute, scheduleDate } = req.body as {
    email: string; name: string; message: string; channels: string[];
    scheduleType: string; scheduleDay: number; scheduleHour: number;
    scheduleMinute?: number; scheduleDate?: string;
  };
  if (!email || !name || !message) { res.status(400).json({ error: "email, name, message required" }); return; }
  const user = await getUserByEmail(email);
  if (!user) { res.status(404).json({ error: "user not found" }); return; }

  const sType   = scheduleType   || "end_of_month";
  const sDay    = Number(scheduleDay)    || 1;
  const sHour   = Number(scheduleHour)   || 9;
  const sMinute = Number(scheduleMinute) || 0;
  const sDate   = scheduleDate || null;
  const nextRun = calculateNextRun(sType, sDay, sHour, sMinute, sDate);

  const [created] = await db
    .insert(automationsTable)
    .values({
      userId:         user.id,
      name:           name.trim(),
      message:        message.trim(),
      channels:       JSON.stringify(channels?.length ? channels : ["email"]),
      scheduleType:   sType,
      scheduleDay:    sDay,
      scheduleHour:   sHour,
      scheduleMinute: sMinute,
      scheduleDate:   sDate,
      isActive:       true,
      nextRunAt:      nextRun,
    })
    .returning();

  res.json(created);
});

// ── PATCH /api/automations/:id ────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, message, channels, scheduleType, scheduleDay, scheduleHour, scheduleMinute, scheduleDate, isActive } = req.body as {
    name?: string; message?: string; channels?: string[]; scheduleType?: string;
    scheduleDay?: number; scheduleHour?: number; scheduleMinute?: number;
    scheduleDate?: string; isActive?: boolean;
  };

  const updates: Partial<typeof automationsTable.$inferInsert> = { updatedAt: new Date() };
  if (name           !== undefined) updates.name           = name;
  if (message        !== undefined) updates.message        = message;
  if (channels       !== undefined) updates.channels       = JSON.stringify(channels);
  if (scheduleType   !== undefined) updates.scheduleType   = scheduleType;
  if (scheduleDay    !== undefined) updates.scheduleDay    = scheduleDay;
  if (scheduleHour   !== undefined) updates.scheduleHour   = scheduleHour;
  if (scheduleMinute !== undefined) updates.scheduleMinute = scheduleMinute;
  if (scheduleDate   !== undefined) updates.scheduleDate   = scheduleDate;
  if (isActive       !== undefined) updates.isActive       = isActive;

  // Recalculate nextRunAt when any schedule field changed
  const scheduleChanged = scheduleType !== undefined || scheduleDay !== undefined ||
    scheduleHour !== undefined || scheduleMinute !== undefined || scheduleDate !== undefined;
  if (scheduleChanged) {
    const [existing] = await db.select().from(automationsTable).where(eq(automationsTable.id, id)).limit(1);
    if (existing) {
      const sType   = scheduleType   ?? existing.scheduleType;
      const sDay    = scheduleDay    ?? existing.scheduleDay;
      const sHour   = scheduleHour   ?? existing.scheduleHour;
      const sMin    = scheduleMinute ?? existing.scheduleMinute ?? 0;
      const sDate   = scheduleDate   ?? existing.scheduleDate;
      updates.nextRunAt = sType === "one_time" && existing.lastRunAt
        ? null
        : calculateNextRun(sType, sDay, sHour, sMin, sDate);
    }
  }

  const [updated] = await db
    .update(automationsTable)
    .set(updates)
    .where(eq(automationsTable.id, id))
    .returning();

  res.json(updated);
});

// ── DELETE /api/automations/:id ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  await db.delete(automationsTable).where(eq(automationsTable.id, req.params.id));
  res.json({ ok: true });
});

// ── POST /api/automations/:id/send-now ───────────────────────────────────────
router.post("/:id/send-now", async (req, res) => {
  const email = String(req.body.email ?? req.query.email ?? "");
  const [automation] = await db
    .select()
    .from(automationsTable)
    .where(eq(automationsTable.id, req.params.id))
    .limit(1);
  if (!automation) { res.status(404).json({ error: "not found" }); return; }

  const user = await getUserByEmail(email);
  if (!user) { res.status(404).json({ error: "user not found" }); return; }

  const result = await runAutomation(automation, user);
  res.json({ ok: true, ...result });
});

// ── POST /api/automations/seed-defaults ──────────────────────────────────────
router.post("/seed-defaults", async (req, res) => {
  const email = String(req.body.email ?? "");
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const user = await getUserByEmail(email);
  if (!user) { res.status(404).json({ error: "user not found" }); return; }

  const existing = await db
    .select({ id: automationsTable.id })
    .from(automationsTable)
    .where(eq(automationsTable.userId, user.id))
    .limit(1);

  if (existing.length > 0) { res.json({ ok: true, seeded: false }); return; }

  const nextRun = calculateNextRun("end_of_month", 1, 9);
  await db.insert(automationsTable).values({
    userId:       user.id,
    name:         "תזכורת חשבוניות חודשית",
    message:      "שלום {{שם}},\n\nלקראת סוף חודש {{חודש}} — האם העברת אליי את כל החשבוניות? 📋\n\nאם יש חשבוניות שטרם נקלטו, ניתן להעלות אותן כעת דרך WhatsApp, Telegram או מהאפליקציה.\n\nBillBOT+ 🤖",
    channels:     JSON.stringify(["email"]),
    scheduleType: "end_of_month",
    scheduleDay:  1,
    scheduleHour: 9,
    isActive:     true,
    nextRunAt:    nextRun,
  });

  res.json({ ok: true, seeded: true });
});

export default router;
