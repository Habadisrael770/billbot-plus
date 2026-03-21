import { db } from "@workspace/db";
import { invoicesTable, invoiceLineItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { normalizeVendorName } from "../utils/normalizeVendorName.js";
import { computeFileHash } from "../utils/hashFile.js";
import { findOrCreateVendor } from "./vendorService.js";
import { detectDuplicate } from "./deduplicationService.js";
import { suggestCategory } from "./categoryService.js";
import { detectForeignSupplier } from "../utils/foreignSupplierDetector.js";
import type { ValidatedLineItem } from "./lineItemParser.js";
import type { ExtractionSource, ExtractionStatus, ReviewReason, PdfType } from "./aiExtractService.js";

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

/** Extended extraction metadata from the new pipeline */
export interface ExtractionMetadata {
  line_items?:           ValidatedLineItem[];
  line_items_count?:     number;
  extraction_source?:    ExtractionSource;
  extraction_status?:    ExtractionStatus;
  review_reason?:        ReviewReason;
  pdf_type?:             PdfType | null;
  header_confidence?:    number;
  line_items_confidence?: number;
}

export interface ProcessInvoiceInput {
  filePath:              string;
  extracted:             ExtractedInvoiceData;
  extractionConfidence?: number;
  sourceType?:           SourceType;
  documentType?:         DocumentType;
  /** Pass the full pipeline metadata when available */
  extractionMeta?:       ExtractionMetadata;
}

export interface ProcessInvoiceResult {
  invoiceId:              string;
  vendorId:               string | null;
  canonicalVendorName:    string | null;
  vendorMatchMethod:      string | null;
  duplicateStatus:        string;
  duplicateOfInvoiceId:   string | null;
  confidence:             number;
  status:                 string;
  suggestedCategory:      string | null;
  categoryConfidence:     number;
  lineItemsSaved:         number;
}

/**
 * processInvoice — full pipeline:
 *  1. Normalize vendor name
 *  2. Find or create vendor
 *  3. Compute file hash
 *  4. Detect duplicate
 *  5. Suggest category (deterministic, rule-based)
 *  5b. Detect foreign supplier
 *  6. Save invoice to database (with pipeline metadata)
 *  7. Save line items (if any)
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
    extractionMeta,
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

      // Skip blocked vendors for email imports
      if (vendorResult.isBlocked && sourceType === "email") {
        console.log(`[processInvoice] Skipping blocked vendor: ${canonicalVendorName}`);
        throw new Error(`VENDOR_BLOCKED:${canonicalVendorName}`);
      }
    } catch (err) {
      console.error("Vendor detection failed:", err);
      throw err;
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

  // Step 5b: Detect foreign supplier (חשבוניות מחו"ל — אין ניכוי מע"מ)
  const foreignResult = detectForeignSupplier(
    canonicalVendorName || rawVendorName,
    extracted.currency,
    extracted.tax_id,
  );

  // Step 6: Save invoice to database
  const line_items      = extractionMeta?.line_items      ?? [];
  const line_items_count = extractionMeta?.line_items_count ?? line_items.length;

  const [savedInvoice] = await db
    .insert(invoicesTable)
    .values({
      vendor_id:             vendorId,
      raw_vendor_name:       rawVendorName || null,
      normalized_vendor_name: normalizedVendorName || null,
      tax_id:                extracted.tax_id ?? null,
      invoice_number:        extracted.invoice_number ?? null,
      invoice_date:          extracted.date ?? null,
      subtotal:              extracted.subtotal != null ? String(extracted.subtotal) : null,
      vat:                   extracted.vat     != null ? String(extracted.vat)      : null,
      total:                 extracted.total   != null ? String(extracted.total)    : null,
      currency:              extracted.currency ?? "ILS",
      file_path:             filePath,
      file_sha256:           fileSha256,
      duplicate_status:      duplicateResult.duplicate_status,
      duplicate_of_invoice_id: duplicateResult.duplicate_of_invoice_id,
      status:
        duplicateResult.duplicate_status === "unique"
          ? "pending_review"
          : "flagged_duplicate",
      extraction_confidence:
        extractionConfidence != null ? String(extractionConfidence) : null,
      source_type:           sourceType,
      document_type:         documentType,
      suggested_category:    categoryResult.suggested_category,
      final_category:        categoryResult.suggested_category,
      category_confidence:
        categoryResult.category_confidence > 0
          ? String(categoryResult.category_confidence)
          : null,
      is_foreign:            foreignResult.is_foreign,
      supplier_country:      foreignResult.country,
      // Pipeline metadata
      extraction_source:     extractionMeta?.extraction_source     ?? null,
      extraction_status:     extractionMeta?.extraction_status     ?? null,
      review_reason:         extractionMeta?.review_reason         ?? null,
      pdf_type:              extractionMeta?.pdf_type              ?? null,
      line_items_count,
    })
    .returning();

  if (!savedInvoice) throw new Error("Failed to save invoice");

  // Step 7: Save line items
  let lineItemsSaved = 0;
  if (line_items.length > 0) {
    try {
      await db.insert(invoiceLineItemsTable).values(
        line_items.map((item, idx) => ({
          invoice_id:      savedInvoice.id,
          product_name:    item.product_name,
          barcode:         item.barcode,
          sku:             item.sku,
          quantity:        item.quantity != null ? String(item.quantity) : null,
          unit:            item.unit,
          unit_price:      item.unit_price != null ? String(item.unit_price) : null,
          line_total:      item.line_total != null ? String(item.line_total) : null,
          discount:        item.discount   != null ? String(item.discount)   : null,
          vat_rate:        item.vat_rate   != null ? String(item.vat_rate)   : null,
          item_confidence: String(item.item_confidence),
          sort_order:      idx,
        }))
      );
      lineItemsSaved = line_items.length;
      console.log(`[ProcessInvoice] saved ${lineItemsSaved} line items for invoice ${savedInvoice.id}`);
    } catch (err) {
      console.error("[ProcessInvoice] Failed to save line items:", err);
    }
  }

  return {
    invoiceId:            savedInvoice.id,
    vendorId,
    canonicalVendorName,
    vendorMatchMethod,
    duplicateStatus:      duplicateResult.duplicate_status,
    duplicateOfInvoiceId: duplicateResult.duplicate_of_invoice_id,
    confidence:           duplicateResult.confidence,
    status:               savedInvoice.status,
    suggestedCategory:    categoryResult.suggested_category,
    categoryConfidence:   categoryResult.category_confidence,
    lineItemsSaved,
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
