import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { normalizeVendorName } from "../utils/normalizeVendorName.js";
import { computeFileHash } from "../utils/hashFile.js";
import { findOrCreateVendor } from "./vendorService.js";
import { detectDuplicate } from "./deduplicationService.js";
import { suggestCategory } from "./categoryService.js";

export type SourceType = "upload" | "camera" | "email";
export type DocumentType = "supplier_invoice" | "receipt" | "credit_note" | "other";

export interface ExtractedInvoiceData {
  vendor?: string | null;
  tax_id?: string | null;
  invoice_number?: string | null;
  date?: string | null;
  subtotal?: number | null;
  vat?: number | null;
  total?: number | null;
  currency?: string | null;
}

export interface ProcessInvoiceInput {
  filePath: string;
  extracted: ExtractedInvoiceData;
  extractionConfidence?: number;
  sourceType?: SourceType;
  documentType?: DocumentType;
}

export interface ProcessInvoiceResult {
  invoiceId: string;
  vendorId: string | null;
  canonicalVendorName: string | null;
  vendorMatchMethod: string | null;
  duplicateStatus: string;
  duplicateOfInvoiceId: string | null;
  confidence: number;
  status: string;
  suggestedCategory: string | null;
  categoryConfidence: number;
}

/**
 * processInvoice — full pipeline:
 *  1. Normalize vendor name
 *  2. Find or create vendor
 *  3. Compute file hash
 *  4. Detect duplicate
 *  5. Suggest category (deterministic, rule-based)
 *  6. Save invoice to database
 */
export async function processInvoice(
  input: ProcessInvoiceInput
): Promise<ProcessInvoiceResult> {
  const {
    filePath,
    extracted,
    extractionConfidence,
    sourceType = "upload",
    documentType = "supplier_invoice",
  } = input;

  // Step 1: Normalize vendor name
  const rawVendorName = extracted.vendor ?? "";
  const normalizedVendorName = normalizeVendorName(rawVendorName);

  // Step 2: Find or create vendor
  let vendorId: string | null = null;
  let canonicalVendorName: string | null = null;
  let vendorMatchMethod: string | null = null;

  if (rawVendorName.trim() !== "") {
    try {
      const vendorResult = await findOrCreateVendor(rawVendorName, extracted.tax_id);
      vendorId = vendorResult.vendorId;
      canonicalVendorName = vendorResult.canonicalName;
      vendorMatchMethod = vendorResult.matchMethod;
    } catch (err) {
      console.error("Vendor detection failed:", err);
    }
  }

  // Step 3: Compute file hash
  const fileSha256 = await computeFileHash(filePath);

  // Step 4: Detect duplicate
  const duplicateResult = await detectDuplicate({
    file_sha256: fileSha256,
    vendor_id: vendorId,
    tax_id: extracted.tax_id,
    invoice_number: extracted.invoice_number,
    invoice_date: extracted.date,
    total: extracted.total != null ? String(extracted.total) : null,
  });

  // Step 5: Suggest category (use canonical name for better matching)
  const nameForCategory = canonicalVendorName || rawVendorName;
  const categoryResult = await suggestCategory(nameForCategory, extracted.tax_id);

  // Step 6: Save invoice to database
  const [savedInvoice] = await db
    .insert(invoicesTable)
    .values({
      vendor_id: vendorId,
      raw_vendor_name: rawVendorName || null,
      normalized_vendor_name: normalizedVendorName || null,
      tax_id: extracted.tax_id ?? null,
      invoice_number: extracted.invoice_number ?? null,
      invoice_date: extracted.date ?? null,
      subtotal: extracted.subtotal != null ? String(extracted.subtotal) : null,
      vat: extracted.vat != null ? String(extracted.vat) : null,
      total: extracted.total != null ? String(extracted.total) : null,
      currency: extracted.currency ?? "ILS",
      file_path: filePath,
      file_sha256: fileSha256,
      duplicate_status: duplicateResult.duplicate_status,
      duplicate_of_invoice_id: duplicateResult.duplicate_of_invoice_id,
      status:
        duplicateResult.duplicate_status === "unique"
          ? "pending_review"
          : "flagged_duplicate",
      extraction_confidence:
        extractionConfidence != null ? String(extractionConfidence) : null,
      source_type: sourceType,
      document_type: documentType,
      suggested_category: categoryResult.suggested_category,
      final_category: categoryResult.suggested_category, // default = suggestion, user can override
      category_confidence:
        categoryResult.category_confidence > 0
          ? String(categoryResult.category_confidence)
          : null,
    })
    .returning();

  if (!savedInvoice) throw new Error("Failed to save invoice");

  return {
    invoiceId: savedInvoice.id,
    vendorId,
    canonicalVendorName,
    vendorMatchMethod,
    duplicateStatus: duplicateResult.duplicate_status,
    duplicateOfInvoiceId: duplicateResult.duplicate_of_invoice_id,
    confidence: duplicateResult.confidence,
    status: savedInvoice.status,
    suggestedCategory: categoryResult.suggested_category,
    categoryConfidence: categoryResult.category_confidence,
  };
}

/** updateInvoiceStatus — approve, flag, etc. */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: string
): Promise<void> {
  await db
    .update(invoicesTable)
    .set({ status, updated_at: new Date() })
    .where(eq(invoicesTable.id, invoiceId));
}

/** markNotDuplicate — overrides the duplicate detection result. */
export async function markNotDuplicate(invoiceId: string): Promise<void> {
  await db
    .update(invoicesTable)
    .set({
      duplicate_status: "unique",
      duplicate_of_invoice_id: null,
      status: "pending_review",
      updated_at: new Date(),
    })
    .where(eq(invoicesTable.id, invoiceId));
}

/** updateInvoiceCategory — user manually overrides the category. */
export async function updateInvoiceCategory(
  invoiceId: string,
  finalCategory: string
): Promise<void> {
  await db
    .update(invoicesTable)
    .set({ final_category: finalCategory, updated_at: new Date() })
    .where(eq(invoicesTable.id, invoiceId));
}
