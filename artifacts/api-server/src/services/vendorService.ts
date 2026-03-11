import { db } from "@workspace/db";
import { vendorsTable, vendorAliasesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { normalizeVendorName } from "../utils/normalizeVendorName.js";

export interface VendorMatchResult {
  vendorId: string;
  canonicalName: string;
  matchMethod: "tax_id" | "normalized_alias" | "canonical" | "created";
}

/**
 * findOrCreateVendor
 *
 * Matching priority:
 *  1. Exact tax_id match (most reliable)
 *  2. Exact normalized alias match
 *  3. Exact canonical name match (normalized)
 *  4. Create new vendor + first alias if no match found
 */
export async function findOrCreateVendor(
  rawVendorName: string,
  taxId?: string | null
): Promise<VendorMatchResult> {
  const normalizedName = normalizeVendorName(rawVendorName);

  // 1. Tax ID match
  if (taxId && taxId.trim() !== "") {
    const byTaxId = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.tax_id, taxId.trim()))
      .limit(1);

    if (byTaxId.length > 0) {
      const vendor = byTaxId[0]!;
      // Ensure we capture this alias even if name differs slightly
      await ensureAlias(vendor.id, rawVendorName, normalizedName);
      return {
        vendorId: vendor.id,
        canonicalName: vendor.canonical_name,
        matchMethod: "tax_id",
      };
    }
  }

  // 2. Normalized alias match
  const byAlias = await db
    .select({ vendor_id: vendorAliasesTable.vendor_id })
    .from(vendorAliasesTable)
    .where(eq(vendorAliasesTable.normalized_alias, normalizedName))
    .limit(1);

  if (byAlias.length > 0) {
    const vendorId = byAlias[0]!.vendor_id;
    const vendor = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, vendorId))
      .limit(1);

    if (vendor.length > 0) {
      return {
        vendorId: vendor[0]!.id,
        canonicalName: vendor[0]!.canonical_name,
        matchMethod: "normalized_alias",
      };
    }
  }

  // 3. Canonical name match (normalized comparison)
  const allVendors = await db.select().from(vendorsTable);
  const canonicalMatch = allVendors.find(
    (v) => normalizeVendorName(v.canonical_name) === normalizedName
  );

  if (canonicalMatch) {
    await ensureAlias(canonicalMatch.id, rawVendorName, normalizedName);
    return {
      vendorId: canonicalMatch.id,
      canonicalName: canonicalMatch.canonical_name,
      matchMethod: "canonical",
    };
  }

  // 4. Create new vendor + first alias
  const [newVendor] = await db
    .insert(vendorsTable)
    .values({
      canonical_name: rawVendorName.trim(),
      tax_id: taxId?.trim() ?? null,
    })
    .returning();

  if (!newVendor) throw new Error("Failed to create vendor");

  await db.insert(vendorAliasesTable).values({
    vendor_id: newVendor.id,
    alias_name: rawVendorName.trim(),
    normalized_alias: normalizedName,
  });

  return {
    vendorId: newVendor.id,
    canonicalName: newVendor.canonical_name,
    matchMethod: "created",
  };
}

/**
 * ensureAlias — idempotently adds an alias to a vendor if it doesn't exist yet.
 */
async function ensureAlias(
  vendorId: string,
  aliasName: string,
  normalizedAlias: string
): Promise<void> {
  const existing = await db
    .select({ id: vendorAliasesTable.id })
    .from(vendorAliasesTable)
    .where(
      and(
        eq(vendorAliasesTable.vendor_id, vendorId),
        eq(vendorAliasesTable.normalized_alias, normalizedAlias)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(vendorAliasesTable).values({
      vendor_id: vendorId,
      alias_name: aliasName.trim(),
      normalized_alias: normalizedAlias,
    });
  }
}

/**
 * mergeVendorAlias — manually assigns an alias to an existing vendor.
 */
export async function mergeVendorAlias(
  vendorId: string,
  aliasName: string
): Promise<void> {
  const normalized = normalizeVendorName(aliasName);
  await ensureAlias(vendorId, aliasName, normalized);
}
