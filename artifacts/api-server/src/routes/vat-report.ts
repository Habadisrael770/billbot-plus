import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { invoicesTable, vendorsTable } from "@workspace/db/schema";
import { and, between, eq, isNotNull, notInArray } from "drizzle-orm";
import { getDocuments, type I4UDocument } from "../services/invoice4uService.js";

const router: IRouter = Router();

// Income document types pulled from Invoice4U (עסקאות).
// 1 חשבונית מס · 2 חשבונית מס/קבלה · 3 קבלה · 6 חשבונית זיכוי
const INCOME_DOC_TYPES = [1, 2, 3, 6];
// A credit note (חשבונית זיכוי) reduces output VAT, so it is subtracted.
const INCOME_CREDIT_TYPE = 6;

// Expense (תשומות) rows come from the DB invoices. Duplicates are excluded so
// the VAT report never double-counts a scanned + re-uploaded invoice.
const EXCLUDED_DUP_STATUSES = ["duplicate", "probable_duplicate"];

function n(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const num = Number(v);
  return isNaN(num) ? 0 : num;
}

// Validate + normalise a YYYY-MM-DD date string; returns null if invalid.
function normDate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : s;
}

// Default range = first day of the current month → today.
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { from, to };
}

export interface IncomeRow {
  id: string;
  date: string;
  number: number;
  typeName: string;
  client: string;
  net: number;
  vat: number;
  total: number;
  pdfLink?: string;
}

export interface ExpenseRow {
  id: string;
  date: string | null;
  number: string | null;
  vendor: string;
  net: number;
  vat: number;
  total: number;
  category: string | null;
  isForeign: boolean;
  documentType: string;
  source: string;
}

export interface VatReport {
  range: { from: string; to: string };
  income: {
    net: number;
    vat: number;
    total: number;
    count: number;
    documents: IncomeRow[];
    unavailable: boolean;
    error?: string;
  };
  expense: {
    net: number;
    vat: number;
    total: number;
    count: number;
    documents: ExpenseRow[];
  };
  vat: {
    output: number; // מס עסקאות
    input: number; // מס תשומות
    due: number; // מע"מ לתשלום (חיובי) / להחזר (שלילי)
  };
}

async function buildReport(from: string, to: string): Promise<VatReport> {
  // ── Income (עסקאות) from Invoice4U ──────────────────────────────────────
  let incomeDocs: I4UDocument[] = [];
  let incomeUnavailable = false;
  let incomeError: string | undefined;
  try {
    const { documents } = await getDocuments({
      dateFrom: from,
      dateTo: to,
      docTypes: INCOME_DOC_TYPES,
      pageSize: 500,
    });
    incomeDocs = documents;
  } catch (err) {
    incomeUnavailable = true;
    incomeError = err instanceof Error ? err.message : "Invoice4U unavailable";
  }

  let incNet = 0,
    incVat = 0,
    incTotal = 0;
  const incomeRows: IncomeRow[] = incomeDocs.map((d) => {
    const sign = d.DocType === INCOME_CREDIT_TYPE ? -1 : 1;
    incNet += sign * d.BeforeVat;
    incVat += sign * d.Vat;
    incTotal += sign * d.Total;
    return {
      id: d.ID,
      date: d.DocumentDate,
      number: d.DocumentNumber,
      typeName: d.DocTypeName,
      client: d.ClientName,
      net: sign * d.BeforeVat,
      vat: sign * d.Vat,
      total: sign * d.Total,
      pdfLink: d.PdfLink,
    };
  });

  // ── Expenses (תשומות) from the DB invoices ──────────────────────────────
  const rows = await db
    .select({
      id: invoicesTable.id,
      date: invoicesTable.invoice_date,
      number: invoicesTable.invoice_number,
      rawVendor: invoicesTable.raw_vendor_name,
      canonicalVendor: vendorsTable.canonical_name,
      subtotal: invoicesTable.subtotal,
      vat: invoicesTable.vat,
      total: invoicesTable.total,
      finalCategory: invoicesTable.final_category,
      suggestedCategory: invoicesTable.suggested_category,
      isForeign: invoicesTable.is_foreign,
      documentType: invoicesTable.document_type,
      source: invoicesTable.source_type,
    })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendor_id, vendorsTable.id))
    .where(
      and(
        isNotNull(invoicesTable.invoice_date),
        between(invoicesTable.invoice_date, from, to),
        notInArray(invoicesTable.duplicate_status, EXCLUDED_DUP_STATUSES),
      ),
    )
    .orderBy(invoicesTable.invoice_date);

  let expNet = 0,
    expVat = 0,
    expTotal = 0;
  const expenseRows: ExpenseRow[] = rows.map((r) => {
    // A supplier credit note (חשבונית זיכוי) reduces input VAT → subtract it.
    const sign = r.documentType === "credit_note" ? -1 : 1;
    // Foreign invoices carry no deductible VAT (vat already stored as 0, but be safe).
    const net = sign * n(r.subtotal);
    const vat = r.isForeign ? 0 : sign * n(r.vat);
    const total = sign * n(r.total);
    expNet += net;
    expVat += vat;
    expTotal += total;
    return {
      id: r.id,
      date: r.date,
      number: r.number,
      vendor: r.canonicalVendor ?? r.rawVendor ?? "—",
      net,
      vat,
      total,
      category: r.finalCategory ?? r.suggestedCategory ?? null,
      isForeign: r.isForeign,
      documentType: r.documentType,
      source: r.source,
    };
  });

  const output = incVat;
  const input = expVat;

  return {
    range: { from, to },
    income: {
      net: incNet,
      vat: incVat,
      total: incTotal,
      count: incomeRows.length,
      documents: incomeRows,
      unavailable: incomeUnavailable,
      error: incomeError,
    },
    expense: {
      net: expNet,
      vat: expVat,
      total: expTotal,
      count: expenseRows.length,
      documents: expenseRows,
    },
    vat: {
      output,
      input,
      due: output - input,
    },
  };
}

