/**
 * normalizeVendorName
 *
 * Normalizes a raw vendor name string for consistent matching.
 * Supports Hebrew and English vendor names.
 *
 * Rules applied (in order):
 *  1. Lowercase
 *  2. Trim
 *  3. Normalize common company suffixes (בע"מ / בעמ / ltd / limited / inc / corp / llc / co)
 *  4. Remove punctuation (except internal Hebrew apostrophe handling)
 *  5. Collapse multiple spaces into one
 *  6. Final trim
 */
export function normalizeVendorName(name: string): string {
  if (!name || name.trim() === "") return "";

  let normalized = name.toLowerCase().trim();

  // Normalize Hebrew company suffixes
  // בע"מ  בעמ  בע מ  => bvm (consistent token)
  normalized = normalized
    .replace(/בע["״]?מ/g, "bvm")
    .replace(/בעמ/g, "bvm")
    .replace(/ב\.ע\.מ/g, "bvm");

  // Normalize English company suffixes
  normalized = normalized
    .replace(/\blimited\b/g, "ltd")
    .replace(/\bincorporated\b/g, "inc")
    .replace(/\bcorporation\b/g, "corp")
    .replace(/\bcompany\b/g, "co")
    .replace(/\bllc\b/g, "llc")
    .replace(/\blp\b/g, "lp");

  // Remove punctuation (except spaces and alphanumeric — including Hebrew Unicode block)
  // Hebrew Unicode: \u05D0-\u05EA, Niqqud: \u05B0-\u05C7
  normalized = normalized.replace(/[^\w\s\u05B0-\u05EA]/gu, " ");

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}
