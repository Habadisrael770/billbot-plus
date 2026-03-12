// Gmail OAuth2 routes
// GET  /api/gmail-auth/url        → returns the Google OAuth URL
// GET  /api/gmail-auth/callback   → handles redirect from Google, stores tokens
// GET  /api/gmail-auth/status     → { connected, email, credentialsConfigured }
// POST /api/gmail-auth/disconnect → removes stored tokens
import { Router, type IRouter } from "express";
import {
  getGmailAuthUrl,
  handleGmailCallback,
  getGmailStatus,
  disconnectGmail,
} from "../services/gmailOAuth.js";

const router: IRouter = Router();

// ── Redirect URL ───────────────────────────────────────────────────────────
router.get("/url", (_req, res) => {
  try {
    const url = getGmailAuthUrl();
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── OAuth callback from Google ─────────────────────────────────────────────
router.get("/callback", async (req, res) => {
  const code = req.query["code"] as string | undefined;
  if (!code) {
    res.status(400).send("חסר קוד אימות מ-Google");
    return;
  }
  try {
    const email = await handleGmailCallback(code);
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
    const frontendBase = domain ? `https://${domain}` : "http://localhost:19180";
    res.redirect(`${frontendBase}/?gmail=connected&email=${encodeURIComponent(email)}`);
  } catch (err) {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
    const frontendBase = domain ? `https://${domain}` : "http://localhost:19180";
    res.redirect(`${frontendBase}/?gmail=error&msg=${encodeURIComponent(String(err))}`);
  }
});

// ── Status ─────────────────────────────────────────────────────────────────
router.get("/status", async (_req, res) => {
  try {
    const status = await getGmailStatus();
    res.json(status);
  } catch (err) {
    res.json({ connected: false, email: null, credentialsConfigured: false, error: String(err) });
  }
});

// ── Disconnect ─────────────────────────────────────────────────────────────
router.post("/disconnect", async (_req, res) => {
  try {
    await disconnectGmail();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
