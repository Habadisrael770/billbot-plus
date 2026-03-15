/**
 * lineItemParser.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic post-processor for AI-extracted line items.
 * Does NOT make LLM calls. Validates, cleans, and scores what the AI returned.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface RawLineItem {
  product_name?: string | null;
  barcode?: string | null;
  sku?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_price?: number | string | null;
  line_total?: number | string | null;
  discount?: number | string | null;
  vat_rate?: number | string | null;
  [key: string]: unknown;
}

export interface ValidatedLineItem {
  product_name: string | null;
  barcode: string | null;
  sku: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  discount: number | null;
  vat_rate: number | null;
  item_confidence: number;
}

const TOTAL_MATCH_TOLERANCE = 0.06; // 6% tolerance for qty * unit_price vs line_total

function safeNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "string") {
    // Normalize: replace comma-decimal if likely (e.g. "1,50" → "1.50")
    const s = v.replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  return null;
}

function isValidBarcode(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^\d{6,14}$/.test(s.trim());
}

function scoreItem(item: ValidatedLineItem): number {
  let score = 0;
  let max = 0;

  // Product name is the most important signal
  max += 40;
  if (item.product_name && item.product_name.trim().length > 1) score += 40;

  // Price fields
  max += 30;
  if (item.line_total !== null && item.line_total > 0) score += 30;
  else if (item.unit_price !== null && item.unit_price > 0) score += 15;

  // Quantity
  max += 20;
  if (item.quantity !== null && item.quantity > 0) score += 20;

  // Cross-check: qty * unit_price ≈ line_total
  max += 10;
  if (
    item.quantity !== null &&
    item.unit_price !== null &&
    item.line_total !== null &&
    item.line_total > 0
  ) {
    const expected = item.quantity * item.unit_price;
    const diff = Math.abs(expected - item.line_total) / item.line_total;
    if (diff <= TOTAL_MATCH_TOLERANCE) {
      score += 10;
    }
  }

  return Math.round((score / max) * 1000) / 1000;
}

/**
 * Validate and clean a single AI-returned line item.
 * Returns null if the item is clearly garbage (no product name AND no price).
 */
function validateItem(raw: RawLineItem, index: number): ValidatedLineItem | null {
  const product_name = typeof raw.product_name === "string" && raw.product_name.trim().length > 0
    ? raw.product_name.trim().slice(0, 200)
    : null;

  const rawBarcode = typeof raw.barcode === "string" ? raw.barcode : null;
  const barcode = isValidBarcode(rawBarcode) ? rawBarcode!.trim() : null;

  const sku = typeof raw.sku === "string" && raw.sku.trim().length > 0
    ? raw.sku.trim().slice(0, 50)
    : null;

  const quantity   = safeNum(raw.quantity);
  const unit_price = safeNum(raw.unit_price);
  const line_total = safeNum(raw.line_total);
  const discount   = safeNum(raw.discount);
  const vat_rate   = safeNum(raw.vat_rate);

  const unit = typeof raw.unit === "string" && raw.unit.trim().length > 0
    ? raw.unit.trim().slice(0, 20)
    : null;

  // Reject completely useless rows: no name AND no financial data
  if (!product_name && line_total === null && unit_price === null) {
    return null;
  }

  // Sanity checks on numeric ranges
  if (quantity !== null && (quantity < 0 || quantity > 100_000)) return null;
  if (unit_price !== null && unit_price < 0) return null;
  if (line_total !== null && line_total < 0) return null;

  const validated: ValidatedLineItem = {
    product_name,
    barcode,
    sku,
    quantity,
    unit,
    unit_price,
    line_total,
    discount,
    vat_rate,
    item_confidence: 0,
  };

  validated.item_confidence = scoreItem(validated);
  return validated;
}

/**
 * Main entry point.
 * Takes the raw line_items array from the AI response, validates and scores each.
 * Returns only items with item_confidence >= MIN_CONFIDENCE.
 */
const MIN_ITEM_CONFIDENCE = 0.3;

export function parseAndValidateLineItems(raw: unknown[]): ValidatedLineItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const results: ValidatedLineItem[] = [];

  for (let i = 0; i < raw.length; i++) {
    const rawItem = raw[i];
    if (typeof rawItem !== "object" || rawItem === null) continue;

    const validated = validateItem(rawItem as RawLineItem, i);
    if (!validated) continue;
    if (validated.item_confidence < MIN_ITEM_CONFIDENCE) continue;

    results.push(validated);
  }

  return results;
}

/**
 * Compute overall line-items confidence from validated items.
 * Returns 0..1.
 */
export function computeLineItemsConfidence(items: ValidatedLineItem[]): number {
  if (items.length === 0) return 0;

  const avg = items.reduce((s, it) => s + it.item_confidence, 0) / items.length;

  // Bonus for having multiple items (more evidence)
  const countBonus = Math.min(items.length / 10, 0.1);

  return Math.min(Math.round((avg + countBonus) * 1000) / 1000, 1.0);
}

/**
 * Compute header confidence from extracted fields.
 * Deterministic — does NOT trust AI self-reported confidence.
 */
export function computeHeaderConfidence(fields: {
  vendor?: string | null;
  invoice_number?: string | null;
  date?: string | null;
  total?: number | null;
  tax_id?: string | null;
}): number {
  const weights: [boolean, number][] = [
    [!!(fields.vendor),         0.25],
    [!!(fields.total),          0.30],
    [!!(fields.date),           0.20],
    [!!(fields.invoice_number), 0.15],
    [!!(fields.tax_id),         0.10],
  ];

  const score = weights.reduce((s, [has, w]) => s + (has ? w : 0), 0);
  return Math.round(score * 1000) / 1000;
}
