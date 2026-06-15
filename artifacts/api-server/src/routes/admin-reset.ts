import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const RESET_TOKEN = process.env.ADMIN_RESET_TOKEN || "";

router.post("/reset-all", async (req, res) => {
  const token = req.headers["x-reset-token"] as string | undefined;
  if (!RESET_TOKEN || token !== RESET_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    await db.execute(sql`DELETE FROM invoice_line_items`);
    await db.execute(sql`DELETE FROM invoice_extraction_jobs`);
    await db.execute(sql`DELETE FROM invoices`);
    await db.execute(sql`DELETE FROM vendor_aliases`);
    await db.execute(sql`DELETE FROM vendors`);
    await db.execute(sql`DELETE FROM gmail_tokens`);
    return res.json({ ok: true, message: "All data cleared" });
  } catch (err) {
    console.error("[admin-reset]", err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
