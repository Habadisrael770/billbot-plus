import { Router } from "express";
import { db } from "@workspace/db";
import { businessProfileTable } from "@workspace/db/schema";

const router = Router();

async function getOrCreate() {
  const rows = await db.select().from(businessProfileTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(businessProfileTable).values({}).returning();
  return created;
}

router.get("/", async (_req, res) => {
  try {
    const profile = await getOrCreate();
    res.json(profile);
  } catch (err) {
    console.error("businessProfile GET error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.put("/", async (req, res) => {
  try {
    const existing = await getOrCreate();
    const {
      business_tax_ids,
      business_names,
      expense_categories,
      business_type,
      industry,
      home_office_usage_percent,
      vehicle_business_usage_percent,
      estimated_annual_revenue,
      is_vat_registered,
      has_employees,
      onboarding_completed,
    } = req.body;

    const [updated] = await db
      .update(businessProfileTable)
      .set({
        ...(business_tax_ids !== undefined && { business_tax_ids }),
        ...(business_names !== undefined && { business_names }),
        ...(expense_categories !== undefined && { expense_categories }),
        ...(business_type !== undefined && { business_type }),
        ...(industry !== undefined && { industry }),
        ...(home_office_usage_percent !== undefined && { home_office_usage_percent }),
        ...(vehicle_business_usage_percent !== undefined && { vehicle_business_usage_percent }),
        ...(estimated_annual_revenue !== undefined && { estimated_annual_revenue }),
        ...(is_vat_registered !== undefined && { is_vat_registered }),
        ...(has_employees !== undefined && { has_employees }),
        ...(onboarding_completed !== undefined && { onboarding_completed }),
        updated_at: new Date(),
      })
      .where(
        (await import("drizzle-orm")).eq(businessProfileTable.id, existing.id)
      )
      .returning();

    res.json(updated);
  } catch (err) {
    console.error("businessProfile PUT error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
