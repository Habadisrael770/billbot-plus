import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: "כללי ומנהלי", color: "#6366f1", is_deletable: false },
  { name: "תקשורת", color: "#06b6d4", is_deletable: true },
  { name: "נסיעות והובלה", color: "#8b5cf6", is_deletable: true },
  { name: "ציוד משרדי", color: "#14b8a6", is_deletable: true },
  { name: "שיווק ופרסום", color: "#f59e0b", is_deletable: true },
  { name: "תוכנה ומנויים", color: "#10b981", is_deletable: true },
  { name: "שכ״ד", color: "#f97316", is_deletable: true },
  { name: "חשמל ואנרגיה", color: "#eab308", is_deletable: true },
  { name: "מזון ואירוח", color: "#ef4444", is_deletable: true },
];

async function seedIfEmpty() {
  const existing = await db.select().from(categoriesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(categoriesTable).values(
      DEFAULT_CATEGORIES.map((c, i) => ({
        name: c.name,
        color: c.color,
        is_default: i === 0,
        is_deletable: c.is_deletable,
      }))
    );
  }
}

router.get("/", async (_req, res) => {
  try {
    await seedIfEmpty();
    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(categoriesTable.created_at);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to load categories" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name required" });
    const [cat] = await db
      .insert(categoriesTable)
      .values({ name: name.trim(), color: color || "#6366f1" })
      .returning();
    res.json(cat);
  } catch {
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const [cat] = await db
      .update(categoriesTable)
      .set({ ...(name ? { name } : {}), ...(color ? { color } : {}) })
      .where(eq(categoriesTable.id, id))
      .returning();
    res.json(cat);
  } catch {
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [cat] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .limit(1);
    if (!cat) return res.status(404).json({ error: "Not found" });
    if (!cat.is_deletable) return res.status(403).json({ error: "Cannot delete default category" });
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
