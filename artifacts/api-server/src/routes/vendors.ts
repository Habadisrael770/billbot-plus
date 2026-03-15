import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vendorsTable, vendorAliasesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/**
 * GET /api/vendors
 * Returns all vendors with their aliases.
 */
router.post("/", async (req, res) => {
  try {
    const { canonicalName, taxId } = req.body as { canonicalName?: string; taxId?: string };
    if (!canonicalName?.trim()) {
      res.status(400).json({ error: "שם ספק חסר" });
      return;
    }
    const [vendor] = await db
      .insert(vendorsTable)
      .values({ canonical_name: canonicalName.trim(), tax_id: taxId?.trim() || null })
      .returning();
    res.status(201).json({ id: vendor.id, canonicalName: vendor.canonical_name, taxId: vendor.tax_id, aliases: [] });
  } catch (err) {
    console.error("Failed to create vendor:", err);
    res.status(500).json({ error: "שגיאה ביצירת ספק" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.canonical_name);

    const result = await Promise.all(
      vendors.map(async (vendor) => {
        const aliases = await db
          .select()
          .from(vendorAliasesTable)
          .where(eq(vendorAliasesTable.vendor_id, vendor.id));

        return {
          id: vendor.id,
          canonicalName: vendor.canonical_name,
          taxId: vendor.tax_id,
          aliases: aliases.map((a) => ({
            id: a.id,
            aliasName: a.alias_name,
            normalizedAlias: a.normalized_alias,
          })),
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error("Failed to list vendors:", err);
    res.status(500).json({ error: "Failed to list vendors" });
  }
});

export default router;
