import { Router } from "express";
import { getBranches, getDocuments, getMonthlyReport, exportToCsv, checkApiActive } from "../services/invoice4uService.js";

const router = Router();

// GET /api/invoice4u/status
router.get("/status", async (_req, res) => {
  try {
    if (!process.env.INVOICE4U) {
      res.json({ connected: false, apiActive: false, error: "INVOICE4U secret not set" });
      return;
    }

    // Validate token with IsAuthenticated
    const { active: apiActive, orgName, email } = await checkApiActive();
    if (!apiActive) {
      res.json({ connected: false, apiActive: false, error: "TOKEN_INVALID" });
      return;
    }

    // Get branches
    const branches = await getBranches();

    res.json({ connected: true, apiActive: true, orgName, email, branches });
  } catch (e) {
    res.json({ connected: false, apiActive: false, error: (e as Error).message });
  }
});

// GET /api/invoice4u/report?year=2025
router.get("/report", async (req, res) => {
  try {
    const year = Number(req.query["year"]) || new Date().getFullYear();
    const result = await getMonthlyReport(year);
    res.json({ year, ...result });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/invoice4u/export?year=2025
router.get("/export", async (req, res) => {
  try {
    const year = Number(req.query["year"]) || new Date().getFullYear();
    const { rows } = await getMonthlyReport(year);
    const csv = exportToCsv(rows);
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

    let dateFrom: string, dateTo: string;
    if (month) {
      const lastDay = new Date(year, month, 0).getDate();
      dateFrom = `01/${String(month).padStart(2, "0")}/${year}`;
      dateTo   = `${lastDay}/${String(month).padStart(2, "0")}/${year}`;
    } else {
      dateFrom = `01/01/${year}`;
      dateTo   = `31/12/${year}`;
    }

    const { documents } = await getDocuments({ dateFrom, dateTo, pageSize: 500 });

    const INCOME_TYPES  = new Set([1, 2, 3, 6]);
    const EXPENSE_TYPES = new Set([8, 9]);

    const filtered = documents.filter(d => {
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
