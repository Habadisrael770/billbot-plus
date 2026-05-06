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

const router: IRouter = Router();

function getAppBaseUrl(req: Parameters<typeof router.get>[1] extends (req: infer R, ...args: any[]) => any ? R : never): string {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return `${req.protocol}://${req.get("host")}`;
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
      heMsg = "Google דחתה את הגישה — האפליקציה טרם עברה אימות Google.";
      hint  = "במסך הגוגל, לחץ 'מתקדם' → 'עבור ל-BillBOT+ (לא בטוח)' כדי להמשיך.";
    }
    const fallbackUrl = `${appBase}/?gmail=error&msg=${encodeURIComponent(heMsg)}`;
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
            border-radius:20px; padding:36px 28px; max-width:360px; width:100%; }
    .icon { width:60px; height:60px; border-radius:50%;
            background:linear-gradient(135deg,#dc2626,#ef4444);
            display:flex; align-items:center; justify-content:center;
            margin:0 auto 18px; font-size:28px; }
    h2 { font-size:18px; font-weight:700; color:#f87171; margin-bottom:10px; }
    .msg { font-size:13px; color:rgba(255,255,255,0.6); margin-bottom:12px; line-height:1.5; }
    .hint { font-size:12px; color:rgba(255,200,0,0.8); background:rgba(255,200,0,0.08);
            border:1px solid rgba(255,200,0,0.2); border-radius:10px;
            padding:10px 14px; margin-bottom:18px; line-height:1.5; text-align:right; }
    .btn { display:inline-block; padding:10px 24px;
           background:rgba(255,255,255,0.1); color:#fff;
           border-radius:12px; font-size:14px; font-weight:600;
           text-decoration:none; border:1px solid rgba(255,255,255,0.15); }
    .code { font-size:11px; color:rgba(255,255,255,0.25); margin-top:12px; direction:ltr; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h2>לא ניתן להתחבר ל-Gmail</h2>
    <p class="msg">${heMsg}</p>
    <p class="hint">💡 ${hint}</p>
    <a href="${fallbackUrl}" class="btn">חזרה לאפליקציה</a>
    <p class="code">google error: ${googleError}</p>
  </div>
  <script>
    var FALLBACK = ${JSON.stringify(fallbackUrl)};
    if (window.opener) {
      try { window.opener.postMessage({ type: 'GMAIL_ERROR', error: ${JSON.stringify(heMsg)} }, '*'); } catch(e) {}
      setTimeout(function() { window.close(); }, 4000);
    } else {
      setTimeout(function() { window.location.replace(FALLBACK); }, 4000);
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
    const email = isLoginFlow
      ? await handleGoogleLoginCallback(code)
      : await handleGmailCallback(code);
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
