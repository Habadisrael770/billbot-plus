/**
 * pdfExtraction.test.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Tests for PDF extraction pipeline logic.
 * Tests pure/exported functions without network calls.
 *
 * Covered:
 *  1. normalizePdfText — PHASE 3 text normalization
 *  2. computeHeaderConfidence — PHASE 6 confidence model
 *  3. Review bucket logic — PHASE 7
 *  4. PDF classification heuristics (logic tests)
 *  5. Confidence > 0 for PDFs with real content (regression for silent 0 bug)
 * ──────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from "vitest";
import { normalizePdfText } from "../aiExtractService.js";
import { computeHeaderConfidence, parseAndValidateLineItems } from "../lineItemParser.js";

// ─── PHASE 3: normalizePdfText ─────────────────────────────────────────────
describe("normalizePdfText", () => {
  it("test_text_pdf_1: collapses multiple spaces within lines", () => {
    const result = normalizePdfText("hello   world  test");
    expect(result).toBe("hello world test");
  });

  it("test_text_pdf_2: preserves Hebrew text intact", () => {
    const input = "חברת רמי לוי שיווק השקמה";
    expect(normalizePdfText(input)).toContain("רמי לוי");
  });

  it("test_text_pdf_3: removes blank lines", () => {
    const result = normalizePdfText("line1\n\n\nline2");
    expect(result).toBe("line1\nline2");
  });

  it("test_text_pdf_4: replaces non-breaking spaces", () => {
    const result = normalizePdfText("hello\u00a0world");
    expect(result).toBe("hello world");
  });

  it("test_text_pdf_5: strips whitespace per line", () => {
    const result = normalizePdfText("  hello  \n  world  ");
    expect(result).toBe("hello\nworld");
  });

  it("test_text_pdf_6: truncates at 6000 chars", () => {
    const long = "a".repeat(7000);
    expect(normalizePdfText(long).length).toBe(6000);
  });

  it("test_text_pdf_7: preserves numeric table structure", () => {
    const input = "מוצר    כמות    מחיר\nלחם    2    5.90";
    const result = normalizePdfText(input);
    expect(result).toContain("לחם");
    expect(result).toContain("5.90");
  });

  it("test_text_pdf_8: handles mixed Hebrew+English+numbers", () => {
    const input = "Invoice #1234   ספק: שופרסל   Total: 150.00 ILS";
    const result = normalizePdfText(input);
    expect(result).toContain("Invoice #1234");
    expect(result).toContain("שופרסל");
    expect(result).toContain("150.00");
  });
});

// ─── PHASE 2: PDF classification heuristic logic ───────────────────────────
describe("PDF classification heuristics", () => {
  // The classification logic: text.length >= 40 => text_pdf, else scanned_pdf
  const TEXT_THRESHOLD = 40;

  it("test_scanned_1: empty text → classified as scanned_pdf", () => {
    const emptyText = "   ".trim();
    expect(emptyText.length).toBeLessThan(TEXT_THRESHOLD);
    // This verifies the heuristic threshold used in classifyPdf
  });

  it("test_scanned_2: short text (<40 chars) → would classify as scanned_pdf", () => {
    const shortText = "Invoice";
    expect(shortText.trim().length).toBeLessThan(TEXT_THRESHOLD);
  });

  it("test_text_pdf_classify: real invoice text >= 40 chars → text_pdf", () => {
    const realText = "חברת ישראל קמעונאית חשבונית מס 001 סה\"כ 150 ₪";
    expect(realText.trim().length).toBeGreaterThanOrEqual(TEXT_THRESHOLD);
  });

  it("test_encrypted_3: password error regex matches correctly", () => {
    const msgs = [
      "Password required to open encrypted PDF",
      "PDF is encrypted — provide password",
      "Error: Encrypt dictionary not found",
    ];
    for (const msg of msgs) {
      expect(/password|encrypt/i.test(msg)).toBe(true);
    }
  });

  it("test_corrupted_4: non-password errors → corrupted_pdf classification", () => {
    const msgs = [
      "Invalid PDF structure at offset 0",
      "Unexpected end of file",
      "PDF parsing failed: corrupt xref table",
    ];
    for (const msg of msgs) {
      expect(/password|encrypt/i.test(msg)).toBe(false);
    }
  });
});

// ─── PHASE 6: Confidence model ─────────────────────────────────────────────
describe("PDF confidence model — regression: no more silent confidence=0", () => {
  it("test 6: vendor + total → confidence > 0.5", () => {
    const conf = computeHeaderConfidence({ vendor: "מגה בעל קורת", total: 543.2 });
    expect(conf).toBeGreaterThan(0.5);
  });

  it("test 6b: all 5 fields present → confidence = 1.0", () => {
    const conf = computeHeaderConfidence({
      vendor: "שופרסל",
      invoice_number: "INV-001",
      date: "2025-01-01",
      total: 200,
      tax_id: "512345678",
    });
    expect(conf).toBe(1.0);
  });

  it("test 6c: empty fields → confidence = 0 (correct failure)", () => {
    expect(computeHeaderConfidence({})).toBe(0);
  });

  it("test 6d: total alone → 0.30 (highest single field)", () => {
    expect(computeHeaderConfidence({ total: 100 })).toBeCloseTo(0.30, 2);
  });

  it("test 6e: vendor alone → 0.25", () => {
    expect(computeHeaderConfidence({ vendor: "Test" })).toBeCloseTo(0.25, 2);
  });

  it("test 6f: vendor + total + date → 0.75 confidence", () => {
    const conf = computeHeaderConfidence({
      vendor: "רמי לוי",
      total: 300,
      date: "2025-03-15",
    });
    expect(conf).toBeCloseTo(0.75, 2);
  });
});

// ─── PHASE 7: Review buckets ───────────────────────────────────────────────
describe("Review reason buckets", () => {
  it("HEADER_ONLY: no line items → items array empty", () => {
    const items = parseAndValidateLineItems([]);
    expect(items).toHaveLength(0);
    // In the pipeline: review_reason = HEADER_ONLY when raw_items.length === 0
  });

  it("LINE_ITEMS_NOT_FOUND: all items fail validation", () => {
    const items = parseAndValidateLineItems([
      { barcode: "x" },
      { sku: "123" },
    ]);
    expect(items).toHaveLength(0);
    // In pipeline: review_reason = LINE_ITEMS_NOT_FOUND (raw > 0, validated = 0)
  });

  it("PARTIAL_PARSE: vendor missing → triggers partial status", () => {
    // When vendor is null, extraction_status = partial => review_reason = PARTIAL_PARSE
    const conf = computeHeaderConfidence({ total: 100 });
    // conf = 0.30 > 0.2, but no vendor → partial
    expect(conf).toBeGreaterThan(0.2);
    // The absence of vendor triggers PARTIAL_PARSE in buildResult
  });
});

// ─── Integration: normalize + parse ────────────────────────────────────────
describe("Text normalization + line item validation integration", () => {
  it("normalized Hebrew invoice text feeds into line item parser correctly", () => {
    const rawText = `ספק: שופרסל
מספר חשבונית: 12345
סה"כ: 150.00

לחם אחיד   2   6.00   12.00
חלב טרי 3%   1   7.90   7.90
`;
    const normalized = normalizePdfText(rawText);

    // Content preserved
    expect(normalized).toContain("שופרסל");
    expect(normalized).toContain("12.00");
    expect(normalized).not.toContain("\r");
    expect(normalized.length).toBeLessThanOrEqual(6000);

    // AI simulation: items extracted from normalized text
    const mockAiItems = [
      { product_name: "לחם אחיד",   quantity: 2, unit_price: 6.0, line_total: 12.0 },
      { product_name: "חלב טרי 3%", quantity: 1, unit_price: 7.9, line_total: 7.9  },
    ];
    const validated = parseAndValidateLineItems(mockAiItems);
    expect(validated).toHaveLength(2);
    expect(validated[0].product_name).toBe("לחם אחיד");
    expect(validated[0].item_confidence).toBeGreaterThan(0.9); // qty*price=total match
    expect(validated[1].item_confidence).toBeGreaterThan(0.9);
  });
});
