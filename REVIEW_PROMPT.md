# BillBOT+ — Code Review & Problem Analysis Request

## Project Overview

**BillBOT+** is a Hebrew-language invoice-automation SaaS running on Replit (pnpm monorepo).
Live domain: **billibot.net**

**Stack:**
- `artifacts/api-server` — Express + TypeScript API, PostgreSQL (Drizzle ORM), port 8080, served at `/api`
- `artifacts/invoice-dashboard` — React 19 + Vite + Tailwind frontend, served at `/`
- `artifacts/loyalty-club` — React 19 + Vite loyalty portal, served at `/loyalty-club/`
- Replit autoscale deployment, `router = "application"` in `.replit`

**Env secrets available:** `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ID`
**Replit integration installed:** `google-mail==1.0.0` (verified, healthy, has access_token)

---

## Issue #1 — Google OAuth: Gmail Connect Blocked on Production (CRITICAL)

### Symptom
On billibot.net (production), clicking "Connect Gmail" opens a Google OAuth popup.
Google immediately rejects it with:

> **"Access blocked: billibot.net's Google verification process is incomplete"**

The UI spinner then hangs indefinitely ("thinking loop") until the user manually closes the popup.

### Root Cause
The app uses **two separate Google OAuth flows**:

**Flow A — Login** (`/api/gmail-auth/login-url`) — uses basic scopes, works fine:
```typescript
// artifacts/api-server/src/services/gmailOAuth.ts
const LOGIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function getGoogleLoginUrl(): string {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: "online",
    scope: LOGIN_SCOPES,
    prompt: "select_account",
    state: "login",
  });
}
```

**Flow B — Gmail Scan** (`/api/gmail-auth/url`) — uses RESTRICTED scopes, blocked on prod:
```typescript
// artifacts/api-server/src/services/gmailOAuth.ts
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",  // RESTRICTED
  "https://www.googleapis.com/auth/gmail.send",       // RESTRICTED
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function getGmailAuthUrl(): string {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "select_account consent",
  });
}
```

`gmail.readonly` and `gmail.send` are **Google-restricted scopes** requiring a full security assessment (CASA) for production. This takes weeks and costs money for individual developers.

