/**
 * invoiceFileStorageService.ts
 * Persistent file storage for invoice attachments.
 * Avoids /tmp which the OS may purge.
 */
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "invoices");

export interface InvoiceFileLike {
  id: string;
  file_path: string | null;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getPersistentInvoiceDir(invoiceId: string): string {
  const dir = path.join(STORAGE_ROOT, invoiceId);
  ensureDir(dir);
  return dir;
}

export function getPersistentInvoicePath(invoiceId: string, ext = ".pdf"): string {
  return path.join(getPersistentInvoiceDir(invoiceId), `original${ext}`);
}

/**
 * Resolve an invoice file path that actually exists on disk, or null.
 * Checks persistent storage first, then the recorded file_path.
 */
export function resolveInvoiceFile(invoice: InvoiceFileLike): string | null {
  // Look for any "original.*" in persistent storage
  const persistentDir = path.join(STORAGE_ROOT, invoice.id);
  if (fs.existsSync(persistentDir)) {
    const files = fs.readdirSync(persistentDir).filter((f) => f.startsWith("original."));
    if (files.length > 0) {
      const p = path.join(persistentDir, files[0]!);
      if (fs.existsSync(p)) return p;
    }
  }

  const fp = invoice.file_path;
  if (!fp || fp === "manual") return null;

  const abs = path.isAbsolute(fp) ? fp : path.resolve(process.cwd(), fp);
  if (fs.existsSync(abs)) return abs;

  return null;
}

/**
 * Persist an attachment buffer for an invoice into durable storage.
 * Returns the absolute path written.
 */
export function saveInvoiceAttachment(
  invoiceId: string,
  filename: string,
  buffer: Buffer
): string {
  const ext = path.extname(filename).toLowerCase() || ".pdf";
  const target = getPersistentInvoicePath(invoiceId, ext);
  fs.writeFileSync(target, buffer);
  return target;
}

/**
 * Best-effort: ensure the invoice file lives in persistent storage.
 * If the recorded file_path lives in /tmp or uploads/ but exists,
 * copy it into persistent storage.
 * Returns the persistent path or null if no usable source file exists.
 */
export function ensurePersistentInvoiceFile(invoice: InvoiceFileLike): string | null {
  const existing = resolveInvoiceFile(invoice);
  if (!existing) return null;

  // Already in persistent storage
  if (existing.startsWith(STORAGE_ROOT)) return existing;

  try {
    const ext = path.extname(existing).toLowerCase() || ".pdf";
    const target = getPersistentInvoicePath(invoice.id, ext);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(existing, target);
    }
    return target;
  } catch (err) {
    console.warn(`[fileStorage] copy failed for ${invoice.id}:`, (err as Error).message);
    return existing; // fall back to original location
  }
}

export function getStorageRoot(): string {
  ensureDir(STORAGE_ROOT);
  return STORAGE_ROOT;
}
