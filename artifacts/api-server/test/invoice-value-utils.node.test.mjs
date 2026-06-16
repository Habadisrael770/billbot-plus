/**
 * invoice-value-utils.node.test.mjs
 * Run with: node --test test/invoice-value-utils.node.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// Import via tsx-compiled path (ESM shimmed at runtime by tsx)
// Works with: node --loader tsx --test ...  OR  node --test with tsx registered
import { parseAmount, parseDate } from "../src/services/invoiceValueUtils.ts";

// ── parseAmount ──────────────────────────────────────────────────────────────

test("parseAmount: plain integer", () => {
  assert.equal(parseAmount("1234"), 1234);
});

test("parseAmount: English 1,234.50 → 1234.5", () => {
  assert.equal(parseAmount("1,234.50"), 1234.5);
});

test("parseAmount: English large 1,234,567", () => {
  assert.equal(parseAmount("1,234,567"), 1234567);
});

test("parseAmount: European 1.234,50 → 1234.5", () => {
  assert.equal(parseAmount("1.234,50"), 1234.5);
});

test("parseAmount: small European 5,50 → 5.5", () => {
  assert.equal(parseAmount("5,50"), 5.5);
});

test("parseAmount: ILS prefix stripped", () => {
  assert.equal(parseAmount("ILS 2,000"), 2000);
});

test("parseAmount: shekel symbol stripped", () => {
  assert.equal(parseAmount("₪1,234"), 1234);
});

test("parseAmount: null/undefined returns null", () => {
  assert.equal(parseAmount(null), null);
  assert.equal(parseAmount(undefined), null);
  assert.equal(parseAmount(""), null);
});

// ── parseDate ────────────────────────────────────────────────────────────────

test("parseDate: dd/mm/yyyy", () => {
  assert.equal(parseDate("15/06/2026"), "2026-06-15");
});

test("parseDate: dd.mm.yyyy", () => {
  assert.equal(parseDate("15.06.2026"), "2026-06-15");
});

test("parseDate: dd-mm-yyyy", () => {
  assert.equal(parseDate("15-06-2026"), "2026-06-15");
});

test("parseDate: dd/mm/yy (2-digit year < 50 → 20xx)", () => {
  assert.equal(parseDate("15/06/26"), "2026-06-15");
});

test("parseDate: dd.mm.yy (2-digit year >= 50 → 19xx)", () => {
  assert.equal(parseDate("15.06.55"), "1955-06-15");
});

test("parseDate: already ISO yyyy-mm-dd passthrough", () => {
  assert.equal(parseDate("2026-06-15"), "2026-06-15");
});

test("parseDate: null/undefined returns null", () => {
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(undefined), null);
});
