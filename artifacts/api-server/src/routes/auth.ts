// Auth routes: register, login, me, logout
// POST /api/auth/register  { email, password, name? }
// POST /api/auth/login     { email, password }
// GET  /api/auth/me        → current user (from session cookie)
// POST /api/auth/logout    → clear session

import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Password helpers (PBKDF2 — no extra deps) ────────────────────────────────
function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 310_000, 32, "sha256", (err, key) => {
      if (err) return reject(err);
      resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return resolve(false);
    crypto.pbkdf2(password, salt, 310_000, 32, "sha256", (err, key) => {
      if (err) return reject(err);
      resolve(key.toString("hex") === hash);
    });
  });
}

// ── Register ─────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password) {
    res.status(400).json({ error: "נדרשים אימייל וסיסמה" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "כתובת אימייל לא תקינה" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים" });
    return;
  }

  try {
    const existing = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "כתובת אימייל זו כבר רשומה במערכת" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      email:        email.toLowerCase().trim(),
      passwordHash,
      name:         name?.trim() || null,
      lastLoginAt:  new Date(),
    }).returning();

    res.json({ ok: true, email: user!.email, name: user!.name });
  } catch (err) {
    console.error("[auth/register]", err);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

// ── Login ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "נדרשים אימייל וסיסמה" });
    return;
  }

  try {
    const [user] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "אימייל או סיסמה שגויים" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "אימייל או סיסמה שגויים" });
      return;
    }

    // Update last login
    await db.update(usersTable)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));

    res.json({ ok: true, email: user.email, name: user.name });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

// ── WhatsApp phone registration ──────────────────────────────────────────────
/** Normalize phone: strip +, spaces, dashes → e.g. "972501234567" */
function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-().+]/g, "");
  if (p.startsWith("0") && p.length === 10) p = "972" + p.slice(1); // Israeli local
  return p;
}

router.get("/whatsapp-phone", async (req, res) => {
  const email = (req.query.email as string | undefined)?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "נדרש email" });
  try {
    const [user] = await db.select({ whatsappPhone: usersTable.whatsappPhone })
      .from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return res.json({ phone: user?.whatsappPhone ?? null });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/whatsapp-phone", async (req, res) => {
  const { email, phone } = req.body as { email?: string; phone?: string };
  if (!email || !phone) return res.status(400).json({ error: "נדרשים email ו-phone" });
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return res.status(400).json({ error: "מספר טלפון לא תקין" });
  try {
    // Check if phone taken by another user
    const existing = await db.select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.whatsappPhone, normalized)).limit(1);
    if (existing.length > 0 && existing[0]!.email !== email.toLowerCase().trim()) {
      return res.status(409).json({ error: "מספר זה כבר רשום למשתמש אחר" });
    }
    await db.update(usersTable)
      .set({ whatsappPhone: normalized, updatedAt: new Date() })
      .where(eq(usersTable.email, email.toLowerCase().trim()));
    return res.json({ ok: true, phone: normalized });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/whatsapp-phone", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "נדרש email" });
  try {
    await db.update(usersTable)
      .set({ whatsappPhone: null, updatedAt: new Date() })
      .where(eq(usersTable.email, email.toLowerCase().trim()));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// upsertGoogleUser lives in userService.ts to avoid circular imports
export { upsertGoogleUser } from "../services/userService.js";

export default router;
