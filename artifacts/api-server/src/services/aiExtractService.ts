/**
 * aiExtractService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Invoice extraction pipeline — images + PDFs.
 *
 * Flow:
 *  Image  → Gemini Flash (vision) → parse JSON → validate → score
 *  PDF (text layer) → pdf-parse → DeepSeek text → parse JSON → validate → score
 *  PDF (scanned / no text) → Gemini Flash (PDF as base64) → parse JSON → score
 *  PDF (encrypted / corrupted) → mark failed, set review_reason
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { openrouter } from "@workspace/integrations-openrouter-ai";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import {
  parseAndValidateLineItems,
  computeLineItemsConfidence,
  computeHeaderConfidence,
  type ValidatedLineItem,
} from "./lineItemParser.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
  opts?: { max?: number }
) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;

// ─── Models ────────────────────────────────────────────────────────────────
const VISION_MODEL = "google/gemini-flash-1.5";
const TEXT_MODEL   = "google/gemini-flash-1.5";

// ─── Types ─────────────────────────────────────────────────────────────────
export type PdfType          = "text_pdf" | "scanned_pdf" | "encrypted_pdf" | "corrupted_pdf" | "not_pdf";
export type ExtractionSource = "image" | "pdf_text" | "pdf_ocr" | "failed";
export type ExtractionStatus = "success" | "partial" | "failed";
export type ReviewReason =
  | "PDF_NO_TEXT_LAYER"
  | "OCR_REQUIRED"
  | "OCR_LOW_QUALITY"
  | "PDF_ENCRYPTED"
  | "PDF_CORRUPTED"
  | "HEADER_ONLY"
  | "LINE_ITEMS_NOT_FOUND"
  | "PARTIAL_PARSE"
  | "UNSUPPORTED_LAYOUT"
  | null;

/** Result returned by classifyPdf — exported for testing */
export interface PdfClassification {
  pdf_type:       PdfType;
  text:           string;
  page_count:     number;
  failure_reason: string | null;
}

export interface AiExtractResult {
  // Header fields
  vendor?:         string | null;
  tax_id?:         string | null;
  invoice_number?: string | null;
  date?:           string | null;
  subtotal?:       number | null;
  vat?:            number | null;
  total?:          number | null;
  currency?:       string | null;
  document_type?:  string | null;

  // Line items
  line_items:           ValidatedLineItem[];
  line_items_count:     number;

  // Confidence (deterministic, not AI self-reported)
  confidence:            number;
  header_confidence:     number;
  line_items_confidence: number;

  // Extraction metadata
  extraction_source: ExtractionSource;
  extraction_status: ExtractionStatus;
  pdf_type:          PdfType | null;
  review_reason:     ReviewReason;
  header_only:       boolean;

  // Diagnostics
  extracted_text_length?: number;
  page_count?:            number;
  failure_reason?:        string | null;
}

// ─── System prompt (shared for image + text) ────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Israeli invoice OCR specialist. Your job is to extract structured data from Hebrew and English invoices.

Return ONLY a valid JSON object — no markdown, no code blocks, no explanation, no preamble. Just raw JSON.

