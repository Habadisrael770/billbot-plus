import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vendorsTable, vendorAliasesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/* POST /api/vendors — create new vendor */
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
    res.status(201).json({ id: vendor.id, canonicalName: vendor.canonical_name, taxId: vendor.tax_id, isBlocked: false, aliases: [] });
  } catch (err) {
    console.error("Failed to create vendor:", err);
    res.status(500).json({ error: "שגיאה ביצירת ספק" });
  }
});

/* GET /api/vendors — list all vendors with aliases */
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
          isBlocked: vendor.is_blocked ?? false,
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

/* PATCH /api/vendors/:id/block — block vendor (skip future email imports) */
router.patch("/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(vendorsTable)
      .set({ is_blocked: true, updated_at: new Date() })
      .where(eq(vendorsTable.id, id));
    res.json({ ok: true, isBlocked: true });
  } catch (err) {
    console.error("block vendor error:", err);
    res.status(500).json({ error: "שגיאה בחסימת ספק" });
  }
});

/* PATCH /api/vendors/:id/unblock — unblock vendor */
router.patch("/:id/unblock", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(vendorsTable)
      .set({ is_blocked: false, updated_at: new Date() })
      .where(eq(vendorsTable.id, id));
    res.json({ ok: true, isBlocked: false });
  } catch (err) {
    console.error("unblock vendor error:", err);
    res.status(500).json({ error: "שגיאה בביטול חסימת ספק" });
  }
});

export default router;
