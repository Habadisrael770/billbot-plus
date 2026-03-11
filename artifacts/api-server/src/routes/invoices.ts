import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { invoicesTable, vendorsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { processInvoice, updateInvoiceStatus, markNotDuplicate } from "../services/invoiceProcessingService.js";
import { mergeVendorAlias } from "../services/vendorService.js";

const router: IRouter = Router();

/**
 * GET /api/invoices
 * Returns all invoices joined with vendor canonical name.
 */
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: invoicesTable.id,
        rawVendorName: invoicesTable.raw_vendor_name,
        normalizedVendorName: invoicesTable.normalized_vendor_name,
        canonicalVendorName: vendorsTable.canonical_name,
        taxId: invoicesTable.tax_id,
        invoiceNumber: invoicesTable.invoice_number,
        invoiceDate: invoicesTable.invoice_date,
        subtotal: invoicesTable.subtotal,
        vat: invoicesTable.vat,
        total: invoicesTable.total,
        currency: invoicesTable.currency,
        filePath: invoicesTable.file_path,
        duplicateStatus: invoicesTable.duplicate_status,
        duplicateOfInvoiceId: invoicesTable.duplicate_of_invoice_id,
        status: invoicesTable.status,
        extractionConfidence: invoicesTable.extraction_confidence,
        vendorId: invoicesTable.vendor_id,
        createdAt: invoicesTable.created_at,
      })
      .from(invoicesTable)
      .leftJoin(vendorsTable, eq(invoicesTable.vendor_id, vendorsTable.id))
      .orderBy(invoicesTable.created_at);

    res.json(rows);
  } catch (err) {
    console.error("Failed to list invoices:", err);
    res.status(500).json({ error: "Failed to list invoices" });
  }
});

/**
 * POST /api/invoices/process
 * Processes an extracted invoice through the full pipeline.
 */
router.post("/process", async (req, res) => {
  const { filePath, extracted, extractionConfidence } = req.body as {
    filePath: string;
    extracted: Record<string, unknown>;
    extractionConfidence?: number;
  };

  if (!filePath || typeof filePath !== "string") {
    res.status(400).json({ error: "filePath is required" });
    return;
  }

  if (!extracted || typeof extracted !== "object") {
    res.status(400).json({ error: "extracted invoice data is required" });
    return;
  }

  try {
    const result = await processInvoice({
      filePath,
      extracted: extracted as Parameters<typeof processInvoice>[0]["extracted"],
      extractionConfidence,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error("Invoice processing failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Invoice processing failed: ${message}` });
  }
});

/**
 * PATCH /api/invoices/:id/approve
 * Approves an invoice.
 */
router.patch("/:id/approve", async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const existing = await db
      .select({ id: invoicesTable.id })
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    await updateInvoiceStatus(id, "approved");
    res.json({ success: true, message: "Invoice approved" });
  } catch (err) {
    console.error("Failed to approve invoice:", err);
    res.status(500).json({ error: "Failed to approve invoice" });
  }
});

/**
 * PATCH /api/invoices/:id/mark-not-duplicate
 * Marks an invoice as not a duplicate.
 */
router.patch("/:id/mark-not-duplicate", async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const existing = await db
      .select({ id: invoicesTable.id })
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    await markNotDuplicate(id);
    res.json({ success: true, message: "Invoice marked as not duplicate" });
  } catch (err) {
    console.error("Failed to update invoice:", err);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

/**
 * PATCH /api/invoices/:id/merge-alias
 * Merges a vendor alias for the invoice's vendor.
 */
router.patch("/:id/merge-alias", async (req, res) => {
  const { id } = req.params as { id: string };
  const { aliasName, targetVendorId } = req.body as {
    aliasName?: string;
    targetVendorId?: string;
  };

  if (!aliasName || !targetVendorId) {
    res.status(400).json({ error: "aliasName and targetVendorId are required" });
    return;
  }

  try {
    // Re-point this invoice's vendor to the target vendor
    await db
      .update(invoicesTable)
      .set({ vendor_id: targetVendorId, updated_at: new Date() })
      .where(eq(invoicesTable.id, id));

    // Register the alias under the target vendor
    const invoice = await db
      .select({ raw_vendor_name: invoicesTable.raw_vendor_name })
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .limit(1);

    if (invoice.length > 0 && invoice[0]!.raw_vendor_name) {
      await mergeVendorAlias(targetVendorId, aliasName);
    }

    res.json({ success: true, message: "Vendor alias merged" });
  } catch (err) {
    console.error("Failed to merge alias:", err);
    res.status(500).json({ error: "Failed to merge alias" });
  }
});

export default router;
