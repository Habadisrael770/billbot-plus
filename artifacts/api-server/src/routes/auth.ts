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

// ── Upsert user from Google OAuth (called internally) ────────────────────────
export async function upsertGoogleUser(params: {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  googleId?: string | null;
}): Promise<void> {
  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, params.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    await db.update(usersTable).set({
      name:        params.name   ?? undefined,
      avatarUrl:   params.avatarUrl ?? undefined,
      googleId:    params.googleId  ?? undefined,
      lastLoginAt: new Date(),
      updatedAt:   new Date(),
    }).where(eq(usersTable.email, params.email.toLowerCase()));
  } else {
    await db.insert(usersTable).values({
      email:      params.email.toLowerCase(),
      name:       params.name      ?? null,
      avatarUrl:  params.avatarUrl ?? null,
      googleId:   params.googleId  ?? null,
      lastLoginAt: new Date(),
    });
  }
}

export default router;
