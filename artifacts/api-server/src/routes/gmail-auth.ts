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
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gmail Connected</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#060c1e;color:#fff">
      <div style="font-size:48px">✅</div>
      <h2 style="color:#2dd4bf">Gmail מחובר!</h2>
      <p style="color:#ffffff80">${email}</p>
      <p style="color:#ffffff50;font-size:13px">החלון ייסגר אוטומטית...</p>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'GMAIL_CONNECTED', email: ${JSON.stringify(email)} }, '*');
        }
        setTimeout(() => window.close(), 1500);
      </script>
    </body></html>`);
  } catch (err) {
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gmail Error</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#060c1e;color:#fff">
      <div style="font-size:48px">❌</div>
      <h2 style="color:#f87171">שגיאה בחיבור Gmail</h2>
      <p style="color:#ffffff80">${String(err)}</p>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'GMAIL_ERROR', error: ${JSON.stringify(String(err))} }, '*');
        }
        setTimeout(() => window.close(), 3000);
      </script>
    </body></html>`);
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
