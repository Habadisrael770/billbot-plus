// Session cookie authentication middleware.
//
// Cookie format: bb_sid=<userId>.<expiresAtMs>.<hmacSha256Hex>
// Signed with a server-only secret. HttpOnly, SameSite=Lax, Secure in production.
//
// Routes that need a logged-in user should mount `requireAuth`. The middleware
// rejects unauthenticated requests with 401 and sets `req.userId` / `req.userEmail`
// for downstream handlers.

import crypto from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "bb_sid";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

// ── Secret resolution ────────────────────────────────────────────────────────
let cachedSecret: string | null = null;
function getSessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  const explicit = process.env.SESSION_SECRET;
  if (explicit && explicit.length >= 16) {
    cachedSecret = explicit;
    return cachedSecret;
  }
  // In production we refuse to start without an explicit, sufficiently long
  // SESSION_SECRET. Falling back to other env secrets would couple session
  // forgery risk to credential leaks elsewhere.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production (min 16 chars).");
  }
  // Development only: generate an ephemeral per-process secret. Sessions will
  // be invalidated on restart, which is the right behaviour for local dev.
  console.warn("[auth] SESSION_SECRET not set — generating an ephemeral secret for development. Sessions will not survive restart.");
  cachedSecret = crypto.randomBytes(32).toString("hex");
  return cachedSecret;
}

// ── Sign / verify ────────────────────────────────────────────────────────────
function sign(userId: string, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  const mac = crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

function verify(token: string): { userId: string; expiresAt: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, mac] = parts as [string, string, string];
  const expected = crypto.createHmac("sha256", getSessionSecret()).update(`${userId}.${expiresAtStr}`).digest("hex");
  // Constant-time compare
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  if (!userId) return null;
  return { userId, expiresAt };
}

// ── Cookie helpers ───────────────────────────────────────────────────────────
function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

export function setSessionCookie(res: Response, userId: string): void {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = sign(userId, expiresAt);
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (isProd()) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export function clearSessionCookie(res: Response): void {
  const attrs = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (isProd()) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export function readSessionUserId(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const decoded = verify(token);
  return decoded ? decoded.userId : null;
}

// ── Middleware ───────────────────────────────────────────────────────────────
export const requireAuth: RequestHandler = async (req, res, next) => {
  const userId = readSessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: "נדרשת התחברות" });
    return;
  }
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "נדרשת התחברות" });
      return;
    }
    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (err) {
    console.error("[auth] requireAuth lookup failed", err);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
};

/** Optional auth — populates `req.userId` if a valid session exists, never blocks. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const userId = readSessionUserId(req);
  if (!userId) return next();
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (user) {
      req.userId = user.id;
      req.userEmail = user.email;
    }
  } catch {
    // ignore — optional
  }
  next();
};

export { COOKIE_NAME };
