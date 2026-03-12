// Gmail OAuth2 service — full read permissions (gmail.readonly + userinfo.email)
// Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars
import { google } from "googleapis";
import { db } from "@workspace/db";
import { gmailTokens } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function getOAuth2Client() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = getRedirectUri();

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getRedirectUri(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}/api/gmail-auth/callback`;
  return "http://localhost:8080/api/gmail-auth/callback";
}

// ── Generate the OAuth URL to redirect user to ─────────────────────────────
export function getGmailAuthUrl(): string {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

// ── Exchange code for tokens and store in DB ───────────────────────────────
export async function handleGmailCallback(code: string): Promise<string> {
  const oAuth2Client = getOAuth2Client();
  const { tokens }   = await oAuth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Did not receive required tokens from Google");
  }

  oAuth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email ?? "unknown";

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  const existing = await db.select().from(gmailTokens).where(eq(gmailTokens.email, email));
  if (existing.length > 0) {
    await db.update(gmailTokens)
      .set({
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(gmailTokens.email, email));
  } else {
    await db.insert(gmailTokens).values({
      email,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    });
  }

  return email;
}

// ── Get a fresh Gmail client using stored tokens ───────────────────────────
export async function getGmailClient() {
  const rows = await db.select().from(gmailTokens).limit(1);
  if (rows.length === 0) throw new Error("Gmail not connected");

  const row = rows[0];
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
export async function getGmailStatus(): Promise<{ connected: boolean; email: string | null; credentialsConfigured: boolean }> {
  const credentialsConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  try {
    const { client, email } = await getGmailClient();
    const profile = await client.users.getProfile({ userId: "me" });
    return { connected: true, email: profile.data.emailAddress ?? email, credentialsConfigured };
  } catch {
    return { connected: false, email: null, credentialsConfigured };
  }
}

// ── Disconnect — remove tokens from DB ────────────────────────────────────
export async function disconnectGmail(): Promise<void> {
  await db.delete(gmailTokens);
}
