import { db } from "@workspace/db";
import { categoryRulesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface CategoryResult {
  suggested_category: string | null;
  category_confidence: number;
}

// Cache rules in memory to avoid a DB round-trip on every invoice
let rulesCache: Array<{ match_type: string; match_value: string; category_name: string; priority: number }> | null = null;
let rulesCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadRules() {
  const now = Date.now();
  if (rulesCache && now - rulesCacheAt < CACHE_TTL_MS) return rulesCache;

  const rows = await db
    .select()
    .from(categoryRulesTable)
    .orderBy(categoryRulesTable.priority);

  rulesCache = rows;
  rulesCacheAt = now;
  return rows;
}

/**
 * suggestCategory
 *
 * Deterministic, rule-based category suggestion.
 * Matches against the vendor's canonical/raw name.
 *
 * Returns the first matching rule (sorted by priority DESC).
 */
export async function suggestCategory(
  vendorName: string | null | undefined,
  taxId?: string | null
): Promise<CategoryResult> {
  if (!vendorName || vendorName.trim() === "") {
    return { suggested_category: null, category_confidence: 0 };
  }

  const normalized = vendorName.toLowerCase().trim();
  const rules = await loadRules();

  // Sort descending by priority (higher priority = checked first)
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (rule.match_type === "name_contains") {
      if (normalized.includes(rule.match_value.toLowerCase())) {
        return {
          suggested_category: rule.category_name,
          category_confidence: 0.9,
        };
      }
    } else if (rule.match_type === "tax_id_exact") {
      if (taxId && taxId.trim() === rule.match_value.trim()) {
        return {
          suggested_category: rule.category_name,
          category_confidence: 1.0,
        };
      }
    }
  }

  return { suggested_category: null, category_confidence: 0 };
}

/** Invalidate the in-memory cache (call after adding new rules). */
export function invalidateCategoryCache() {
  rulesCache = null;
}
