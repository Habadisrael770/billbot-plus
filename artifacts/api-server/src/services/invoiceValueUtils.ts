/**
 * invoiceValueUtils.ts
 * Parsing utilities for monetary amounts and dates found in invoices.
 *
 * parseAmount — handles Israeli, English and European number formats
 * parseDate   — normalises dd/mm/yyyy, dd.mm.yy, etc. → yyyy-mm-dd
 */

/**
 * Parse a raw amount string into a JS number.
 *
 * Supported formats (examples):
 *   1234        → 1234
 *   1,234.50    → 1234.5   (English — comma = thousands, dot = decimal)
 *   1.234,50    → 1234.5   (European — dot = thousands, comma = decimal)
 *   5,50        → 5.5      (Small European — no thousands sep)
 *   ILS 2,000   → 2000     (currency prefix stripped)
 *   ₪1,234      → 1234
 */
export function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;

  // Strip leading currency codes / symbols (ILS, USD, EUR, ₪, $, €, £)
  let s = raw
    .replace(/^\s*[A-Z]{2,3}\s+/i, "")
    .replace(/[₪$€£]/g, "")
    .trim();

  if (!s || !/\d/.test(s)) return null;

  // European grouped: 1.234,50 or 1.234 (dot = thousands, comma = decimal)
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    const v = parseFloat(s.replace(/\./g, "").replace(",", "."));
    return isNaN(v) ? null : v;
  }

  // Small European: 5,50  (comma followed by exactly 2 digits, no dot)
  if (/^\d+,\d{2}$/.test(s) && !s.includes(".")) {
    const v = parseFloat(s.replace(",", "."));
    return isNaN(v) ? null : v;
  }

  // English: 1,234.50  (comma = thousands, dot = decimal)
  const v = parseFloat(s.replace(/,/g, ""));
  return isNaN(v) ? null : v;
}

/**
 * Normalise a date string to ISO-8601 YYYY-MM-DD.
 *
 * Supported inputs:
 *   15/06/2026  → 2026-06-15  (dd/mm/yyyy)
 *   15.06.2026  → 2026-06-15
 *   15-06-2026  → 2026-06-15
 *   15/06/26    → 2026-06-15  (2-digit year expanded)
 *   2026-06-15  → 2026-06-15  (already ISO — returned as-is)
 *
 * Returns null when the input cannot be parsed.
 */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Already looks like ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parts = raw.trim().split(/[\/\-.]/);
  if (parts.length !== 3) return null;

  let [a, b, c] = parts as [string, string, string];
  let d: string, m: string, y: string;

  // Identify year by length-4 first (unambiguous), then by position convention
  if (a!.length === 4) {
    // yyyy/mm/dd
    [y, m, d] = [a!, b!, c!];
  } else if (c!.length === 4) {
    // dd/mm/yyyy or mm/dd/yyyy — Israeli convention: dd/mm/yyyy
    [d, m, y] = [a!, b!, c!];
  } else {
    // All parts are 1-2 digits: dd/mm/yy (Israeli standard assumed)
    [d, m, y] = [a!, b!, c!];
    const yi = parseInt(y!, 10);
    y = (yi < 50 ? "20" : "19") + y!.padStart(2, "0");
  }

  const di = parseInt(d!, 10);
  const mi = parseInt(m!, 10);
  if (di < 1 || di > 31 || mi < 1 || mi > 12) return null;

  return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}
