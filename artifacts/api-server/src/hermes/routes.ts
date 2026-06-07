/**
 * Hermes Routes — Hermes Starter Kit (BillBOT+ adaptation)
 *
 * Exposes the Hermes chat API as an Express Router. Mount it under "/hermes"
 * inside the main /api router so the public contract is:
 *   GET  /api/hermes/health
 *   GET  /api/hermes/credits
 *   POST /api/hermes/message
 *   GET  /api/hermes/admin/credits
 *   POST /api/hermes/admin/credits/:userId/grant
 *
 * `resolveUser(req)` wires this to the app's cookie-session auth and must
 * return { id: string; isAdmin: boolean } | null (null rejects as 401/403).
 *
 * ENV VARS REQUIRED (Replit Secrets):
 *   HERMES_BRIDGE_URL    — https://your-bridge.domain.com
 *   HERMES_BRIDGE_TOKEN  — secret bearer token
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { checkHealth, sendMessage, isHermesConfigured } from "./client.js";
import { makeCreditsService } from "./credits.service.js";

// ── ✏️  System prompts — BillBOT+ (Hebrew invoice automation SaaS) ───────────

function buildSystemPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    // Admins get full access — no topic restrictions.
    return `אתה הרמס, עוזר AI המשולב בתוך BillBOT+ — מערכת ישראלית לניהול וסריקה אוטומטית של חשבוניות והוצאות לעסקים.
עזור למנהל המערכת בכל שאלה על הפלטפורמה, הנתונים, החשבוניות, הספקים, האוטומציות והתפעול.
ענה תמיד באותה שפה שבה המשתמש כותב (בדרך כלל עברית).`;
  }

  // Regular users get a scoped prompt — restricted to the BillBOT+ domain.
  return `אתה הרמס, עוזר AI המשולב בתוך BillBOT+ — מערכת ישראלית לניהול וסריקה אוטומטית של חשבוניות והוצאות לעסקים.
המטרה היחידה שלך היא לעזור למשתמשים בנושאים הקשורים ל-BillBOT+: חשבוניות, הוצאות, ספקים, סריקת מיילים, ייצוא לרואה חשבון, אינטגרציות ואוטומציות.

כללים מחייבים:
1. סרב לכל שאלה שאינה קשורה ל-BillBOT+ ולניהול חשבוניות והוצאות.
2. לשאלות לא רלוונטיות השב: "אני יכול לעזור רק בשאלות על BillBOT+."
3. ענה תמיד באותה שפה שבה המשתמש כותב (בדרך כלל עברית).`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResolvedUser {
  id: string;
  isAdmin: boolean;
}

export type ResolveUserFn = (req: Request) => Promise<ResolvedUser | null> | ResolvedUser | null;

// ── Router factory ────────────────────────────────────────────────────────────

export function createHermesRouter(resolveUser: ResolveUserFn): IRouter {
  const router: IRouter = Router();
  const credits = makeCreditsService();

  // ── Health check (public) ──────────────────────────────────────────────────
  router.get("/health", async (_req: Request, res: Response) => {
    if (!isHermesConfigured()) {
      return res.status(503).json({ ok: false, configured: false, error: "Hermes bridge not configured." });
    }
    const result = await checkHealth();
    if (!result.ok) {
      return res.status(result.status >= 400 ? result.status : 502)
        .json({ ok: false, configured: true, error: result.error });
    }
    return res.json({ ok: true, configured: true, hermes: result.data ?? null });
  });

  // ── Get credit balance ─────────────────────────────────────────────────────
  router.get("/credits", async (req: Request, res: Response) => {
    const caller = await resolveUser(req);
    if (!caller) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const balance = await credits.getOrCreateCredits(caller.id, caller.isAdmin);
    const history = await credits.getCreditHistory(caller.id, 20);
    return res.json({ ok: true, balance, history });
  });

  // ── Send message ───────────────────────────────────────────────────────────
  router.post("/message", async (req: Request, res: Response) => {
    if (!isHermesConfigured()) {
      return res.status(503).json({ ok: false, error: "Hermes bridge not configured." });
    }

    const caller = await resolveUser(req);
    if (!caller) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const { message, conversationId } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ ok: false, error: "message is required" });
    }
    if (message.length > 4000) {
      return res.status(400).json({ ok: false, error: "message too long (max 4000 chars)" });
    }

    // Credit check
    const balance = await credits.getOrCreateCredits(caller.id, caller.isAdmin);
    if (balance <= 0) {
      return res.status(402).json({ ok: false, error: "no_credits", balance: 0 });
    }

    // Deduct (admins are never decremented)
    const deduct = await credits.deductCredit(caller.id, message.slice(0, 100), caller.isAdmin);
    if (!deduct.ok) {
      return res.status(402).json({ ok: false, error: "no_credits", balance: deduct.balance });
    }

    // Build system-augmented message
    const systemPrompt = buildSystemPrompt(caller.isAdmin);
    const fullMessage = `[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n\n[USER MESSAGE]\n${message.trim()}`;

    const result = await sendMessage({
      message: fullMessage,
      conversationId: typeof conversationId === "string" ? conversationId : undefined,
    });

    if (!result.ok) {
      // Refund on bridge error
      await credits.grantCredits(caller.id, 1, "refund", "bridge_error");
      return res.status(result.status >= 400 ? result.status : 502)
        .json({ ok: false, error: result.error });
    }

    return res.json({
      ok: true,
      reply: (result.data as any)?.reply ?? null,
      balance: deduct.balance,
    });
  });

  // ── Admin: list all credit accounts ───────────────────────────────────────
  router.get("/admin/credits", async (req: Request, res: Response) => {
    const caller = await resolveUser(req);
    if (!caller?.isAdmin) return res.status(403).json({ ok: false, error: "Forbidden" });
    const accounts = await credits.getAllCreditAccounts();
    return res.json({ ok: true, accounts });
  });

  // ── Admin: grant credits to a user ────────────────────────────────────────
  router.post("/admin/credits/:userId/grant", async (req: Request, res: Response) => {
    const caller = await resolveUser(req);
    if (!caller?.isAdmin) return res.status(403).json({ ok: false, error: "Forbidden" });

    const userId = req.params.userId as string;
    const { amount, note } = req.body ?? {};
    if (!amount || typeof amount !== "number" || amount < 1 || amount > 100_000) {
      return res.status(400).json({ ok: false, error: "amount must be 1–100000" });
    }
    const result = await credits.grantCredits(userId, amount, "admin_grant", note ?? `Granted by admin`);
    return res.json(result);
  });

  return router;
}
