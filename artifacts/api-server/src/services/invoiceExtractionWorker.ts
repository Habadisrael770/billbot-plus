/**
 * invoiceExtractionWorker.ts
 * Pulls jobs from invoice_extraction_jobs and runs the existing AI extraction.
 * Never crashes the whole worker because of a single invoice.
 */
import { db } from "@workspace/db";
import { invoicesTable, type ExtractionErrorCode } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { extractInvoiceFromFile } from "./aiExtractService.js";
import {
  claimNextJobs,
  markJobCompleted,
  markJobFailed,
  resetStaleProcessingJobs,
} from "./invoiceExtractionQueueService.js";
import { ensurePersistentInvoiceFile } from "./invoiceFileStorageService.js";
import { normalizeVendorName } from "../utils/normalizeVendorName.js";
import { findOrCreateVendor } from "./vendorService.js";
import { suggestCategory } from "./categoryService.js";
import { detectForeignSupplier } from "../utils/foreignSupplierDetector.js";

const s = (v: string | null | undefined): string | null =>
  v ? v.replace(/\0/g, "").trim() || null : null;

interface ClassifiedError {
  code: ExtractionErrorCode;
  retryable: boolean;
  message: string;
}

function classifyError(err: unknown): ClassifiedError {
  const e = err as { message?: string; status?: number; code?: string; cause?: { code?: string; message?: string } };
  const msg = (e?.message ?? e?.cause?.message ?? String(err)).slice(0, 500);
  const lower = msg.toLowerCase();

  if (lower.includes("file_not_found") || lower.includes("enoent") || lower.includes("no such file")) {
    return { code: "FILE_NOT_FOUND", retryable: false, message: msg };
  }
  if (e?.status === 429 || lower.includes("rate limit") || lower.includes("too many requests")) {
    return { code: "AI_RATE_LIMITED", retryable: true, message: msg };
  }
  if ((typeof e?.status === "number" && e.status >= 500) || lower.includes("502") || lower.includes("503") || lower.includes("upstream")) {
    return { code: "AI_PROVIDER_ERROR", retryable: true, message: msg };
  }
  if (lower.includes("no valid json") || lower.includes("unexpected token") || lower.includes("json")) {
    return { code: "AI_INVALID_JSON", retryable: true, message: msg };
  }
  if (e?.cause?.code === "22021" || lower.includes("invalid byte sequence") || lower.includes("invalid utf")) {
    return { code: "DB_UPDATE_FAILED", retryable: false, message: msg };
  }
  return { code: "UNKNOWN_EXTRACTION_ERROR", retryable: true, message: msg };
}

async function processSingleInvoice(invoiceId: string): Promise<void> {
  // Fetch invoice
  const [inv] = await db
    .select({
      id: invoicesTable.id,
      file_path: invoicesTable.file_path,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);

  if (!inv) {
    const err = new Error("FILE_NOT_FOUND: invoice row missing");
    throw err;
  }

  // Resolve persistent file path
  const fp = ensurePersistentInvoiceFile({ id: inv.id, file_path: inv.file_path });
  if (!fp) {
    throw new Error("FILE_NOT_FOUND: no usable file on disk for invoice " + invoiceId);
  }

  // Run AI extraction
  const aiResult = await extractInvoiceFromFile(fp);

  const rawVendor = aiResult.vendor ?? "";
  const normalizedVendor = normalizeVendorName(rawVendor);
  let vendorId: string | null = null;
  let canonicalName: string | null = null;

  if (rawVendor.trim()) {
    try {
      const vr = await findOrCreateVendor(rawVendor, aiResult.tax_id ?? undefined);
      vendorId = vr.vendorId;
      canonicalName = vr.canonicalName;
    } catch { /* non-fatal */ }
  }

  const categoryResult = await suggestCategory(canonicalName || rawVendor, aiResult.tax_id ?? undefined);
  const foreignResult = detectForeignSupplier(canonicalName || rawVendor, aiResult.currency ?? null, aiResult.tax_id ?? null);
  let vat = aiResult.vat;
  if (foreignResult.is_foreign) vat = 0;

  await db
    .update(invoicesTable)
    .set({
      raw_vendor_name:        s(rawVendor),
      normalized_vendor_name: s(normalizedVendor),
      vendor_id:              vendorId,
      tax_id:                 s(aiResult.tax_id),
      invoice_number:         s(aiResult.invoice_number),
      invoice_date:           s(aiResult.date),
      subtotal:               aiResult.subtotal != null ? String(aiResult.subtotal) : null,
      vat:                    vat != null ? String(vat) : null,
      total:                  aiResult.total != null ? String(aiResult.total) : null,
      currency:               s(aiResult.currency) ?? "ILS",
      document_type:          (s(aiResult.document_type) ?? "supplier_invoice") as "supplier_invoice" | "receipt" | "credit_note" | "other",
      extraction_confidence:  String(aiResult.confidence ?? 0),
      extraction_source:      s(aiResult.extraction_source),
      extraction_status:      s(aiResult.extraction_status),
      review_reason:          s(aiResult.review_reason),
      pdf_type:               s(aiResult.pdf_type),
      line_items_count:       aiResult.line_items_count ?? 0,
      suggested_category:     s(categoryResult.suggested_category),
      final_category:         s(categoryResult.suggested_category),
      is_foreign:             foreignResult.is_foreign,
      supplier_country:       s(foreignResult.country),
    } as Record<string, unknown>)
    .where(eq(invoicesTable.id, invoiceId));
}

export interface RunWorkerResult {
  processed: number;
  completed: number;
  failed: number;
  poisoned: number;
}

/**
 * Run a single batch of jobs. Designed to be invoked from an HTTP handler
 * or a scheduled tick. Will not throw on individual invoice failures.
 */
export async function runWorkerBatch(opts: {
  limit?: number;
  concurrency?: number;
  workerId?: string;
}): Promise<RunWorkerResult> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));
  const concurrency = Math.max(1, Math.min(opts.concurrency ?? 3, 10));
  const workerId = opts.workerId ?? `w-${process.pid}-${Date.now()}`;

  // Recover any zombie jobs first so they don't block workers
  await resetStaleProcessingJobs(30);

  const jobs = await claimNextJobs(workerId, limit);
  if (jobs.length === 0) {
    return { processed: 0, completed: 0, failed: 0, poisoned: 0 };
  }

  let completed = 0;
  let failed = 0;
  let poisoned = 0;

  // Simple sliding-window concurrency
  let cursor = 0;
  async function next(): Promise<void> {
    const idx = cursor++;
    if (idx >= jobs.length) return;
    const job = jobs[idx]!;
    console.log(`[worker:${workerId}] job=${job.jobId} invoice=${job.invoiceId} attempt=${job.attempts + 1}/${job.maxAttempts}`);
    try {
      await processSingleInvoice(job.invoiceId);
      await markJobCompleted(job.jobId, job.invoiceId, workerId);
      completed++;
    } catch (err) {
      const cls = classifyError(err);
      const r = await markJobFailed(job.jobId, job.invoiceId, cls.code, cls.message, cls.retryable, workerId);
      if (r.status === "poisoned") poisoned++;
      else failed++;
    }
    return next();
  }

  const runners = Array.from({ length: Math.min(concurrency, jobs.length) }, () => next());
  await Promise.all(runners);

  return { processed: jobs.length, completed, failed, poisoned };
}
