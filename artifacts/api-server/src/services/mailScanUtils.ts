/**
 * mailScanUtils.ts
 * Shared helpers for Gmail and IMAP invoice scanning.
 *
 * Extracted so they can be tested independently and reused across scan paths.
 */

import path from "path";

// ── Gmail part helpers ────────────────────────────────────────────────────────

export interface GmailPart {
  filename?: string | null;
  mimeType?: string | null;
  body?: { attachmentId?: string | null; data?: string | null } | null;
  parts?: GmailPart[] | null;
}

/** Recursively flatten a nested Gmail message-part tree into a flat array. */
export function flattenParts(parts: GmailPart[]): GmailPart[] {
  const result: GmailPart[] = [];
  for (const p of parts) {
    result.push(p);
    if (p.parts) result.push(...flattenParts(p.parts));
  }
  return result;
}

/**
 * Determine whether a Gmail message part is an invoice attachment we want.
 * Accepts PDF, JPEG, JPG, PNG — via MIME type or filename extension.
 * Also accepts inline body.data (no attachmentId required).
 */
export function isInvoicePart(p: GmailPart): boolean {
  const fn   = (p.filename ?? "").toLowerCase();
  const mime = (p.mimeType ?? "").toLowerCase();

  const goodMime = (
    mime === "application/pdf" ||
    mime === "image/jpeg"      ||
    mime === "image/jpg"       ||
    mime === "image/png"
  );
  const goodExt = (
    fn.endsWith(".pdf")  ||
    fn.endsWith(".jpg")  ||
    fn.endsWith(".jpeg") ||
    fn.endsWith(".png")
  );

  return (goodMime || goodExt) && (!!p.body?.attachmentId || !!p.body?.data);
}

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg":      ".jpg",
  "image/jpg":       ".jpg",
  "image/png":       ".png",
};

/** Map MIME type → file extension (with dot). Falls back to filename ext or .pdf. */
export function mimeToExt(mime: string, fallbackFilename = ""): string {
  const fromMime = MIME_TO_EXT[mime.toLowerCase()];
  if (fromMime) return fromMime;
  const fromFile = path.extname(fallbackFilename).toLowerCase();
  return fromFile || ".pdf";
}

/**
 * Download a Gmail attachment part as a Buffer.
 * Handles both reference attachments (attachmentId) and inline base64 (body.data).
 *
 * @param gmail  - Authenticated Gmail API client
 * @param msgId  - Parent message ID
 * @param part   - The message part describing the attachment
 * @returns Buffer of the raw file, or null if unavailable
 */
export async function downloadGmailPart(
  gmail: {
    users: {
      messages: {
        attachments: {
          get: (params: {
            userId: string;
            messageId: string;
            id: string;
          }) => Promise<{ data: { data?: string | null } }>;
        };
      };
    };
  },
  msgId: string,
  part: GmailPart,
): Promise<Buffer | null> {
  const decodeBase64Url = (s: string) =>
    Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

  if (part.body?.attachmentId) {
    try {
      const res = await gmail.users.messages.attachments.get({
        userId: "me", messageId: msgId, id: part.body.attachmentId,
      });
      const data = res.data.data;
      if (!data) return null;
      return decodeBase64Url(data);
    } catch {
      return null;
    }
  }

  if (part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  return null;
}

// ── Error isolation ───────────────────────────────────────────────────────────

/**
 * Run an async per-account function and collect errors instead of throwing.
 * Returns { result, error } so the caller can log and continue with other accounts.
 */
export async function safeAccountScan<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T | null; error: string | null }> {
  try {
    const result = await fn();
    return { result, error: null };
  } catch (err) {
    const msg = `[${label}] ${String(err)}`;
    console.error("[mailScanUtils] account error:", msg);
    return { result: null, error: msg };
  }
}

// ── File-type guard ───────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

/** Return true if the filename has a supported invoice attachment extension. */
export function isSupportedFilename(filename: string): boolean {
  return SUPPORTED_EXTS.has(path.extname(filename).toLowerCase());
}
