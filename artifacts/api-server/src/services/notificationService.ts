import { getGmailClient } from "./gmailOAuth.js";

// ── Email ────────────────────────────────────────────────────────────────────
export async function sendEmailNotification(
  toEmail: string,
  subject: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const gmailClient = await getGmailClient();
    const boundary = "BB_boundary";
    const rawEmail = [
      `From: ${gmailClient.email}`,
      `To: ${toEmail}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      body,
    ].join("\r\n");
    const encoded = Buffer.from(rawEmail).toString("base64url");
    await gmailClient.client.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── WhatsApp (Twilio) ─────────────────────────────────────────────────────────
export async function sendWhatsAppNotification(
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

  if (!accountSid || !authToken) return { ok: false, error: "Twilio not configured" };

  const normalized = phone.replace(/\D/g, "");
  const toFormatted = `whatsapp:+${normalized}`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: toFormatted, Body: message }).toString(),
      }
    );
    const data = await res.json() as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message ?? "Twilio error" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Telegram ──────────────────────────────────────────────────────────────────
export async function sendTelegramNotification(
  chatId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.match(/^(\d{8,12}:[A-Za-z0-9_-]{35})/)?.[1];
  if (!token) return { ok: false, error: "Telegram not configured" };
  if (!chatId) return { ok: false, error: "No chat_id" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
