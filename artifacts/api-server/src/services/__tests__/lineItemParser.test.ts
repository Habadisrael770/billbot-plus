import { describe, it, expect } from "vitest";
import {
  parseAndValidateLineItems,
  computeLineItemsConfidence,
  computeHeaderConfidence,
} from "../lineItemParser.js";

// ─── parseAndValidateLineItems ───────────────────────────────────────────────
describe("parseAndValidateLineItems", () => {
  it("returns empty array for empty input", () => {
    expect(parseAndValidateLineItems([])).toEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(parseAndValidateLineItems(null as unknown as unknown[])).toEqual([]);
    expect(parseAndValidateLineItems("x" as unknown as unknown[])).toEqual([]);
  });

  it("parses a well-formed item with all fields", () => {
    const raw = [
      {
        product_name: "חמאה טרה 250g",
        quantity: 2,
        unit_price: 7.5,
        line_total: 15,
        barcode: "729272110222",
        sku: null,
        unit: "יח",
        discount: null,
        vat_rate: 17,
      },
    ];
    const result = parseAndValidateLineItems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe("חמאה טרה 250g");
    expect(result[0].quantity).toBe(2);
    expect(result[0].unit_price).toBe(7.5);
    expect(result[0].line_total).toBe(15);
    expect(result[0].barcode).toBe("729272110222");
    expect(result[0].item_confidence).toBeGreaterThan(0.8); // qty*price matches total
  });

  it("accepts item with product_name + total only (partial row)", () => {
    const raw = [{ product_name: "לחם אחיד", line_total: 6 }];
    const result = parseAndValidateLineItems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe("לחם אחיד");
  });

  it("rejects item with no product_name and no price fields", () => {
    const raw = [{ barcode: "123" }];
    const result = parseAndValidateLineItems(raw);
    expect(result).toHaveLength(0);
  });

  it("rejects item with negative quantity", () => {
    const raw = [{ product_name: "item", quantity: -5, line_total: 10 }];
    const result = parseAndValidateLineItems(raw);
    expect(result).toHaveLength(0);
  });

  it("handles string numbers (OCR output style)", () => {
    const raw = [{ product_name: "מוצר", quantity: "3", unit_price: "5,50", line_total: "16.50" }];
    const result = parseAndValidateLineItems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].unit_price).toBe(5.5);
  });

  it("rejects item with invalid barcode (too short)", () => {
    const raw = [{ product_name: "test", line_total: 5, barcode: "12" }];
    const result = parseAndValidateLineItems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].barcode).toBeNull(); // barcode rejected but item kept
  });

  it("filters high-confidence items from mixed batch", () => {
    const raw = [
      { product_name: "Good product", quantity: 1, unit_price: 10, line_total: 10 },
      { barcode: "xyz" }, // garbage — no name or price
      { product_name: "Also good", line_total: 25 },
    ];
    const result = parseAndValidateLineItems(raw);
    expect(result).toHaveLength(2);
  });

  it("truncates product_name to 200 chars", () => {
    const long = "א".repeat(300);
    const raw = [{ product_name: long, line_total: 10 }];
    const result = parseAndValidateLineItems(raw);
    expect(result[0].product_name!.length).toBe(200);
  });
});

// ─── computeLineItemsConfidence ──────────────────────────────────────────────
describe("computeLineItemsConfidence", () => {
  it("returns 0 for empty items", () => {
    expect(computeLineItemsConfidence([])).toBe(0);
  });

  it("returns > 0.8 for a well-formed single item (qty*price=total)", () => {
    const raw = [
      {
        product_name: "test",
        barcode: null,
        sku: null,
        quantity: 2,
        unit: null,
        unit_price: 5,
        line_total: 10,
        discount: null,
        vat_rate: null,
        item_confidence: 1.0,
      },
    ];
    const conf = computeLineItemsConfidence(raw);
    expect(conf).toBeGreaterThan(0.8);
  });
});

// ─── computeHeaderConfidence ─────────────────────────────────────────────────
describe("computeHeaderConfidence", () => {
  it("returns 1.0 when all fields present", () => {
    const conf = computeHeaderConfidence({
      vendor: "רמי לוי",
      invoice_number: "INV-001",
      date: "2025-01-15",
      total: 150,
      tax_id: "512345678",
    });
    expect(conf).toBe(1.0);
  });

  it("returns 0 when all fields are null", () => {
    expect(computeHeaderConfidence({})).toBe(0);
  });

  it("weights total+vendor most heavily", () => {
    const withTotal = computeHeaderConfidence({ total: 100 });
    const withDate  = computeHeaderConfidence({ date: "2025-01-01" });
    expect(withTotal).toBeGreaterThan(withDate);

    const withVendor = computeHeaderConfidence({ vendor: "Supplier" });
    expect(withVendor).toBe(0.25);
    expect(withTotal).toBe(0.3);
  });

  it("partial set returns partial confidence", () => {
    const conf = computeHeaderConfidence({ vendor: "X", total: 100 });
    expect(conf).toBeCloseTo(0.55, 2);
  });

  it("PDFs no longer default to confidence=0 when vendor+total exist", () => {
    const conf = computeHeaderConfidence({ vendor: "מגה בעל קורת", total: 543.2 });
    expect(conf).toBeGreaterThan(0.5);
  });
});