JSON structure:
{
  "vendor": "the business/company name at the top of the invoice or null",
  "tax_id": "Israeli tax number — look for ח.פ., ע.מ., עוסק מורשה, מספר עוסק, ח\"פ followed by digits — or null",
  "invoice_number": "invoice/receipt number — look for מספר חשבונית, חשבונית מס, מס' חשבונית, קבלה מספר — or null",
  "date": "YYYY-MM-DD format — look for תאריך, Israeli date formats like DD/MM/YYYY or DD.MM.YYYY — or null",
  "subtotal": number before VAT or null,
  "vat": VAT amount (מע\"מ) as a number or null,
  "total": total amount to pay (סה\"כ לתשלום, סך הכל) as a number or null,
  "currency": "ILS",
  "document_type": "supplier_invoice|receipt|credit_note|other",
  "line_items": [
    {
      "product_name": "product/service description in Hebrew or English",
      "barcode": "barcode digits or null",
      "sku": "SKU/מק\"ט or null",
      "quantity": number_or_null,
      "unit": "יח/kg/l/unit or null",
      "unit_price": number_or_null,
      "line_total": number_or_null,
      "discount": number_or_null,
      "vat_rate": number_or_null
    }
  ]
}

Critical rules:
- line_items must always be an array (empty [] if no line rows found — never null)
- Extract ALL visible product/service rows — do NOT skip any
- For the vendor field: look for the largest text at the top, company name in header, or "שם העסק" — this is usually the most prominent text on the document
- For amounts: Israeli invoices use commas as thousands separators (e.g. 1,234.50 = 1234.50) — parse them as numbers
- For dates: Israeli format is DD/MM/YYYY — convert to YYYY-MM-DD
- Do NOT invent values; use null only when truly absent from the document
- Numbers must be numeric types (not strings)
- Preserve Hebrew text exactly as it appears`;


// ─── JSON extraction helper ─────────────────────────────────────────────────
function extractJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch { /* fall through */ }
    }
    throw new Error("No valid JSON found in AI response");
  }
}

function safeNum(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return isFinite(n) ? n : null;
  }
  return null;
}

// ─── Build final result from raw AI JSON ────────────────────────────────────
function buildResult(
  parsed: Record<string, unknown>,
  source: ExtractionSource,
  extra: { pdf_type?: PdfType; page_count?: number; extracted_text_length?: number }
): AiExtractResult {
  const vendor         = typeof parsed.vendor === "string" ? parsed.vendor.trim() || null : null;
  const tax_id         = typeof parsed.tax_id === "string" ? parsed.tax_id.trim() || null : null;
  const invoice_number = typeof parsed.invoice_number === "string" ? parsed.invoice_number.trim() || null : null;
  const date           = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ? parsed.date : null;
  const subtotal       = safeNum(parsed.subtotal);
  const vat            = safeNum(parsed.vat);
  const total          = safeNum(parsed.total);
  const currency       = typeof parsed.currency === "string" ? parsed.currency : "ILS";
  const document_type  = typeof parsed.document_type === "string" ? parsed.document_type : "supplier_invoice";

  const raw_items        = Array.isArray(parsed.line_items) ? parsed.line_items : [];
  const line_items       = parseAndValidateLineItems(raw_items);
  const line_items_count = line_items.length;

  // Deterministic confidence (NOT from AI self-report)
  const header_confidence     = computeHeaderConfidence({ vendor, invoice_number, date, total, tax_id });
  const line_items_confidence = computeLineItemsConfidence(line_items);
  const confidence            = parseFloat(
    (header_confidence * 0.7 + line_items_confidence * 0.3).toFixed(3)
  );

  // Extraction status
  let extraction_status: ExtractionStatus = "success";
  if (confidence < 0.2) extraction_status = "failed";
  else if (!vendor || !total) extraction_status = "partial";

  // Review reason
  let review_reason: ReviewReason = null;
  if (extraction_status === "partial") review_reason = "PARTIAL_PARSE";
  if (line_items_count === 0 && raw_items.length === 0) {
    review_reason = "HEADER_ONLY";
  } else if (line_items_count === 0 && raw_items.length > 0) {
    review_reason = "LINE_ITEMS_NOT_FOUND";
  }

  return {
    vendor, tax_id, invoice_number, date,
    subtotal, vat, total, currency, document_type,
    line_items,
    line_items_count,
    confidence,
    header_confidence,
    line_items_confidence,
    extraction_source:     source,
    extraction_status,
    pdf_type:              extra.pdf_type ?? null,
    review_reason,
    header_only:           line_items_count === 0,
    page_count:            extra.page_count,
    extracted_text_length: extra.extracted_text_length,
    failure_reason:        null,
  };
}

function failedResult(
  source: ExtractionSource,
  reason: ReviewReason,
  failure_reason: string,
  pdf_type?: PdfType,
  page_count?: number
): AiExtractResult {
  return {
    line_items:            [],
    line_items_count:      0,
    confidence:            0,
    header_confidence:     0,
    line_items_confidence: 0,
    extraction_source:     source,
    extraction_status:     "failed",
    pdf_type:              pdf_type ?? null,
    review_reason:         reason,
    header_only:           true,
    failure_reason,
    page_count,
  };
}

// ─── PHASE 2: PDF Classification (exported for unit testing) ─────────────────
export async function classifyPdf(buffer: Buffer): Promise<PdfClassification> {
  try {
    const parsed     = await pdfParse(buffer, { max: 10 });
    const text       = parsed.text?.trim() ?? "";
    const page_count = parsed.numpages ?? 0;

    // Heuristic: if text too short → likely scanned (no selectable text layer)
    // Hebrew PDFs often have garbled/sparse text extraction, so use a higher threshold
    const pdf_type: PdfType = text.length >= 120 ? "text_pdf" : "scanned_pdf";

    return { pdf_type, text, page_count, failure_reason: null };
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? "";
    if (/password|encrypt/i.test(msg)) {
      return { pdf_type: "encrypted_pdf", text: "", page_count: 0, failure_reason: "PDF is password-protected" };
    }
    return { pdf_type: "corrupted_pdf", text: "", page_count: 0, failure_reason: msg.slice(0, 200) };
  }
}

// ─── PHASE 3: Text Normalization (exported for unit testing) ─────────────────
export function normalizePdfText(raw: string): string {
  return raw
    .split("\n")
    .map(line =>
      line
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(line => line.length > 0)
    .join("\n")
    .replace(/\u00a0/g, " ")
    .slice(0, 6000);
}

// ─── Image extraction (Gemini Flash vision) ──────────────────────────────────
async function extractFromImage(filePath: string): Promise<AiExtractResult> {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";

    const response = await openrouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
            { type: "text", text: "Extract ALL invoice data including every product line item. Return only the JSON." },
          ],
        },
      ],
      max_tokens: 2500,
      temperature: 0.1,
    });

    const raw    = response.choices[0]?.message?.content ?? "{}";
    const parsed = extractJson(raw);
    const result = buildResult(parsed, "image", { pdf_type: "not_pdf" });

    console.log(`[Extract:IMAGE] vendor=${result.vendor} total=${result.total} items=${result.line_items_count} conf=${result.confidence}`);
    return result;
  } catch (err) {
    console.error("[Extract:IMAGE] failed:", err);
    return failedResult("image", "PARTIAL_PARSE", (err as Error).message, "not_pdf");
  }
}

// ─── Text PDF extraction (pdf-parse → DeepSeek) ──────────────────────────────
async function extractFromTextPdf(
  _buffer: Buffer,
  filePath: string,
  text: string,
  page_count: number
): Promise<AiExtractResult> {
  try {
    const normalized = normalizePdfText(text);

    const response = await openrouter.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract ALL invoice data from the following PDF text (${page_count} pages).\nInclude every product line item visible.\n\nPDF TEXT:\n${normalized}\n\nReturn only the JSON.`,
        },
      ],
      max_tokens: 2500,
      temperature: 0.1,
    });

    const raw    = response.choices[0]?.message?.content ?? "{}";
    const parsed = extractJson(raw);
    const result = buildResult(parsed, "pdf_text", {
      pdf_type:             "text_pdf",
      page_count,
      extracted_text_length: normalized.length,
    });

    console.log(`[Extract:PDF_TEXT] vendor=${result.vendor} total=${result.total} items=${result.line_items_count} conf=${result.confidence} pages=${page_count} chars=${normalized.length}`);
    return result;
  } catch (err) {
    console.error("[Extract:PDF_TEXT] failed:", err);
    return failedResult("pdf_text", "PARTIAL_PARSE", (err as Error).message, "text_pdf", page_count);
  }
}

