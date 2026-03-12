import { Router } from "express";
import { db } from "@workspace/db";
import { entitiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

async function seedIfEmpty() {
  const existing = await db.select().from(entitiesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(entitiesTable).values([
      { name: "עסק ראשי", type: "business", is_default: true },
      { name: "אישי", type: "personal", is_default: false },
    ]);
  }
}

router.get("/", async (_req, res) => {
  try {
    await seedIfEmpty();
    const entities = await db.select().from(entitiesTable).orderBy(entitiesTable.created_at);
    res.json(entities);
  } catch {
    res.status(500).json({ error: "Failed to load entities" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, tax_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name required" });
    const [entity] = await db
      .insert(entitiesTable)
      .values({ name: name.trim(), type: type || "business", tax_id: tax_id || null })
      .returning();
    res.json(entity);
  } catch {
    res.status(500).json({ error: "Failed to create entity" });
  }
});

router.patch("/:id/set-default", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(entitiesTable).set({ is_default: false });
    await db.update(entitiesTable).set({ is_default: true }).where(eq(entitiesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to set default entity" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [entity] = await db
      .select()
      .from(entitiesTable)
      .where(eq(entitiesTable.id, id))
      .limit(1);
    if (!entity) return res.status(404).json({ error: "Not found" });
    if (entity.is_default) return res.status(403).json({ error: "Cannot delete default entity" });
    await db.delete(entitiesTable).where(eq(entitiesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete entity" });
  }
});

export default router;
