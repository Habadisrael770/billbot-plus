import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as XLSX from "@e965/xlsx";
import { db } from "@workspace/db";
import { invoicesTable, vendorsTable, invoiceLineItemsTable } from "@workspace/db/schema";
import { eq, sql, isNull } from "drizzle-orm";
import {
  processInvoice,
  updateInvoiceStatus,
  markNotDuplicate,
  updateInvoiceCategory,
} from "../services/invoiceProcessingService.js";
import { mergeVendorAlias } from "../services/vendorService.js";
import { extractInvoiceFromFile } from "../services/aiExtractService.js";
import { getGmailClient } from "../services/gmailOAuth.js";
import { assertUploadsPath } from "../utils/assertUploadsPath.js";

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
    isForeign: invoicesTable.is_foreign,
    supplierCountry: invoicesTable.supplier_country,
    createdAt: invoicesTable.created_at,
    extractionSource: invoicesTable.extraction_source,
    extractionStatus: invoicesTable.extraction_status,
    reviewReason: invoicesTable.review_reason,
    pdfType: invoicesTable.pdf_type,
    lineItemsCount: invoicesTable.line_items_count,
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
 * GET /api/invoices/:id/file
 * Streams the original invoice file (PDF / image).
 */
router.get("/:id/file", async (req, res) => {
  try {
    const { id } = req.params;
    const [inv] = await db
      .select({ filePath: invoicesTable.file_path })
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .limit(1);

    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    let absPath: string;
    try {
      absPath = assertUploadsPath(inv.filePath);
    } catch {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.sendFile(absPath);
  } catch (err) {
    console.error("Failed to serve invoice file:", err);
    return res.status(500).json({ error: "Failed to serve file" });
  }
});

/**
 * GET /api/invoices/summary
 * Returns aggregate stats for the dashboard summary cards.
 */
router.get("/summary", async (req, res) => {
  try {
    const yearParam  = Number(req.query.year)  || null;
    const monthParam = Number(req.query.month) || null; // 1-based

    let dateFilter = sql``;
    if (yearParam && monthParam) {
      const lastDay = new Date(yearParam, monthParam, 0).getDate(); // correct last day for any month
      const start = `${yearParam}-${String(monthParam).padStart(2, "0")}-01`;
      const end   = `${yearParam}-${String(monthParam).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      dateFilter  = sql` WHERE invoice_date BETWEEN ${start}::date AND ${end}::date`;
    }

    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_documents,
        COUNT(*) FILTER (WHERE document_type = 'supplier_invoice')::int AS supplier_invoices,
        COALESCE(SUM(total::numeric), 0)::numeric AS total_amount,
        COALESCE(SUM(vat::numeric), 0)::numeric AS total_vat,
        COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review,
        COUNT(*) FILTER (WHERE duplicate_status IN ('duplicate', 'probable_duplicate'))::int AS suspected_duplicates
      FROM invoices${dateFilter}
    `);
    res.json(result.rows[0] ?? {});
  } catch (err) {
    console.error("Failed to fetch summary:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

/**
 * POST /api/invoices/manual
 * Creates a manual invoice entry without file upload.
 */
router.post("/manual", async (req, res) => {
  try {
    const { vendorName, total, invoiceDate, invoiceNumber, notes } = req.body as {
      vendorName?: string;
      total?: number;
      invoiceDate?: string;
      invoiceNumber?: string;
      notes?: string;
    };
    if (!vendorName?.trim()) {
      res.status(400).json({ error: "שם ספק חסר" });
      return;
    }
    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        raw_vendor_name: vendorName.trim(),
        normalized_vendor_name: vendorName.trim().toLowerCase(),
        total: total != null ? String(total) : null,
        invoice_date: invoiceDate ?? null,
        invoice_number: invoiceNumber?.trim() ?? null,
        file_path: "manual",
        file_sha256: "manual-" + Date.now(),
        source_type: "manual",
        document_type: "supplier_invoice",
        status: "pending_review",
        duplicate_status: "unique",
      })
      .returning();
    res.status(201).json(invoice);
  } catch (err) {
    console.error("Failed to create manual invoice:", err);
    res.status(500).json({ error: "שגיאה ביצירת חשבונית" });
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

  // Security: reject any filePath that resolves outside the uploads directory.
  // assertUploadsPath canonicalises the path (eliminating all ".." components)
  // and uses path.relative() for containment — not startsWith() — so traversal
  // via absolute paths or mixed separators is not possible.
  let canonicalFilePath: string;
  try {
    canonicalFilePath = assertUploadsPath(filePath);
  } catch {
    res.status(400).json({ error: "Invalid file path" });
    return;
  }

  try {
    const result = await processInvoice({
      filePath: canonicalFilePath,
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

    try {
      // AI extraction — reads the file and extracts invoice data via vision model
      const aiResult = await extractInvoiceFromFile(filePath);
      // Allow manual override from request body
      const manualExtracted = req.body?.extracted
        ? (JSON.parse(req.body.extracted as string) as Record<string, unknown>)
        : {};
      const extracted = { ...aiResult, ...manualExtracted };
      const extractionConfidence = aiResult.confidence;

      const result = await processInvoice({
        filePath,
        extracted,
        extractionConfidence,
        sourceType,
        documentType: (aiResult.document_type as "supplier_invoice" | "receipt" | "credit_note" | "other") ?? "supplier_invoice",
        extractionMeta: {
          line_items:            aiResult.line_items,
          line_items_count:      aiResult.line_items_count,
          extraction_source:     aiResult.extraction_source,
          extraction_status:     aiResult.extraction_status,
          review_reason:         aiResult.review_reason,
          pdf_type:              aiResult.pdf_type,
          header_confidence:     aiResult.header_confidence,
          line_items_confidence: aiResult.line_items_confidence,
        },
      });
      res.status(201).json({
        ...result,
        filePath,
        extraction_source:     aiResult.extraction_source,
        extraction_status:     aiResult.extraction_status,
        review_reason:         aiResult.review_reason,
        pdf_type:              aiResult.pdf_type,
        line_items_count:      aiResult.line_items_count,
        header_confidence:     aiResult.header_confidence,
        line_items_confidence: aiResult.line_items_confidence,
        overall_confidence:    aiResult.confidence,
      });
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
 * POST /api/invoices/re-extract
 * Background re-extraction for invoices that were saved without AI processing.
 * Processes up to `limit` (default 20) invoices per call.
 */
router.post("/re-extract", async (req, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? req.body?.limit ?? 20), 50);
  try {
    // Process newest first, skip files clearly not on disk (old /tmp or missing paths)
    const pending = await db
      .select({
        id:       invoicesTable.id,
        filePath: invoicesTable.file_path,
      })
      .from(invoicesTable)
      .where(isNull(invoicesTable.extraction_status))
      .orderBy(sql`${invoicesTable.created_at} DESC`)
      .limit(limit);

    if (pending.length === 0) {
      return res.json({ processed: 0, remaining: 0, message: "כל החשבוניות כבר עובדו" });
    }

    // Import services once
    const { normalizeVendorName } = await import("../utils/normalizeVendorName.js");
    const { findOrCreateVendor } = await import("../services/vendorService.js");
    const { suggestCategory } = await import("../services/categoryService.js");
    const { detectForeignSupplier } = await import("../utils/foreignSupplierDetector.js");

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process 5 in parallel for speed
    const CONCURRENCY = 5;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (inv) => {
        try {
          const fp = inv.filePath;
          if (!fp || fp === "manual" || fp.startsWith("/tmp") || !fs.existsSync(fp)) {
            await db.update(invoicesTable)
              .set({ extraction_status: "failed", extraction_source: "failed" } as Record<string, unknown>)
              .where(eq(invoicesTable.id, inv.id));
            failed++;
            return;
          }

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

          // Strip null bytes (0x00) – PostgreSQL rejects them in UTF-8 text columns
          const s = (v: string | null | undefined): string | null =>
            v ? v.replace(/\0/g, "").trim() || null : null;

          await db.update(invoicesTable)
            .set({
              raw_vendor_name:        s(rawVendor),
              normalized_vendor_name: s(normalizedVendor),
              vendor_id:              vendorId,
              tax_id:                 s(aiResult.tax_id),
              invoice_number:         s(aiResult.invoice_number),
              invoice_date:           s(aiResult.date),
              subtotal:               aiResult.subtotal  != null ? String(aiResult.subtotal)  : null,
              vat:                    vat                != null ? String(vat)                 : null,
              total:                  aiResult.total     != null ? String(aiResult.total)      : null,
              currency:               s(aiResult.currency) ?? "ILS",
              document_type:          (s(aiResult.document_type) ?? "supplier_invoice") as "supplier_invoice" | "receipt" | "credit_note" | "other",
              extraction_confidence:  String(aiResult.confidence ?? 0),
              extraction_source:      s(aiResult.extraction_source),
              extraction_status:      s(aiResult.extraction_status),
              review_reason:          s(aiResult.review_reason),
              pdf_type:               s(aiResult.pdf_type),
              line_items_count:       aiResult.line_items_count   ?? 0,
              suggested_category:     s(categoryResult.suggested_category),
              final_category:         s(categoryResult.suggested_category),
              is_foreign:             foreignResult.is_foreign,
              supplier_country:       s(foreignResult.country),
            } as Record<string, unknown>)
            .where(eq(invoicesTable.id, inv.id));

          processed++;
        } catch (err: any) {
          failed++;
          console.error("[re-extract] FAIL:", JSON.stringify({
            msg:    err?.message?.slice(0, 150),
            cause:  err?.cause?.message?.slice(0, 150),
            code:   err?.cause?.code,
            detail: err?.cause?.detail?.slice(0, 150),
          }));
          errors.push((err?.cause?.message ?? err?.message ?? String(err)).slice(0, 300));
        }
      }));
    }

    const remaining = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM invoices WHERE extraction_status IS NULL`);
    const remainingCount = (remaining.rows[0] as { cnt: number })?.cnt ?? 0;

    return res.json({ processed, failed, remaining: remainingCount, errors: errors.slice(0, 3) });
  } catch (err) {
    console.error("re-extract error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

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

// ─────────────────────────────────────────────
// GET /api/invoices/:id/line-items
// Returns line items for a specific invoice
// ─────────────────────────────────────────────
router.get("/:id/line-items", async (req, res) => {
  try {
    const { id } = req.params;
    const items = await db
      .select({
        id: invoiceLineItemsTable.id,
        productName: invoiceLineItemsTable.product_name,
        barcode: invoiceLineItemsTable.barcode,
        sku: invoiceLineItemsTable.sku,
        quantity: invoiceLineItemsTable.quantity,
        unitPrice: invoiceLineItemsTable.unit_price,
        lineTotal: invoiceLineItemsTable.line_total,
        discount: invoiceLineItemsTable.discount,
        vatRate: invoiceLineItemsTable.vat_rate,
        itemConfidence: invoiceLineItemsTable.item_confidence,
        sortOrder: invoiceLineItemsTable.sort_order,
      })
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoice_id, id))
      .orderBy(invoiceLineItemsTable.sort_order);

    res.json(items);
  } catch (err) {
    console.error("Failed to fetch line items:", err);
    res.status(500).json({ error: "Failed to fetch line items" });
  }
});

// ─────────────────────────────────────────────
// POST /api/invoices/scan-email
// Accept pasted email text or .eml file, extract invoice data
// ─────────────────────────────────────────────
const emlUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/scan-email", emlUpload.single("file"), async (req, res) => {
  try {
    const emailText: string = req.body.emailText ?? "";
    const fileContent: string = req.file ? req.file.buffer.toString("utf-8") : "";
    const rawText = (emailText + "\n" + fileContent).trim();

    if (!rawText) {
      return res.status(400).json({ error: "לא סופק תוכן מייל" });
    }

    // --- Regex extraction ---
    const amountMatch = rawText.match(/(?:סכום|total|amount|סה"כ)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
    const vatMatch    = rawText.match(/(?:מע"מ|vat|tax)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
    const dateMatch   = rawText.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
    const invNumMatch = rawText.match(/(?:חשבונית|invoice|inv)[^\d#]*[#]?\s*(\w+[-\w]*)/i);
    const vendorMatch = rawText.match(/(?:from|מאת|שולח):?\s*([A-Za-z\u0590-\u05FF][\w\u0590-\u05FF\s&.'-]{2,40})/i);

    // Parse amount: handle both 1,234.50 (en) and 1.234,50 (eu)
    function parseLocalAmount(s: string | undefined): number | null {
      if (!s) return null;
      // European: 1.234,50 → comma is decimal
      if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", "."));
      // English: 1,234.50 → comma is thousand sep
      return parseFloat(s.replace(/,/g, ""));
    }

    // Normalize date dd/mm/yyyy or dd.mm.yy → yyyy-mm-dd
    function normalizeDate(s: string | null): string | null {
      if (!s) return null;
      const parts = s.split(/[\/\-.]/);
      if (parts.length !== 3) return s;
      let [d, m, y] = parts as [string, string, string];
      if (y!.length === 2) y = (parseInt(y!) < 50 ? "20" : "19") + y;
      if (parseInt(d!) > 12) return `${y}-${m!.padStart(2,"0")}-${d!.padStart(2,"0")}`;
      return `${y}-${d!.padStart(2,"0")}-${m!.padStart(2,"0")}`;
    }

    const total   = parseLocalAmount(amountMatch?.[1]);
    const vat     = parseLocalAmount(vatMatch?.[1]);
    const invDate = normalizeDate(dateMatch?.[1] ?? null);
    const invNum  = invNumMatch?.[1]?.trim() ?? null;
    const vendor  = vendorMatch?.[1]?.trim() ?? "מייל — לא זוהה ספק";

    // Skip saving if no meaningful data extracted
    if (!total && !vendor.startsWith("מייל")) {
      return res.json({ success: false, count: 0, reason: "no_data" });
    }

    // Write to a real file so processInvoice can hash + dedup
    const txtName = `email-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
    const txtPath = path.join(UPLOADS_DIR, txtName);
    fs.writeFileSync(txtPath, rawText, "utf-8");

    const result = await processInvoice({
      filePath: txtPath,
      extracted: { vendor, invoice_number: invNum, date: invDate, total, vat, subtotal: total && vat ? total - vat : null, currency: "ILS" },
      extractionConfidence: 0.5,
      sourceType: "email",
      documentType: "supplier_invoice",
    });

    return res.json({ success: true, count: 1, id: result.invoiceId, vendor, total });
  } catch (err) {
    console.error("scan-email error:", err);
    return res.status(500).json({ error: "שגיאה בעיבוד המייל" });
  }
});

// ─────────────────────────────────────────────
// Shared helper: fetch rows with optional date range
// ─────────────────────────────────────────────
async function fetchExportRows(from?: string, to?: string) {
  let query = db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoice_number,
      invoiceDate: invoicesTable.invoice_date,
      rawVendor: invoicesTable.raw_vendor_name,
      canonicalVendor: vendorsTable.canonical_name,
      subtotal: invoicesTable.subtotal,
      vat: invoicesTable.vat,
      total: invoicesTable.total,
      currency: invoicesTable.currency,
      category: invoicesTable.final_category,
      suggestedCategory: invoicesTable.suggested_category,
      sourceType: invoicesTable.source_type,
      documentType: invoicesTable.document_type,
      status: invoicesTable.status,
      duplicateStatus: invoicesTable.duplicate_status,
      filePath: invoicesTable.file_path,
    })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendor_id, vendorsTable.id))
    .$dynamic();

  if (from && to) {
    query = query.where(sql`${invoicesTable.invoice_date} BETWEEN ${from} AND ${to}`);
  } else if (from) {
    query = query.where(sql`${invoicesTable.invoice_date} >= ${from}`);
  } else if (to) {
    query = query.where(sql`${invoicesTable.invoice_date} <= ${to}`);
  }

  return query.orderBy(sql`${invoicesTable.created_at} desc`);
}

function buildXlsx(rows: Awaited<ReturnType<typeof fetchExportRows>>, host: string) {
  const wsData = rows.map((r, i) => ({
    "#": i + 1,
    "מספר חשבונית": r.invoiceNumber ?? "",
    "תאריך": r.invoiceDate ?? "",
    "ספק גולמי": r.rawVendor ?? "",
    "ספק מזוהה": r.canonicalVendor ?? "",
    "סכום לפני מע\"מ": r.subtotal ? Number(r.subtotal) : "",
    "מע\"מ": r.vat ? Number(r.vat) : "",
    "סה\"כ": r.total ? Number(r.total) : "",
    "מטבע": r.currency,
    "קטגוריה": r.category ?? r.suggestedCategory ?? "",
    "מקור": r.sourceType ?? "",
    "סוג מסמך": r.documentType ?? "",
    "סטטוס": r.status,
    "כפילות": r.duplicateStatus,
    "קישור לקובץ": r.filePath && r.filePath !== "manual" ? `${host}/uploads/${path.basename(r.filePath)}` : "",
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData, { skipHeader: false });
  ws["!cols"] = [
    { wch: 4 }, { wch: 16 }, { wch: 12 }, { wch: 26 }, { wch: 26 },
    { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 22 },
    { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "חשבוניות");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─────────────────────────────────────────────
// GET /api/invoices/export?from=YYYY-MM-DD&to=YYYY-MM-DD
// Export invoices as XLSX with optional date range
// ─────────────────────────────────────────────
router.get("/export", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = await fetchExportRows(from, to);
    const HOST = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000";
    const buffer = buildXlsx(rows, HOST);
    const dateTag = new Date().toLocaleDateString("he-IL").replace(/\//g, "-");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="חשבוניות_${dateTag}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error("export error:", err);
    res.status(500).json({ error: "שגיאה בייצוא" });
  }
});

// ─────────────────────────────────────────────
// GET /api/invoices/export-zip?from=&to=
// ZIP of all invoice files + XLSX summary
// ─────────────────────────────────────────────
router.get("/export-zip", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = await fetchExportRows(from, to);
    const HOST = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000";
    const xlsxBuffer = buildXlsx(rows, HOST);

    const archiver = (await import("archiver")).default;
    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
      archive.append(Buffer.from(xlsxBuffer), { name: "חשבוניות.xlsx" });
      for (const r of rows) {
        if (r.filePath && r.filePath !== "manual" && fs.existsSync(r.filePath)) {
          archive.file(r.filePath, { name: `files/${path.basename(r.filePath)}` });
        }
      }
      archive.finalize();
    });
    const dateTag = new Date().toLocaleDateString("he-IL").replace(/\//g, "-");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="חשבוניות_${dateTag}.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    console.error("export-zip error:", err);
    res.status(500).json({ error: "שגיאה בייצוא ZIP" });
  }
});

// ─────────────────────────────────────────────
// POST /api/invoices/send-accountant-email
// Send XLSX report to a given email via Gmail
// ─────────────────────────────────────────────
router.post("/send-accountant-email", async (req, res) => {
  try {
    const { toEmail, from, to } = req.body as { toEmail?: string; from?: string; to?: string };
    if (!toEmail?.trim()) { res.status(400).json({ error: "כתובת מייל חסרה" }); return; }

    // Get Gmail client using stored OAuth tokens
    let gmailClient: Awaited<ReturnType<typeof getGmailClient>>;
    try {
      gmailClient = await getGmailClient();
    } catch {
      res.status(503).json({ error: "Gmail לא מחובר. חבר את Gmail בהגדרות ← אינטגרציות לפני שליחת דוח במייל." });
      return;
    }

    const rows = await fetchExportRows(from, to);
    const HOST = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000";
    const xlsxBuffer = buildXlsx(rows, HOST);
    const dateTag = new Date().toLocaleDateString("he-IL").replace(/\//g, "-");

    const base64xlsx = xlsxBuffer.toString("base64");
    const boundary = "BillBOT_boundary";
    const rawEmail = [
      `From: ${gmailClient.email}`,
      `To: ${toEmail.trim()}`,
      `Subject: =?UTF-8?B?${Buffer.from(`דוח חשבוניות BillBOT+ — ${dateTag}`).toString("base64")}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      `שלום,\n\nמצורף דוח חשבוניות מ-BillBOT+.\n${rows.length} חשבוניות בתקופה שנבחרה.\n\nנשלח אוטומטית ממערכת BillBOT+`,
      "",
      `--${boundary}`,
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="חשבוניות_${dateTag}.xlsx"`,
      "",
      base64xlsx,
      `--${boundary}--`,
    ].join("\r\n");

    const encodedEmail = Buffer.from(rawEmail).toString("base64url");
    await gmailClient.client.users.messages.send({ userId: "me", requestBody: { raw: encodedEmail } });

    res.json({ success: true, message: `הדוח נשלח ל-${toEmail}` });
  } catch (err) {
    console.error("send-email error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "שגיאה בשליחת מייל" });
  }
});

// ─────────────────────────────────────────────
// POST /api/invoices/send-accountant
// Send Excel report via Telegram
// ─────────────────────────────────────────────
router.post("/send-accountant", async (_req, res) => {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    res.status(503).json({ error: "טוקן טלגרם לא מוגדר. הוסף TELEGRAM_BOT_TOKEN ו-TELEGRAM_CHAT_ID." });
    return;
  }

  try {
    const rows = await db
      .select({
        invoiceNumber: invoicesTable.invoice_number,
        invoiceDate: invoicesTable.invoice_date,
        rawVendor: invoicesTable.raw_vendor_name,
        canonicalVendor: vendorsTable.canonical_name,
        total: invoicesTable.total,
        vat: invoicesTable.vat,
        currency: invoicesTable.currency,
        category: invoicesTable.final_category,
        suggestedCategory: invoicesTable.suggested_category,
        status: invoicesTable.status,
        duplicateStatus: invoicesTable.duplicate_status,
        filePath: invoicesTable.file_path,
      })
      .from(invoicesTable)
      .leftJoin(vendorsTable, eq(invoicesTable.vendor_id, vendorsTable.id))
      .orderBy(sql`${invoicesTable.created_at} desc`);

    const HOST = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:3000";

    // Build Excel
    const wsData = rows.map((r, i) => ({
      "#": i + 1,
      "מספר חשבונית": r.invoiceNumber ?? "",
      "תאריך": r.invoiceDate ?? "",
      "ספק": r.canonicalVendor ?? r.rawVendor ?? "",
      "סה\"כ": r.total ? Number(r.total) : "",
      "מע\"מ": r.vat ? Number(r.vat) : "",
      "מטבע": r.currency,
      "קטגוריה": r.category ?? r.suggestedCategory ?? "",
      "סטטוס": r.status,
      "קישור": r.filePath ? `${HOST}/uploads/${path.basename(r.filePath)}` : "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "חשבוניות");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    // Send Excel file via Telegram
    const FormDataNode = (await import("form-data")).default;
    const form = new FormDataNode();
    form.append("chat_id", CHAT_ID);
    form.append("caption", `📊 דוח חשבוניות — ${new Date().toLocaleDateString("he-IL")}\n${rows.length} חשבוניות`);
    form.append("document", buffer, { filename: `חשבוניות_${Date.now()}.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: "POST",
      body: form as any,
      headers: form.getHeaders() as Record<string, string>,
    });

    const tgData = await tgRes.json() as { ok: boolean; description?: string };
    if (!tgData.ok) throw new Error(tgData.description ?? "Telegram API error");

    res.json({ ok: true, success: true, message: "הדוח נשלח בהצלחה" });
  } catch (err) {
    console.error("send-accountant error:", err);
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "שגיאה בשליחה" });
  }
});

// ── DELETE /invoices/all — wipe every invoice + related rows ──────────────
router.delete("/all", async (_req, res) => {
  try {
    await db.execute(sql`DELETE FROM invoice_line_items`);
    await db.execute(sql`DELETE FROM invoice_extraction_jobs`);
    await db.execute(sql`DELETE FROM invoices`);
    await db.execute(sql`DELETE FROM vendor_aliases`);
    await db.execute(sql`DELETE FROM vendors`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[invoices/delete-all]", err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