// ─── Scanned PDF extraction (Gemini Flash — PDF as base64) ───────────────────
// Gemini 1.5 Flash supports application/pdf natively via inline base64.
async function extractFromScannedPdf(
  buffer: Buffer,
  filePath: string,
  page_count: number
): Promise<AiExtractResult> {
  const sizeMb = buffer.length / (1024 * 1024);

  // Guard: PDFs over 8 MB may exceed token/context limits
  if (sizeMb > 8) {
    console.warn(`[Extract:PDF_OCR] PDF too large for inline OCR (${sizeMb.toFixed(1)}MB): ${path.basename(filePath)}`);
    return failedResult(
      "pdf_ocr",
      "OCR_REQUIRED",
      `PDF too large for OCR (${sizeMb.toFixed(1)}MB)`,
      "scanned_pdf",
      page_count
    );
  }

  try {
    const base64 = buffer.toString("base64");

    const response = await openrouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${base64}` },
            },
            {
              type: "text",
              text: "This is a scanned invoice PDF. Extract ALL data including every product line item. Return only the JSON.",
            },
          ],
        },
      ],
      max_tokens: 2500,
      temperature: 0.1,
    });

    const raw    = response.choices[0]?.message?.content ?? "{}";
    const parsed = extractJson(raw);
    const result = buildResult(parsed, "pdf_ocr", { pdf_type: "scanned_pdf", page_count });

    const finalResult = { ...result };
    if (result.confidence < 0.3 && !finalResult.review_reason) {
      finalResult.review_reason = "OCR_LOW_QUALITY";
    }

    console.log(`[Extract:PDF_OCR] vendor=${finalResult.vendor} total=${finalResult.total} items=${finalResult.line_items_count} conf=${finalResult.confidence} pages=${page_count}`);
    return finalResult;
  } catch (err) {
    const msg = (err as Error).message ?? "";
    console.error("[Extract:PDF_OCR] failed:", msg.slice(0, 200));
    return failedResult("pdf_ocr", "OCR_REQUIRED", msg.slice(0, 200), "scanned_pdf", page_count);
  }
}

// ─── Public entry point ──────────────────────────────────────────────────────
export async function extractInvoiceFromFile(filePath: string): Promise<AiExtractResult> {
  const ext = path.extname(filePath).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return extractFromImage(filePath);
  }

  if (ext === ".pdf") {
    const buffer         = fs.readFileSync(filePath);
    const classification = await classifyPdf(buffer);

    if (classification.pdf_type === "encrypted_pdf") {
      console.warn(`[Extract:PDF] Encrypted: ${path.basename(filePath)}`);
      return failedResult("failed", "PDF_ENCRYPTED", classification.failure_reason ?? "Encrypted PDF", "encrypted_pdf");
    }

    if (classification.pdf_type === "corrupted_pdf") {
      console.warn(`[Extract:PDF] Corrupted: ${path.basename(filePath)} — ${classification.failure_reason}`);
      return failedResult("failed", "PDF_CORRUPTED", classification.failure_reason ?? "Corrupted PDF", "corrupted_pdf");
    }

    if (classification.pdf_type === "scanned_pdf") {
      console.log(`[Extract:PDF] Scanned PDF (${classification.page_count} pages) — OCR fallback`);
      return extractFromScannedPdf(buffer, filePath, classification.page_count);
    }

    // text_pdf
    console.log(`[Extract:PDF] Text PDF (${classification.page_count} pages, ${classification.text.length} chars)`);
    return extractFromTextPdf(buffer, filePath, classification.text, classification.page_count);
  }

  console.warn(`[Extract] Unsupported file type: ${ext}`);
  return failedResult("failed", "UNSUPPORTED_LAYOUT", `Unsupported file type: ${ext}`);
}
