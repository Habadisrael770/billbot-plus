---
name: Gmail connect — restricted scopes vs verified Replit integration
description: Why the in-app Gmail "connect" popup gets blocked by Google on production, and the working path.
---

# Gmail connection in BillBOT+

There are TWO Gmail paths and they must not be confused:

1. **Custom OAuth app** (the app's own Google Cloud project) — used by the in-app
   "Connect Gmail" popup. Requests RESTRICTED scopes (`gmail.readonly`,
   `gmail.send`). On production (billibot.net) Google blocks this with
   *"Access blocked: <app> has not completed Google's verification process"*
   because restricted Gmail scopes require a full Google security assessment
   (CASA), which an individual realistically cannot pass quickly. Testing-mode +
   test-user works but refresh tokens expire ~7 days.

2. **Replit google-mail integration** (`gmailClient.ts` → `getUncachableGmailClient`,
   `isGmailConnected`) — uses Replit's PRE-VERIFIED Google app, so NO verification
   wall. The backend `getAllGmailClients()` / `getGmailStatus()` already include it,
   so `/api/gmail-auth/status` returns `connected:true` whenever this integration
   is healthy. Works in deployment too (uses `WEB_REPL_RENEWAL`, not just
   `REPL_IDENTITY`).

**Rule:** prefer path #2. UI "connect" entry points should check
`/api/gmail-auth/status` first and treat connected=true (which the integration
satisfies) as done, instead of forcing the restricted OAuth popup.

**Why:** path #1 is the recurring source of "stuck connecting / access blocked"
reports on production. The verified integration sidesteps Google verification
entirely. The onboarding flow was the offender — it ignored existing connection
and always opened the restricted popup, hanging the spinner on Google's block page.

**Gotcha:** `/api/gmail-auth/status` is behind `requireAuth`; fetch it with
`credentials:"include"` and only after the user is logged in.
