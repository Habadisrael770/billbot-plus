// Invoice4U API integration service
// Correct auth flow: API key → VerifyLoginApiKey → User Token → use for ALL calls

const API_BASE = "https://api.invoice4u.co.il/Services/ApiService.svc";

function getApiKey(): string {
  const t = process.env.INVOICE4U;
  if (!t) throw new Error("INVOICE4U secret not configured");
  return t;
}

// ─── User Token cache ─────────────────────────────────────────────────────────
let _userToken: string | null = null;
let _tokenExpiry = 0;

export async function getUserToken(force = false): Promise<string> {
  if (!force && _userToken && Date.now() < _tokenExpiry) return _userToken;

  const apiKey = getApiKey();
  const res = await fetch(`${API_BASE}/VerifyLoginApiKey`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) throw new Error(`VerifyLoginApiKey HTTP ${res.status}`);
  const json = await res.json() as { d: string | null };
  if (!json.d || json.d === "UnauthorizedUser" || json.d.length < 20) {
    throw new Error("API_KEY_INVALID");
  }

  _userToken = json.d;
  _tokenExpiry = Date.now() + 28 * 60 * 1000;
  return _userToken;
}

async function callPost<T>(endpoint: string, body: Record<string, unknown>, retry = true): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Invoice4U ${endpoint} HTTP ${res.status}`);

  const text = await res.text();
  if (!text || text.trim() === "") return null as T;

  let json: { d: T; ExceptionType?: string; Message?: string };
  try { json = JSON.parse(text); } catch { throw new Error(`Invoice4U ${endpoint}: invalid JSON`); }

  if (json.ExceptionType) throw new Error(`Invoice4U error: ${json.Message}`);
  return json.d;
}

// Wraps a call with auto-retry on stale token
async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await getUserToken();
  try {
    return await fn(token);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("Unauthorized") || msg.includes("token")) {
      // Retry with fresh token
      const fresh = await getUserToken(true);
      return await fn(fresh);
    }
    throw e;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface I4UDocument {
  ID: number;
  DocumentNumber: number;
  DocType: number;
  DocTypeName: string;
  DocumentDate: string;
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
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  documents: I4UDocument[];
}

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

// ─── Check API activation ─────────────────────────────────────────────────────
// We detect if API document access is enabled by trying a small GetDocuments call.
// UnauthorizedUser in Errors → not active. null → active (just empty account).
export async function checkApiActive(): Promise<{ active: boolean; orgName?: string; email?: string }> {
  return withToken(async (token) => {
    type DocResult = { Response: I4UDocument[] | null; Errors: { Error: string }[] } | null;
    const data = await callPost<DocResult>("GetDocuments", {
      dr: { PageNumber: 1, PageSize: 1 },
      token,
    });

    if (!data) return { active: true };  // null = authorized, just empty
    const wrapper = data as { Errors?: { Error: string }[] };
    const hasAuthError = wrapper.Errors?.some(e => e.Error === "UnauthorizedUser");
    return { active: !hasAuthError };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getBranches(): Promise<I4UBranch[]> {
  return withToken(async (token) => {
    // GetBranches can return array directly or CommonCollection wrapper
    const raw = await callPost<I4UBranch[] | { Response?: I4UBranch[] } | null>(
      "GetBranches", { token }
    );
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const wrapped = raw as { Response?: I4UBranch[] | null };
    return wrapped.Response ?? [];
  });
}

export async function getDocuments(opts: {
  dateFrom?: string;
  dateTo?: string;
  docTypeId?: number;
  branchId?: number;
  pageNumber?: number;
  pageSize?: number;
}): Promise<{ documents: I4UDocument[]; empty: boolean }> {
  return withToken(async (token) => {
    const dr: Record<string, unknown> = {
      PageNumber: opts.pageNumber ?? 1,
      PageSize:   opts.pageSize   ?? 200,
    };
    if (opts.dateFrom)  dr.DateFrom  = opts.dateFrom;
    if (opts.dateTo)    dr.DateTo    = opts.dateTo;
    if (opts.docTypeId) dr.DocTypeID = opts.docTypeId;
    if (opts.branchId)  dr.BranchId  = opts.branchId;

    type DocResult = { Response: I4UDocument[] | null; Errors: { Error: string }[] } | null;
    const data = await callPost<DocResult>("GetDocuments", { dr, token });

    if (!data) return { documents: [], empty: true };
    if (Array.isArray(data)) return { documents: data as I4UDocument[], empty: false };

    const wrapper = data as { Response?: I4UDocument[] | null; Errors?: { Error: string }[] };
    const hasAuthError = wrapper.Errors?.some(e => e.Error === "UnauthorizedUser");
    if (hasAuthError) {
      throw new Error("UnauthorizedUser — API access not enabled in Invoice4U settings");
    }
    const docs = wrapper.Response ?? [];
    return { documents: docs, empty: docs.length === 0 };
  });
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

  const byMonth = new Map<string, I4UDocument[]>();
  for (let m = 1; m <= 12; m++) {
    byMonth.set(`${year}-${String(m).padStart(2, "0")}`, []);
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
      if (INCOME_TYPES.has(d.DocType))  { income  += total; incomeCount++;  totalIncome  += total; }
      if (EXPENSE_TYPES.has(d.DocType)) { expense += total; expenseCount++; totalExpense += total; }
    }
    rows.push({ month, monthLabel: `${MONTH_NAMES_HE[m - 1]} ${y}`, income, expense, net: income - expense, incomeCount, expenseCount, documents: mdocs });
  }

  return { rows, hasDocuments: !empty && docs.length > 0, totalIncome, totalExpense };
}

export function exportToCsv(rows: MonthlyReportRow[]): string {
  const header = "חודש,הכנסות (₪),הוצאות (₪),רווח נקי (₪),מסמכי הכנסה,מסמכי הוצאה";
  const lines = rows.map(r =>
    [r.monthLabel, r.income.toFixed(2), r.expense.toFixed(2), r.net.toFixed(2), r.incomeCount, r.expenseCount].join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\n");
}
