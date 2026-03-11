import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { db } from "@workspace/db";
import { invoicesTable, vendorsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  processInvoice,
  updateInvoiceStatus,
  markNotDuplicate,
  updateInvoiceCategory,
} from "../services/invoiceProcessingService.js";
import { mergeVendorAlias } from "../services/vendorService.js";

const router: IRouter = Router();

// --- Multer setup ---
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("סוג קובץ לא נתמך. מותרים: PDF, JPG, PNG"));
    }
  },
});

// --- Helpers ---
function buildSelectFields() {
  return {
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
    sourceType: invoicesTable.source_type,
    documentType: invoicesTable.document_type,
    suggestedCategory: invoicesTable.suggested_category,
    finalCategory: invoicesTable.final_category,
    categoryConfidence: invoicesTable.category_confidence,
    createdAt: invoicesTable.created_at,
  };
}

/**
 * GET /api/invoices
 * Returns all invoices joined with vendor canonical name.
 */
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select(buildSelectFields())
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
 * GET /api/invoices/summary
 * Returns aggregate stats for the dashboard summary cards.
 */
router.get("/summary", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_documents,
        COUNT(*) FILTER (WHERE document_type = 'supplier_invoice')::int AS supplier_invoices,
        COALESCE(SUM(total::numeric), 0)::numeric AS total_amount,
        COALESCE(SUM(vat::numeric), 0)::numeric AS total_vat,
        COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review,
        COUNT(*) FILTER (WHERE duplicate_status IN ('duplicate', 'probable_duplicate'))::int AS suspected_duplicates
      FROM invoices
    `);
    res.json(result.rows[0] ?? {});
  } catch (err) {
    console.error("Failed to fetch summary:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

/**
 * POST /api/invoices/process
 * Processes an extracted invoice through the full pipeline (JSON body, filePath already on disk).
 */
router.post("/process", async (req, res) => {
  const { filePath, extracted, extractionConfidence, sourceType, documentType } =
    req.body as {
      filePath: string;
      extracted: Record<string, unknown>;
      extractionConfidence?: number;
      sourceType?: string;
      documentType?: string;
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
      sourceType: (sourceType as "upload" | "camera" | "email") ?? "upload",
      documentType: (documentType as "supplier_invoice" | "receipt" | "credit_note" | "other") ?? "supplier_invoice",
    });
    res.status(201).json(result);
  } catch (err) {
    console.error("Invoice processing failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Invoice processing failed: ${message}` });
  }
});

/**
 * POST /api/invoices/upload
 * Accepts a file upload (PDF/JPG/PNG) and runs it through the invoice pipeline.
 * source_type is derived from query param or defaults to 'upload'.
 */
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "הקובץ גדול מדי. מקסימום 20MB" });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "שגיאה בהעלאת קובץ" });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "לא נשלח קובץ" });
      return;
    }

    const sourceType = (req.query["source"] as string) === "camera" ? "camera" : "upload";
    const filePath = req.file.path;

    // Extract minimal metadata from request body (optional manual override)
    const extracted = req.body?.extracted
      ? (JSON.parse(req.body.extracted as string) as Record<string, unknown>)
      : {};

    try {
      const result = await processInvoice({
        filePath,
        extracted,
        sourceType,
        documentType: "supplier_invoice",
      });
      res.status(201).json({ ...result, filePath });
    } catch (err) {
      console.error("Upload processing failed:", err);
      // Clean up file on error
      try { fs.unlinkSync(filePath); } catch {}
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: `עיבוד חשבונית נכשל: ${message}` });
    }
  }
);

/**
 * PATCH /api/invoices/:id/approve
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
 * PATCH /api/invoices/:id/category
 * Allows the user to override the suggested category.
 */
router.patch("/:id/category", async (req, res) => {
  const { id } = req.params as { id: string };
  const { finalCategory } = req.body as { finalCategory?: string };

  if (!finalCategory || typeof finalCategory !== "string") {
    res.status(400).json({ error: "finalCategory is required" });
    return;
  }

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

    await updateInvoiceCategory(id, finalCategory.trim());
    res.json({ success: true, message: "Category updated" });
  } catch (err) {
    console.error("Failed to update category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

/**
 * PATCH /api/invoices/:id/merge-alias
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
    await db
      .update(invoicesTable)
      .set({ vendor_id: targetVendorId, updated_at: new Date() })
      .where(eq(invoicesTable.id, id));

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
