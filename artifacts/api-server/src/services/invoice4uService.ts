// Invoice4U API integration service
// API base: https://api.invoice4u.co.il/Services/ApiService.svc/
// Auth flow: API key (INVOICE4U secret) → VerifyLoginApiKey → User Token → GetDocuments

const API_BASE = "https://api.invoice4u.co.il/Services/ApiService.svc";

function getApiKey(): string {
  const t = process.env.INVOICE4U;
  if (!t) throw new Error("INVOICE4U secret not configured");
  return t;
}

// ─── Token cache ──────────────────────────────────────────────────────────────
// VerifyLoginApiKey returns a user session token needed for GetDocuments.
// We cache it for 30 minutes to avoid calling it on every request.
let _userToken: string | null = null;
let _tokenExpiry = 0;

async function getUserToken(): Promise<string> {
  if (_userToken && Date.now() < _tokenExpiry) return _userToken;

  const apiKey = getApiKey();
  const res = await fetch(`${API_BASE}/VerifyLoginApiKey`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) throw new Error(`VerifyLoginApiKey HTTP ${res.status}`);
  const json = await res.json() as { d: string | null };
  if (!json.d) throw new Error("VerifyLoginApiKey returned no token");

  _userToken = json.d;
  _tokenExpiry = Date.now() + 28 * 60 * 1000; // 28 min
  return _userToken;
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface I4UDocument {
  ID: number;
  DocumentNumber: number;
  DocType: number;
  DocTypeName: string;
  DocumentDate: string;   // /Date(ms)/ format
  ClientName: string;
  Total: number;
  Vat: number;
  BeforeVat: number;
  Status: number;
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

// Doc types: income = 1,2,3,6 | expense = 8,9
const INCOME_TYPES  = new Set([1, 2, 3, 6]);
const EXPENSE_TYPES = new Set([8, 9]);

const MONTH_NAMES_HE = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];

function parseI4UDate(raw: string): Date | null {
  const m = raw.match(/\/Date\((\d+)/);
  if (m) return new Date(parseInt(m[1], 10));
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getBranches(): Promise<I4UBranch[]> {
  // GetBranches works with the API key directly
  const data = await post<I4UBranch[] | null>("GetBranches", { token: getApiKey() });
  return data ?? [];
}

export async function getDocuments(opts: {
  dateFrom?: string;  // dd/MM/yyyy
  dateTo?: string;
  docTypeId?: number;
  branchId?: number;
  pageNumber?: number;
  pageSize?: number;
}): Promise<{ documents: I4UDocument[]; empty: boolean }> {
  // GetDocuments requires a User Token (not API key)
  const userToken = await getUserToken();

  const dr: Record<string, unknown> = {
    PageNumber: opts.pageNumber ?? 1,
    PageSize:   opts.pageSize   ?? 200,
  };
  if (opts.dateFrom)  dr.DateFrom  = opts.dateFrom;
  if (opts.dateTo)    dr.DateTo    = opts.dateTo;
  if (opts.docTypeId) dr.DocTypeID = opts.docTypeId;
  if (opts.branchId)  dr.BranchId  = opts.branchId;

  const data = await post<{ Response: I4UDocument[] | null; Errors: { Error: string }[] } | null>(
    "GetDocuments",
    { dr, token: userToken }
  );

  if (!data) return { documents: [], empty: true };

  // Check for auth error — if so, invalidate cached token and retry once
  const wrapper = data as { Response?: I4UDocument[] | null; Errors?: { Error: string }[] };
  const hasAuthError = wrapper.Errors?.some(e => e.Error === "UnauthorizedUser");
  if (hasAuthError) {
    _userToken = null; // invalidate cache
    const freshToken = await getUserToken();
    const retry = await post<{ Response: I4UDocument[] | null } | null>(
      "GetDocuments",
      { dr, token: freshToken }
    );
    if (!retry) return { documents: [], empty: true };
    return { documents: (retry as { Response?: I4UDocument[] | null }).Response ?? [], empty: false };
  }

  const docs = wrapper.Response ?? [];
  return { documents: docs, empty: docs.length === 0 };
}

export async function getMonthlyReport(year: number): Promise<{
  rows: MonthlyReportRow[];
  hasDocuments: boolean;
  totalIncome: number;
  totalExpense: number;
}> {
  const dateFrom = `01/01/${year}`;
  const dateTo   = `31/12/${year}`;

  const { documents: docs, empty } = await getDocuments({ dateFrom, dateTo, pageSize: 500 });

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
  let totalIncome = 0, totalExpense = 0;

  for (const [month, mdocs] of byMonth.entries()) {
    const [y, m] = month.split("-").map(Number);
    let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;

    for (const d of mdocs) {
      const total = Number(d.Total) || 0;
      if (INCOME_TYPES.has(d.DocType)) {
        income += total; incomeCount++;
        totalIncome += total;
      } else if (EXPENSE_TYPES.has(d.DocType)) {
        expense += total; expenseCount++;
        totalExpense += total;
      }
    }

    rows.push({
      month,
      monthLabel: `${MONTH_NAMES_HE[m - 1]} ${y}`,
      income, expense,
      net: income - expense,
      incomeCount, expenseCount,
      documents: mdocs,
    });
  }

  return {
    rows,
    hasDocuments: !empty && docs.length > 0,
    totalIncome,
    totalExpense,
  };
}

export function exportToCsv(rows: MonthlyReportRow[]): string {
  const header = "חודש,הכנסות (₪),הוצאות (₪),רווח נקי (₪),מסמכי הכנסה,מסמכי הוצאה";
  const lines = rows.map(r =>
    [r.monthLabel, r.income.toFixed(2), r.expense.toFixed(2), r.net.toFixed(2), r.incomeCount, r.expenseCount].join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\n"); // BOM for Hebrew Excel
}
