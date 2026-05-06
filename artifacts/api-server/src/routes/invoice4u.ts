import { Router } from "express";
import { getBranches, getDocuments, getMonthlyReport, exportToCsv } from "../services/invoice4uService.js";

const router = Router();

// GET /api/invoice4u/status — verify connection & return branches
router.get("/status", async (_req, res) => {
  try {
    const configured = !!process.env.INVOICE4U;
    if (!configured) {
      res.json({ connected: false, error: "INVOICE4U secret not set" });
      return;
    }
    const branches = await getBranches();
    res.json({ connected: true, branches });
  } catch (e) {
    res.json({ connected: false, error: (e as Error).message });
  }
});

// GET /api/invoice4u/report?year=2025 — monthly income/expense report
router.get("/report", async (req, res) => {
  try {
    const year = Number(req.query["year"]) || new Date().getFullYear();
    const rows = await getMonthlyReport(year);
    res.json({ year, rows });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/invoice4u/export?year=2025 — download CSV
router.get("/export", async (req, res) => {
  try {
    const year = Number(req.query["year"]) || new Date().getFullYear();
    const rows = await getMonthlyReport(year);
    const csv  = exportToCsv(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="invoice4u-report-${year}.csv"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/invoice4u/documents?year=2025&month=5&type=income|expense|all
router.get("/documents", async (req, res) => {
  try {
    const year  = Number(req.query["year"])  || new Date().getFullYear();
    const month = Number(req.query["month"]) || undefined;
    const type  = (req.query["type"] as string) || "all";

    let dateFrom: string;
    let dateTo:   string;

    if (month) {
      const lastDay = new Date(year, month, 0).getDate();
      dateFrom = `01/${String(month).padStart(2, "0")}/${year}`;
      dateTo   = `${lastDay}/${String(month).padStart(2, "0")}/${year}`;
    } else {
      dateFrom = `01/01/${year}`;
      dateTo   = `31/12/${year}`;
    }

    const docs = await getDocuments({ dateFrom, dateTo, pageSize: 500 });

    const INCOME_TYPES  = new Set([1, 2, 3, 6]);
    const EXPENSE_TYPES = new Set([8, 9]);

    const filtered = docs.filter(d => {
      if (type === "income")  return INCOME_TYPES.has(d.DocType);
      if (type === "expense") return EXPENSE_TYPES.has(d.DocType);
      return true;
    });

    res.json({ documents: filtered, total: filtered.length });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
