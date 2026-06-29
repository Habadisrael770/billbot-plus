import imapSimple from "imap-simple";
import { simpleParser } from "mailparser";
import crypto from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

function getEncryptionSecret(): string {
  const secret = process.env.SECRET_KEY;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SECRET_KEY environment variable is required in production for IMAP credential encryption (min 32 chars).");
  }
  return "billbot-imap-key-32-chars-padded!";
}

const ENC_KEY = getEncryptionSecret().slice(0, 32);
const IV_LEN  = 16;

function encrypt(text: string): string {
  const iv  = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENC_KEY), iv);
  const enc = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

function decrypt(text: string): string {
  const [ivHex, encHex] = text.split(":");
  const iv  = Buffer.from(ivHex,  "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENC_KEY), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString();
}

// ── DB helpers ──────────────────────────────────────────────────────────────
export async function ensureImapTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS imap_accounts (
      id        SERIAL PRIMARY KEY,
      email     TEXT NOT NULL UNIQUE,
      password_enc TEXT NOT NULL,
      host      TEXT NOT NULL DEFAULT 'imap.gmail.com',
      port      INTEGER NOT NULL DEFAULT 993,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function saveImapAccount(email: string, appPassword: string, host = "imap.gmail.com", port = 993) {
  await ensureImapTable();
  const enc = encrypt(appPassword);
  await db.execute(sql`
    INSERT INTO imap_accounts (email, password_enc, host, port)
    VALUES (${email}, ${enc}, ${host}, ${port})
    ON CONFLICT (email) DO UPDATE
      SET password_enc = EXCLUDED.password_enc,
          host = EXCLUDED.host,
          port = EXCLUDED.port
  `);
}

export async function deleteImapAccount(email: string) {
  await ensureImapTable();
  await db.execute(sql`DELETE FROM imap_accounts WHERE email = ${email}`);
}

export async function listImapAccounts(): Promise<{ email: string; host: string; port: number }[]> {
  await ensureImapTable();
  const rows = await db.execute(sql`SELECT email, host, port FROM imap_accounts ORDER BY created_at`);
  return (rows.rows ?? []) as { email: string; host: string; port: number }[];
}

async function getImapCredentials(): Promise<{ email: string; password: string; host: string; port: number }[]> {
  await ensureImapTable();
  const rows = await db.execute(sql`SELECT email, password_enc, host, port FROM imap_accounts`);
  return ((rows.rows ?? []) as { email: string; password_enc: string; host: string; port: number }[]).map(r => ({
    email:    r.email,
    password: decrypt(r.password_enc),
    host:     r.host,
    port:     r.port,
  }));
}

// ── Connection test ─────────────────────────────────────────────────────────
export async function testImapConnection(email: string, appPassword: string, host = "imap.gmail.com", port = 993): Promise<void> {
  const config = {
    imap: {
      user:     email,
      password: appPassword,
      host,
      port,
      tls:      true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 15000,
    },
  };
  const connection = await imapSimple.connect(config);
  await connection.openBox("INBOX");
  connection.end();
}

// ── IMAP scan (returns attachments as Buffers) ──────────────────────────────
export async function scanImapForInvoices(
  sinceDate: Date,
  onProgress: (pct: number, msg: string) => void,
): Promise<{ email: string; filename: string; buffer: Buffer; date: Date }[]> {
  const accounts = await getImapCredentials();
  if (accounts.length === 0) return [];

  const results: { email: string; filename: string; buffer: Buffer; date: Date }[] = [];

  for (const acc of accounts) {
    onProgress(10, `מתחבר ל-IMAP עבור ${acc.email}...`);
    let connection: imapSimple.ImapSimple;
    try {
      connection = await imapSimple.connect({
        imap: {
          user:     acc.email,
          password: acc.password,
          host:     acc.host,
          port:     acc.port,
          tls:      true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
          connTimeout: 15000,
        },
      });
    } catch (err) {
      onProgress(15, `שגיאת חיבור ל-${acc.email}: ${String(err)}`);
      continue;
    }

    try {
      await connection.openBox("INBOX");

      const searchCriteria = [
        ["SINCE", sinceDate.toDateString()],
        ["OR",
          ["SUBJECT", "חשבונית"],
          ["OR", ["SUBJECT", "invoice"], ["OR", ["SUBJECT", "receipt"], ["SUBJECT", "קבלה"]]]
        ],
      ];

      const fetchOpts = { bodies: [""], struct: true };
      const messages  = await connection.search(searchCriteria, fetchOpts);

      onProgress(30, `נמצאו ${messages.length} הודעות ב-${acc.email}`);

      let idx = 0;
      for (const msg of messages) {
        idx++;
        const pct = 30 + Math.round((idx / Math.max(messages.length, 1)) * 55);
        if (idx % 5 === 0 || idx === 1) onProgress(pct, `מעבד הודעה ${idx}/${messages.length}...`);

        try {
          const parts = imapSimple.getParts(msg.attributes.struct as imapSimple.MessageBodyPart[]);
          const attachmentParts = parts.filter(p => {
            const disp = (p.disposition?.type ?? "").toLowerCase();
            const subtype = (p.subtype ?? "").toLowerCase();
            return (
              disp === "attachment" &&
              (subtype === "pdf" || subtype === "jpeg" || subtype === "jpg" || subtype === "png")
            );
          });

          if (attachmentParts.length === 0) continue;

          const rawAll = msg.parts.find(p => p.which === "");
          if (!rawAll) continue;
          const parsed = await simpleParser(rawAll.body as string);
          const msgDate = parsed.date ?? new Date();

          for (const part of attachmentParts) {
            const partData = await connection.getPartData(msg, part);
            const buffer = Buffer.isBuffer(partData) ? partData : Buffer.from(partData, "base64");
            const filename = (part.disposition?.params as { filename?: string })?.filename
              ?? `attachment.${part.subtype ?? "pdf"}`;
            results.push({ email: acc.email, filename, buffer, date: msgDate });
          }
        } catch { /* skip bad message */ }
      }
    } finally {
      connection.end();
    }
  }

  return results;
}
