// Invoice4U API integration service
// API base: https://api.invoice4u.co.il/Services/ApiService.svc/
// Auth: token param = GUID API key from INVOICE4U env secret

const API_BASE = "https://api.invoice4u.co.il/Services/ApiService.svc";

function getToken(): string {
  const t = process.env.INVOICE4U;
  if (!t) throw new Error("INVOICE4U secret not configured");
  return t;
}

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Invoice4U ${endpoint} HTTP ${res.status}`);
  const json = await res.json() as { d: T; ExceptionType?: string; Message?: string };
  if (json.ExceptionType) throw new Error(`Invoice4U error: ${json.Message}`);
  return json.d;
}

async function get<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const res = await fetch(`${API_BASE}/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`Invoice4U ${endpoint} HTTP ${res.status}`);
  const json = await res.json() as { d: T; ExceptionType?: string; Message?: string };
  if (json.ExceptionType) throw new Error(`Invoice4U error: ${json.Message}`);
  return json.d;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface I4UDocument {
  ID: number;
  DocumentNumber: number;
  DocType: number;         // 1=חשבונית מס, 2=חשבונית מס/קבלה, 3=קבלה, 4=הצעת מחיר, 5=תעודת משלוח, 6=חשבון עסקה, 7=הזמנת רכש, 8=חשבונית קנייה, 9=זיכוי ספק, 10=זיכוי לקוח
  DocTypeName: string;
  DocumentDate: string;    // /Date(ms)/ format
  ClientName: string;
  Total: number;
  Vat: number;
  BeforeVat: number;
  Status: number;          // 1=open, 2=closed
  StatusName: string;
  BranchId: number;
  PaymentTypeName?: string;
}

export interface I4UBranch {
  ID: number;
  Name: string;
  Description: string;
  Email: string;
  IsDefault: boolean;
  Enabled: boolean;
}

export interface MonthlyReportRow {
  month: string;       // "2025-01"
  monthLabel: string;  // "ינואר 2025"
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  documents: I4UDocument[];
}

// Document types: income = 1,2,3,6 | expense = 8,9
const INCOME_TYPES  = new Set([1, 2, 3, 6]);
const EXPENSE_TYPES = new Set([8, 9]);

const MONTH_NAMES_HE = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];

function parseI4UDate(raw: string): Date | null {
  // WCF date: /Date(1234567890000)/  or  /Date(1234567890000+0200)/
  const m = raw.match(/\/Date\((\d+)/);
  if (m) return new Date(parseInt(m[1], 10));
  // Fallback: try direct parse
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getBranches(): Promise<I4UBranch[]> {
  const data = await post<I4UBranch[] | null>("GetBranches", { token: getToken() });
  return data ?? [];
}

export async function getDocuments(opts: {
  dateFrom?: string;  // dd/MM/yyyy
  dateTo?: string;
  docTypeId?: number;
  branchId?: number;
  pageNumber?: number;
  pageSize?: number;
}): Promise<I4UDocument[]> {
  const dr: Record<string, unknown> = {
    PageNumber: opts.pageNumber ?? 1,
    PageSize:   opts.pageSize   ?? 200,
  };
  if (opts.dateFrom)  dr.DateFrom  = opts.dateFrom;
  if (opts.dateTo)    dr.DateTo    = opts.dateTo;
  if (opts.docTypeId) dr.DocTypeID = opts.docTypeId;
  if (opts.branchId)  dr.BranchId  = opts.branchId;

  const data = await post<{ Response: I4UDocument[] | null; Errors: unknown[] } | null>(
    "GetDocuments",
    { dr, token: getToken() }
  );

  if (!data) return [];
  if (Array.isArray(data)) return data as I4UDocument[];

  // WCF CommonCollection wrapper
  const wrapper = data as { Response?: I4UDocument[] | null };
  return wrapper.Response ?? [];
}

export async function getMonthlyReport(year: number): Promise<MonthlyReportRow[]> {
  const dateFrom = `01/01/${year}`;
  const dateTo   = `31/12/${year}`;

  const docs = await getDocuments({ dateFrom, dateTo, pageSize: 500 });

  // Build month buckets
  const byMonth = new Map<string, I4UDocument[]>();
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    byMonth.set(key, []);
  }

  for (const doc of docs) {
    const d = doc.DocumentDate ? parseI4UDate(doc.DocumentDate) : null;
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (byMonth.has(key)) byMonth.get(key)!.push(doc);
  }

  const rows: MonthlyReportRow[] = [];
  for (const [month, mdocs] of byMonth.entries()) {
    const [y, m] = month.split("-").map(Number);
    let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;

    for (const d of mdocs) {
      const total = Number(d.Total) || 0;
      if (INCOME_TYPES.has(d.DocType)) {
        income += total;
        incomeCount++;
      } else if (EXPENSE_TYPES.has(d.DocType)) {
        expense += total;
        expenseCount++;
      }
    }

    rows.push({
      month,
      monthLabel: `${MONTH_NAMES_HE[m - 1]} ${y}`,
      income,
      expense,
      net: income - expense,
      incomeCount,
      expenseCount,
      documents: mdocs,
    });
  }

  return rows;
}

export function exportToCsv(rows: MonthlyReportRow[]): string {
  const header = "חודש,הכנסות (₪),הוצאות (₪),רווח נקי (₪),מסמכי הכנסה,מסמכי הוצאה";
  const lines = rows.map(r =>
    [r.monthLabel, r.income.toFixed(2), r.expense.toFixed(2), r.net.toFixed(2), r.incomeCount, r.expenseCount].join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\n"); // BOM for Hebrew Excel
}
