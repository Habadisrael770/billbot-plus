// Gmail OAuth2 routes
// GET  /api/gmail-auth/url        → returns the Google OAuth URL
// GET  /api/gmail-auth/callback   → handles redirect from Google, stores tokens
// GET  /api/gmail-auth/status     → { connected, email, credentialsConfigured }
// POST /api/gmail-auth/disconnect → removes stored tokens
import { Router, type IRouter } from "express";
import {
  getGmailAuthUrl,
  getGoogleLoginUrl,
  handleGmailCallback,
  handleGoogleLoginCallback,
  getGmailStatus,
  disconnectGmail,
} from "../services/gmailOAuth.js";
import { setSessionCookie, requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

function getAppBaseUrl(req: Parameters<typeof router.get>[1] extends (req: infer R, ...args: any[]) => any ? R : never): string {
  // Prefer the host the user is actually on (billibot.net in production,
  // *.replit.dev in workspace) — that way the OAuth popup returns to the same
  // origin that opened it, and its session cookie is readable. Trust-proxy is
  // set on the app so this is the original public host, not the internal hop.
  const host = req.get("host");
  if (host) return `${req.protocol}://${host}`;
  // Fallback for code paths without a request object.
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

// ── Google Login URL (basic scopes — works for any Google account, no 403) ──
router.get("/login-url", (_req, res) => {
  try {
    const url = getGoogleLoginUrl();
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Gmail Scan URL (restricted scopes — for connecting inbox scanning) ─────
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
  // Handle Google returning an error (e.g. access_denied, admin_policy_enforced)
  const googleError = req.query["error"] as string | undefined;
  if (googleError) {
    const appBase = getAppBaseUrl(req);
    const isAdminBlock = googleError === "admin_policy_enforced";
    const isAccessDenied = googleError === "access_denied";
    let heMsg = "Google חסמה את הגישה לאפליקציה.";
    let hint  = "נסה חשבון Gmail אישי (לא Workspace/ארגוני), או פנה למנהל המערכת.";
    if (isAdminBlock) {
      heMsg = "מנהל ה-Google Workspace שלך חסם גישה לאפליקציות לא מאומתות.";
      hint  = "בקש ממנהל ה-IT שלך להוסיף את BillBOT+ לרשימת האפליקציות המאושרות.";
    } else if (isAccessDenied) {
      heMsg = "שגיאה 403: המייל שלך לא ברשימת המשתמשים המאושרים.";
      hint  = "יש להוסיף את כתובת המייל כ-Test User ב-Google Cloud Console.";
    }
    const fallbackUrl = `${appBase}/?gmail=error&msg=${encodeURIComponent(heMsg)}`;
    const consoleUrl  = "https://console.cloud.google.com/apis/credentials/consent";
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>שגיאת Gmail</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,sans-serif; background:#060c1e; color:#fff;
           min-height:100vh; display:flex; align-items:center; justify-content:center;
           text-align:center; padding:24px; }
    .card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,100,100,0.3);
            border-radius:20px; padding:36px 28px; max-width:400px; width:100%; }
    .icon { width:60px; height:60px; border-radius:50%;
            background:linear-gradient(135deg,#dc2626,#ef4444);
            display:flex; align-items:center; justify-content:center;
            margin:0 auto 18px; font-size:28px; }
    h2 { font-size:18px; font-weight:700; color:#f87171; margin-bottom:8px; }
    .msg { font-size:13px; color:rgba(255,255,255,0.55); margin-bottom:16px; line-height:1.5; }
    .steps { text-align:right; background:rgba(255,200,0,0.06); border:1px solid rgba(255,200,0,0.18);
             border-radius:12px; padding:14px 16px; margin-bottom:18px; }
    .steps-title { font-size:12px; font-weight:700; color:rgba(255,200,0,0.9); margin-bottom:8px; }
    .step { font-size:12px; color:rgba(255,255,255,0.55); margin-bottom:4px; line-height:1.5; }
    .step span { color:rgba(255,200,0,0.75); }
    .btns { display:flex; gap:10px; flex-direction:column; }
    .btn-primary { display:block; padding:11px 20px;
           background:linear-gradient(90deg,#4361ee,#2dd4bf); color:#fff;
           border-radius:12px; font-size:13px; font-weight:700;
           text-decoration:none; }
    .btn-back { display:block; padding:10px 20px;
           background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.6);
           border-radius:12px; font-size:13px; font-weight:600;
           text-decoration:none; border:1px solid rgba(255,255,255,0.12); }
    .code { font-size:10px; color:rgba(255,255,255,0.2); margin-top:14px; direction:ltr; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h2>גישה חסומה — שגיאה 403</h2>
    <p class="msg">${heMsg}</p>
    <div class="steps">
      <p class="steps-title">⚡ כך מתקנים (פחות מ-2 דקות):</p>
      <p class="step">1. לחץ "פתח Google Console" למטה</p>
      <p class="step">2. גלול ל-<span>Test users</span> → לחץ <span>+ Add Users</span></p>
      <p class="step">3. הכנס את כתובת המייל שרצית להתחבר איתה</p>
      <p class="step">4. לחץ <span>Save</span> וחכה 10 שניות</p>
      <p class="step">5. חזור לאפליקציה ונסה שוב</p>
    </div>
    <div class="btns">
      <a href="${consoleUrl}" target="_blank" rel="noopener" class="btn-primary">🔧 פתח Google Console</a>
      <a href="${fallbackUrl}" class="btn-back">← חזרה לאפליקציה</a>
    </div>
    <p class="code">error: ${googleError}${isAdminBlock ? " (admin_policy_enforced)" : ""}</p>
  </div>
  <script>
    var FALLBACK = ${JSON.stringify(fallbackUrl)};
    if (window.opener) {
      try { window.opener.postMessage({ type: 'GMAIL_ERROR', error: ${JSON.stringify(heMsg)} }, '*'); } catch(e) {}
    }
  </script>
</body>
</html>`);
    return;
  }

  const code  = req.query["code"]  as string | undefined;
  const state = req.query["state"] as string | undefined;
  if (!code) {
    res.status(400).send("חסר קוד אימות מ-Google");
    return;
  }
  // Route to correct handler based on state param
  const isLoginFlow = state === "login";
  try {
    const result = isLoginFlow
      ? await handleGoogleLoginCallback(code)
      : await handleGmailCallback(code);
    const email = result.email;
    // Set session cookie so the browser is now authenticated.
    if (result.id) {
      setSessionCookie(res, result.id);
    }
    const appBase = getAppBaseUrl(req);
    const emailEncoded = encodeURIComponent(email ?? "");
    const fallbackUrl = `${appBase}/?gmail=connected&email=${emailEncoded}`;

    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gmail מחובר</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #060c1e;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 340px;
      width: 100%;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #059669, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }
    h2 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .email { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 20px; direction: ltr; }
    .bar-wrap {
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #059669, #10b981);
      border-radius: 2px;
      transition: width 1.4s ease;
    }
    .hint { font-size: 12px; color: rgba(255,255,255,0.3); }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 24px;
      background: linear-gradient(90deg, #059669, #10b981);
      color: #fff;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>!Gmail מחובר</h2>
    <p class="email">${email}</p>
    <div class="bar-wrap"><div class="bar" id="bar"></div></div>
    <p class="hint" id="hint">חוזרים לאפליקציה...</p>
    <a href="${fallbackUrl}" class="btn" id="btn" style="display:none">חזרה לאפליקציה</a>
  </div>

  <script>
    var FALLBACK = ${JSON.stringify(fallbackUrl)};
    var EMAIL    = ${JSON.stringify(email)};

    // Kick off progress bar animation
    requestAnimationFrame(function() {
      document.getElementById('bar').style.width = '100%';
    });

    // Navigate this window (popup or main tab) to the app with ?gmail=connected.
    // The app (App.tsx) handles this param:
    //   - If window.opener exists → it's a popup → sends postMessage to opener then closes
    //   - If no opener → it's a main-window redirect → logs in directly
    window.location.replace(FALLBACK);
  </script>
</body>
</html>`);
  } catch (err) {
    const appBase = getAppBaseUrl(req);
    const errMsg = encodeURIComponent(String(err));
    const fallbackUrl = `${appBase}/?gmail=error&msg=${errMsg}`;

    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>שגיאת Gmail</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #060c1e;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 340px;
      width: 100%;
    }
    .icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #dc2626, #ef4444);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px; font-size: 32px;
    }
    h2 { font-size: 20px; font-weight: 700; color: #f87171; margin-bottom: 8px; }
    .msg { font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 20px; word-break: break-all; }
    .btn {
      display: inline-block; padding: 10px 24px;
      background: rgba(255,255,255,0.1); color: #fff;
      border-radius: 12px; font-size: 14px; font-weight: 600;
      text-decoration: none; border: 1px solid rgba(255,255,255,0.15);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h2>שגיאה בחיבור Gmail</h2>
    <p class="msg">${String(err)}</p>
    <a href="${fallbackUrl}" class="btn">חזרה לאפליקציה</a>
  </div>
  <script>
    var FALLBACK = ${JSON.stringify(fallbackUrl)};
    if (window.opener) {
      try { window.opener.postMessage({ type: 'GMAIL_ERROR', error: ${JSON.stringify(String(err))} }, '*'); } catch(e) {}
      setTimeout(function() { window.close(); }, 3000);
    } else {
      setTimeout(function() { window.location.replace(FALLBACK); }, 3000);
    }
  </script>
</body>
</html>`);
  }
});

// ── Status ─────────────────────────────────────────────────────────────────
// Requires a logged-in session (DB-validated via requireAuth) so a stale signed
// cookie for a deleted user cannot probe Gmail connection state.
router.get("/status", requireAuth, async (_req, res) => {
  try {
    const status = await getGmailStatus();
    res.json(status);
  } catch (err) {
    res.json({ connected: false, email: null, credentialsConfigured: false, error: String(err) });
  }
});

// ── Disconnect ─────────────────────────────────────────────────────────────
router.post("/disconnect", requireAuth, async (_req, res) => {
  try {
    await disconnectGmail();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
