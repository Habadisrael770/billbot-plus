// Gmail OAuth2 service — full read permissions (gmail.readonly + userinfo.email)
// Requires: GMAIL_CLIENT_ID (or GOOGLE_ID), GMAIL_CLIENT_SECRET env vars
import { google } from "googleapis";
import { db } from "@workspace/db";
import { gmailTokens } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { upsertGoogleUser } from "./userService.js";

// ── Scope lists ───────────────────────────────────────────────────────────
// LOGIN scopes — basic, non-restricted → any Google account works, no verification needed
const LOGIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// GMAIL scopes — restricted, requires app verification or test users
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function getOAuth2Client() {
  const clientId     = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = getRedirectUri();

  if (!clientId || !clientSecret) {
    throw new Error("GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are required");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}/api/gmail-auth/callback`;
  return "http://localhost:8080/api/gmail-auth/callback";
}

// ── Google Login URL (basic scopes — no restriction, any Google account) ───
export function getGoogleLoginUrl(): string {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: "online",
    scope: LOGIN_SCOPES,
    prompt: "select_account",
    state: "login",             // tells callback this is login, not gmail-scan
  });
}

// ── Handle Google Login callback (basic scopes only) ───────────────────────
export async function handleGoogleLoginCallback(code: string): Promise<string> {
  const oAuth2Client = getOAuth2Client();
  const { tokens }   = await oAuth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("לא התקבל access token מ-Google");
  }

  oAuth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email;

  if (!email) {
    throw new Error("לא ניתן לקבל את כתובת האימייל מ-Google");
  }

  // Create/update user in users table
  await upsertGoogleUser({
    email,
    name:      data.name    ?? null,
    avatarUrl: data.picture ?? null,
    googleId:  data.id      ?? null,
  });

  return email;
}

// ── Gmail Scan URL (restricted scopes — requires verified app / test user) ──
export function getGmailAuthUrl(): string {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "select_account consent",
  });
}

// ── Exchange code for tokens and store in DB ───────────────────────────────
export async function handleGmailCallback(code: string): Promise<string> {
  const oAuth2Client = getOAuth2Client();
  const { tokens }   = await oAuth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("לא התקבל access token מ-Google");
  }

  // Get user info (works with access_token alone)
  oAuth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email;

  if (!email) {
    throw new Error("לא ניתן לקבל את כתובת האימייל מ-Google");
  }

  // Upsert user in the users table (Google login = app login)
  try {
    await upsertGoogleUser({
      email,
      name:      data.name    ?? null,
      avatarUrl: data.picture ?? null,
      googleId:  data.id      ?? null,
    });
  } catch (e) {
    console.warn("[gmailOAuth] upsertGoogleUser failed (non-fatal):", e);
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  const existing = await db
    .select()
    .from(gmailTokens)
    .where(eq(gmailTokens.email, email))
    .limit(1);

  if (existing.length > 0) {
    // ── CRITICAL FIX: Google doesn't always re-issue refresh_token on re-auth.
    // Keep the existing refresh_token if a new one wasn't provided.
    const existingRow = existing[0]!;
    await db.update(gmailTokens)
      .set({
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token ?? existingRow.refreshToken, // keep old if missing
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(gmailTokens.email, email));
  } else {
    // First time — refresh_token is required for offline access
    if (!tokens.refresh_token) {
      // This shouldn't happen since we request prompt=consent, but handle gracefully
      console.warn("[gmailOAuth] No refresh_token on first connect — offline access may not work");
    }
    await db.insert(gmailTokens).values({
      email,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? "",
      expiresAt,
    });
  }

  return email;
}

// ── Get a single Gmail client (first stored token) ────────────────────────
export async function getGmailClient() {
  const rows = await db.select().from(gmailTokens).limit(1);
  if (rows.length === 0) throw new Error("Gmail not connected");
  return buildGmailClientFromRow(rows[0]!);
}

// ── Get ALL Gmail clients (DB tokens + Replit integration as fallback) ────
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
      // Get email from profile (lightweight call)
      const profile = await replitClient.users.getProfile({ userId: "me" });
      const replitEmail = profile.data.emailAddress ?? "replit-integration";
      if (!dbEmails.has(replitEmail)) {
        clients.push({ client: replitClient, email: replitEmail });
      }
    }
  } catch {
    // Replit integration not available — that's fine
  }

  if (clients.length === 0) throw new Error("Gmail not connected");
  return clients;
}

function buildGmailClientFromRow(row: typeof gmailTokens.$inferSelect) {
  const oAuth2Client = getOAuth2Client();
  oAuth2Client.setCredentials({
    access_token:  row.accessToken,
    refresh_token: row.refreshToken,
    expiry_date:   row.expiresAt.getTime(),
  });

  oAuth2Client.on("tokens", async (newTokens) => {
    if (newTokens.access_token) {
      await db.update(gmailTokens)
        .set({
          accessToken: newTokens.access_token,
          expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : row.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(gmailTokens.email, row.email));
    }
  });

  return {
    client: google.gmail({ version: "v1", auth: oAuth2Client }),
    email: row.email,
  };
}

// ── Check connection status ────────────────────────────────────────────────
export async function getGmailStatus(): Promise<{
  connected: boolean;
  email: string | null;
  emails: string[];
  credentialsConfigured: boolean;
  redirectUri: string;
}> {
  const credentialsConfigured = !!(
    (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID) &&
    (process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)
  );
  const redirectUri = getRedirectUri();
  try {
    const clients = await getAllGmailClients();
    const emails = clients.map(c => c.email);
    return { connected: true, email: emails[0] ?? null, emails, credentialsConfigured, redirectUri };
  } catch {
    return { connected: false, email: null, emails: [], credentialsConfigured, redirectUri };
  }
}

// ── Disconnect — remove tokens from DB ────────────────────────────────────
export async function disconnectGmail(email?: string): Promise<void> {
  if (email) {
    await db.delete(gmailTokens).where(eq(gmailTokens.email, email));
  } else {
    await db.delete(gmailTokens);
  }
}