### OAuth Client Config
```typescript
function getOAuth2Client() {
  const clientId     = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = getRedirectUri();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}/api/gmail-auth/callback`;
  return "http://localhost:8080/api/gmail-auth/callback";
}
// GOOGLE_REDIRECT_URI is hardcoded in .replit as: https://billibot.net/api/gmail-auth/callback
```

### The Spinner Never Stops (Frontend Bug)
The onboarding page sets `connecting = true` when the popup opens, then clears it only when the popup closes (`popup.closed` polling). But when Google shows its own "Access blocked" page, the popup stays open on Google's domain → `popup.closed` never becomes true → spinner spins forever.

```typescript
// artifacts/invoice-dashboard/src/pages/onboarding.tsx (BEFORE fix)
const openUrlSafely = (url: string) => {
  const popup = window.open(url, "gmail-onboard", `width=${w},height=${h},...`);
  if (!popup) { /* fallback */ } else {
    const interval = setInterval(() => {
      // polls localStorage for GMAIL_CONNECTED result
      if (popup.closed) { clearInterval(interval); setConnecting(false); }
    }, 500);
    // NO TIMEOUT — hangs forever if popup stays open on Google's block page
  }
};
```

### Existing Workaround (Replit Integration)
The backend already supports the **Replit `google-mail` integration** as a fallback.
This integration is Google-verified, has no scope restrictions, and is confirmed healthy:

```typescript
// artifacts/api-server/src/services/gmailClient.ts
export async function getUncachableGmailClient() {
  connectionSettings = null; // always fetch fresh token
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function isGmailConnected(): Promise<boolean> {
  try { await getAccessToken(); return true; } catch { return false; }
}
```

```typescript
// artifacts/api-server/src/services/gmailOAuth.ts
export async function getAllGmailClients() {
  const rows = await db.select().from(gmailTokens);
  const clients = rows.map(buildGmailClientFromRow);
  const dbEmails = new Set(rows.map(r => r.email));

  // Try Replit google-mail integration as additional/fallback source
  // (already verified by Google — no restricted-scope issues)
  try {
    const { getUncachableGmailClient, isGmailConnected } = await import("./gmailClient.js");
    if (await isGmailConnected()) {
      const replitClient = await getUncachableGmailClient();
      const profile = await replitClient.users.getProfile({ userId: "me" });
      const replitEmail = profile.data.emailAddress ?? "replit-integration";
      if (!dbEmails.has(replitEmail)) {
        clients.push({ client: replitClient, email: replitEmail });
      }
    }
  } catch { /* Replit integration not available — fine */ }

  if (clients.length === 0) throw new Error("Gmail not connected");
  return clients;
}
```

So `/api/gmail-auth/status` already returns `{ connected: true }` when the Replit integration is active — no restricted OAuth needed.

### Current Partial Fix (not yet fully deployed to production)
```typescript
// artifacts/invoice-dashboard/src/pages/onboarding.tsx (AFTER fix)

// 1. On mount: auto-detect existing Gmail connection
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/status`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json() as { connected?: boolean; email?: string | null };
      if (!cancelled && data.connected) {
        setGmailConnected(true);
        setGmailEmail(data.email ?? "");
      }
    } catch {}
  })();
  return () => { cancelled = true; };
}, []);

// 2. handleConnectGmail: check status first, skip popup if already connected
const handleConnectGmail = async () => {
  setConnecting(true);
  const safety = setTimeout(() => setConnecting(false), 120000); // 2-min safety net
  try {
    try {
      const st = await fetch(`${API_BASE}/gmail-auth/status`, { credentials: "include" });
      if (st.ok) {
        const sd = await st.json() as { connected?: boolean; email?: string | null };
        if (sd.connected) {
          setGmailConnected(true);
          setGmailEmail(sd.email ?? "");
          setConnecting(false);
          clearTimeout(safety);
          return;
        }
      }
    } catch {}
    // fall through to OAuth popup
    const res  = await fetch(`${API_BASE}/gmail-auth/url`);
    const data = await res.json() as { url?: string };
    if (data.url) openUrlSafely(data.url);
    else { setGmailConnected(true); setGmailEmail("demo@billbot.co.il"); setConnecting(false); clearTimeout(safety); }
  } catch { setConnecting(false); clearTimeout(safety); }
};
```

### Problem: Fix Not Reaching Production
The production build hash is `index-DgtHVgV8.js` after multiple publish attempts.
The fix was committed (`b313d79`) but the deployed build hasn't changed.

`dist/` is in `.gitignore`. The `artifact.toml` build config:
```toml
[services.production]
build = ["pnpm", "--filter", "@workspace/invoice-dashboard", "run", "build"]
publicDir = "artifacts/invoice-dashboard/dist/public"
serve = "static"
```

A local build confirms the new hash would be `index-BXodcUOC.js`. The deployment appears to be using a cached build and ignoring source changes.

### Other Entry Points with Same Issue
The Gmail connect popup is opened from **4 places** — the fix above only covers `onboarding.tsx`:
- `artifacts/invoice-dashboard/src/pages/onboarding.tsx` — ✅ fixed (not yet deployed)
- `artifacts/invoice-dashboard/src/pages/integrations.tsx` — ⚠️ shows connected if status=connected (safe), but `connect()` still opens restricted popup if disconnected
- `artifacts/invoice-dashboard/src/pages/settings.tsx` — ⚠️ same issue
- `artifacts/invoice-dashboard/src/components/gmail-scan-dialog.tsx` — ⚠️ same issue

---

## Issue #2 — Health Route Mismatch

The API health endpoint is registered at `/healthz`, not `/health`:

```typescript
// artifacts/api-server/src/routes/health.ts
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
```

App is mounted at `/api`, so the actual endpoint is: `GET /api/healthz`

Any monitoring, uptime check, or test calling `/api/health` gets a 404 ("Cannot GET /api/health").

---

## Issue #3 — Deployment Artifacts Registry Mismatch

`.replit` lists only 2 of 4 artifacts in `[[artifacts]]`:
```toml
# .replit
[[artifacts]]
id = "artifacts/api-server"

[[artifacts]]
id = "artifacts/mockup-sandbox"
```

**Missing:** `artifacts/invoice-dashboard` and `artifacts/loyalty-club`.

Yet both are deployed and served correctly (verified on billibot.net). This suggests the deployment router uses `artifact.toml` `paths` configuration directly, and the `[[artifacts]]` list in `.replit` may only control which artifacts appear in the Replit workspace UI — not which are built/served. This needs confirmation.

---

## Issue #4 — Public API URLs Pointing to Dev Environment

In `.replit` `[userenv.shared]`:
```toml
BILLBOT_PUBLIC_BASE_URL = "https://dc086eb1-7bde-429c-a879-eb80b41757d1-00-2j2cz2s8jqfl2.riker.replit.dev"
BILLBOT_GMAIL_SCAN_ENDPOINT = "https://dc086eb1-...riker.replit.dev/api/public/gmail-scan"
BILLBOT_INVOICES_ENDPOINT   = "https://dc086eb1-...riker.replit.dev/api/public/invoices"
BILLBOT_SUMMARY_ENDPOINT    = "https://dc086eb1-...riker.replit.dev/api/public/summary"
GOOGLE_REDIRECT_URI = "https://billibot.net/api/gmail-auth/callback"
```

These `riker.replit.dev` URLs are ephemeral development workspace URLs — they change when the workspace restarts and are NOT accessible from outside Replit. Any webhook, Telegram bot, or external integration using `BILLBOT_*` env vars points to the wrong (dev) server in production.

---

## Questions for Review

1. **Gmail OAuth — best long-term architecture**: Given that `gmail.readonly`+`gmail.send` require a Google security assessment (CASA), what is the cleanest approach for this single-owner app? Options:
   - Route everything through the Replit `google-mail` integration (already verified, healthy)
   - Apply for Google verification (weeks, $$$, requires privacy policy + domain verification)
   - Use Google OAuth in Testing mode + test users (tokens expire every 7 days)
   - Drop `gmail.send` scope (not used for invoice reading) and use only `gmail.readonly` — still restricted but lighter
   - Use IMAP instead (there's already an `imap-auth` route in the codebase)

2. **Production build caching**: Why does the deployment produce the same Vite bundle hash after source code changes? How should the build cache be invalidated? Is there a `--force` flag or cache-busting approach for Replit autoscale deployments?

3. **Spinner hang pattern**: What is the most robust pattern for detecting that a Google OAuth popup has landed on an error page (Google's own domain) vs completing successfully? The current `popup.closed` polling misses the case where the popup stays open on a Google error page.

4. **[[artifacts]] vs artifact.toml**: Does `.replit [[artifacts]]` control deployment inclusion, or is it purely the workspace UI registry? Should `invoice-dashboard` and `loyalty-club` be added to it?

5. **Redirect URI in production**: `GOOGLE_REDIRECT_URI=https://billibot.net/api/gmail-auth/callback` is hardcoded in `.replit`. If the app later runs on multiple domains, how should the redirect URI be managed? Note the existing dynamic logic in `getRedirectUri()` that reads `REPLIT_DEV_DOMAIN` — this correctly handles dev but the env var override wins in production.

---

## File Map

```
artifacts/
  api-server/src/
    app.ts                          # Express app, CORS, trust proxy, mounts /api
    routes/index.ts                 # All route registrations
    routes/gmail-auth.ts            # /login-url /url /callback /status /disconnect
    routes/health.ts                # GET /healthz (⚠️ not /health)
    services/gmailOAuth.ts          # OAuth2 client, scope lists, token storage
    services/gmailClient.ts         # Replit google-mail integration client
    middleware/auth.ts              # requireAuth, setSessionCookie, readSessionUserId
  invoice-dashboard/src/
    App.tsx                         # Root router, session check, Gmail popup handler
    pages/login.tsx                 # Login page: Google login (basic scopes)
    pages/onboarding.tsx            # Onboarding wizard with Gmail connect step
    pages/integrations.tsx          # GmailCard: status + connect + scan
    pages/settings.tsx              # Settings Gmail reconnect
    components/gmail-scan-dialog.tsx # Gmail scan dialog with connect flow
.replit                             # Deployment config, [[artifacts]], userenv
artifacts/invoice-dashboard/.replit-artifact/artifact.toml
artifacts/api-server/.replit-artifact/artifact.toml
```