/**
 * GET /api/vat-report?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Unified VAT report — income (עסקאות) from Invoice4U + expenses (תשומות) from DB.
 */
router.get("/", async (req, res) => {
  const def = defaultRange();
  const from = normDate(req.query.from) ?? def.from;
  const to = normDate(req.query.to) ?? def.to;
  if (from > to) {
    res.status(400).json({ error: "תאריך התחלה מאוחר מתאריך הסיום" });
    return;
  }
  try {
    const report = await buildReport(from, to);
    res.json(report);
  } catch (err) {
    console.error("Failed to build VAT report:", err);
    res.status(500).json({ error: "שגיאה בהפקת דוח המע\"מ" });
  }
});

/**
 * GET /api/vat-report/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Downloads the VAT report as a UTF-8 CSV (Excel-friendly BOM).
 */
router.get("/export", async (req, res) => {
  const def = defaultRange();
  const from = normDate(req.query.from) ?? def.from;
  const to = normDate(req.query.to) ?? def.to;
  if (from > to) {
    res.status(400).json({ error: "תאריך התחלה מאוחר מתאריך הסיום" });
    return;
  }
  try {
    const r = await buildReport(from, to);
    const f2 = (x: number) => x.toFixed(2);
    const lines: string[] = [];
    lines.push(`דוח מע"מ,${from} עד ${to}`);
    lines.push("");
    lines.push("סוג,סכום לפני מע\"מ (₪),מע\"מ (₪),סה\"כ (₪),מספר מסמכים");
    lines.push(`עסקאות (הכנסות),${f2(r.income.net)},${f2(r.income.vat)},${f2(r.income.total)},${r.income.count}`);
    lines.push(`תשומות (הוצאות),${f2(r.expense.net)},${f2(r.expense.vat)},${f2(r.expense.total)},${r.expense.count}`);
    lines.push("");
    lines.push(`מס עסקאות,${f2(r.vat.output)}`);
    lines.push(`מס תשומות,${f2(r.vat.input)}`);
    lines.push(`${r.vat.due >= 0 ? "מע\"מ לתשלום" : "מע\"מ להחזר"},${f2(Math.abs(r.vat.due))}`);
    lines.push("");
    lines.push("── עסקאות (הכנסות) ──");
    lines.push("תאריך,מספר,סוג,לקוח,לפני מע\"מ,מע\"מ,סה\"כ");
    for (const d of r.income.documents) {
      lines.push([d.date, d.number, d.typeName, (d.client || "").replace(/,/g, " "), f2(d.net), f2(d.vat), f2(d.total)].join(","));
    }
    lines.push("");
    lines.push("── תשומות (הוצאות) ──");
    lines.push("תאריך,מספר,ספק,קטגוריה,לפני מע\"מ,מע\"מ,סה\"כ");
    for (const d of r.expense.documents) {
      lines.push([d.date ?? "", (d.number ?? "").replace(/,/g, " "), (d.vendor || "").replace(/,/g, " "), (d.category ?? "").replace(/,/g, " "), f2(d.net), f2(d.vat), f2(d.total)].join(","));
    }
    const csv = "\uFEFF" + lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="vat-report-${from}_${to}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("Failed to export VAT report:", err);
    res.status(500).json({ error: "שגיאה בייצוא דוח המע\"מ" });
  }
});

export default router;
