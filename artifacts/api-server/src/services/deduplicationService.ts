import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";

export interface DuplicateDetectionInput {
  file_sha256: string;
  vendor_id?: string | null;
  tax_id?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  total?: string | null;
  currentInvoiceId?: string | null;
}

export type DuplicateStatus = "unique" | "exact_duplicate" | "probable_duplicate";

export interface DuplicateDetectionResult {
  duplicate_status: DuplicateStatus;
  duplicate_of_invoice_id: string | null;
  confidence: number;
}

/**
 * detectDuplicate
 *
 * Detection logic (in priority order):
 *  1. Same file_sha256 => exact_duplicate (confidence: 1.0)
 *  2. Same vendor/tax_id AND same invoice_number => exact_duplicate (confidence: 0.98)
 *  3. Same vendor/tax_id AND same invoice_date AND same total => probable_duplicate (confidence: 0.85)
 *  4. Otherwise => unique (confidence: 1.0)
 */
export async function detectDuplicate(
  input: DuplicateDetectionInput
): Promise<DuplicateDetectionResult> {
  const { file_sha256, vendor_id, tax_id, invoice_number, invoice_date, total, currentInvoiceId } =
    input;

  // Build base query conditions to exclude the current invoice from self-matching
  const notSelf = currentInvoiceId
    ? ne(invoicesTable.id, currentInvoiceId)
    : undefined;

  // 1. Exact file hash match
  const byHash = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.file_sha256, file_sha256),
        ...(notSelf ? [notSelf] : [])
      )
    )
    .limit(1);

  if (byHash.length > 0) {
    return {
      duplicate_status: "exact_duplicate",
      duplicate_of_invoice_id: byHash[0]!.id,
      confidence: 1.0,
    };
  }

  // 2. Same vendor (by vendor_id or tax_id) + same invoice_number
  if (invoice_number && invoice_number.trim() !== "") {
    const vendorConditions = buildVendorConditions(vendor_id, tax_id);

    if (vendorConditions.length > 0) {
      for (const vendorCond of vendorConditions) {
        const byVendorAndNumber = await db
          .select({ id: invoicesTable.id })
          .from(invoicesTable)
          .where(
            and(
              vendorCond,
              eq(invoicesTable.invoice_number, invoice_number.trim()),
              ...(notSelf ? [notSelf] : [])
            )
          )
          .limit(1);

        if (byVendorAndNumber.length > 0) {
          return {
            duplicate_status: "exact_duplicate",
            duplicate_of_invoice_id: byVendorAndNumber[0]!.id,
            confidence: 0.98,
          };
        }
      }
    }
  }

  // 3. Same vendor + same invoice_date + same total
  if (invoice_date && total) {
    const vendorConditions = buildVendorConditions(vendor_id, tax_id);

    if (vendorConditions.length > 0) {
      for (const vendorCond of vendorConditions) {
        const byVendorDateTotal = await db
          .select({ id: invoicesTable.id })
          .from(invoicesTable)
          .where(
            and(
              vendorCond,
              eq(invoicesTable.invoice_date, invoice_date),
              eq(invoicesTable.total, total),
              ...(notSelf ? [notSelf] : [])
            )
          )
          .limit(1);

        if (byVendorDateTotal.length > 0) {
          return {
            duplicate_status: "probable_duplicate",
            duplicate_of_invoice_id: byVendorDateTotal[0]!.id,
            confidence: 0.85,
          };
        }
      }
    }
  }

  return {
    duplicate_status: "unique",
    duplicate_of_invoice_id: null,
    confidence: 1.0,
  };
}

function buildVendorConditions(
  vendor_id?: string | null,
  tax_id?: string | null
) {
  const conditions = [];

  if (vendor_id) {
    conditions.push(eq(invoicesTable.vendor_id, vendor_id));
  }
  if (tax_id && tax_id.trim() !== "") {
    conditions.push(eq(invoicesTable.tax_id, tax_id.trim()));
  }

  return conditions;
}
