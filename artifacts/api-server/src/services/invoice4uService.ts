// Invoice4U API integration service
// Auth: INVOICE4U env var IS the token. Validate with IsAuthenticated.

const API_BASE = "https://api.invoice4u.co.il/Services/ApiService.svc";

function getToken(): string {
  const t = process.env.INVOICE4U;
  if (!t) throw new Error("INVOICE4U secret not configured");
  return t;
}

async function callPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface I4UDocument {
  ID: string;
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
  PdfLink?: string;
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

const DOC_TYPE_NAMES: Record<number, string> = {
  1: "חשבונית מס",
  2: "חשבונית מס/קבלה",
  3: "קבלה",
  4: "חשבון עסקה",
  5: "הצעת מחיר",
  6: "חשבונית זיכוי",
  7: "תעודת משלוח",
  10: "הזמנת רכש",
};

// Invoice4U requires ISO DateTime (YYYY-MM-DDT00:00:00). Accept DD/MM/YYYY or ISO.
function toIso(s: string, endOfDay = false): string {
  const t = endOfDay ? "T23:59:59" : "T00:00:00";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10) + t;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}${t}`;
  }
  return s;
}

// Map the raw Invoice4U Document object to our normalized I4UDocument.
function mapDoc(raw: Record<string, unknown>): I4UDocument {
  const docType = Number(raw["DocumentType"]) || 0;
  return {
    ID: (raw["ID"] as string) ?? (raw["UniqueID"] as string) ?? "",
    DocumentNumber: Number(raw["DocumentNumber"]) || 0,
    DocType: docType,
    DocTypeName: DOC_TYPE_NAMES[docType] ?? String(docType),
    DocumentDate: (raw["IssueDate"] as string) ?? "",
    ClientName: (raw["ClientName"] as string) ?? "",
    Total: Number(raw["Total"]) || 0,
    Vat: Number(raw["TotalTaxAmount"]) || 0,
    BeforeVat: Number(raw["TotalWithoutTax"]) || 0,
    Status: Number(raw["Status"] ?? raw["StatusID"]) || 0,
    StatusName: (raw["StatusName"] as string) ?? "",
    BranchId: Number(raw["BranchID"]) || 0,
    PaymentTypeName: (raw["PaymentTypeName"] as string) ?? undefined,
    PdfLink: (raw["PrintOriginalPDFLink"] as string) || undefined,
  };
}

// ─── IsAuthenticated — validate the token ────────────────────────────────────
// Returns a full User object if valid (with ApiActive, CompanyName, Email etc.)
interface I4UUser {
  ApiActive?: boolean;
  CompanyName?: string;
  Email?: string;
  Errors?: { Error: string }[];
  OrganizationID?: number;
}

export async function checkApiActive(): Promise<{ active: boolean; orgName?: string; email?: string }> {
  const token = getToken();
  const result = await callPost<I4UUser | null>("IsAuthenticated", { token });
  if (!result || typeof result !== "object") return { active: false };
  const hasErrors = result.Errors && result.Errors.length > 0;
  if (hasErrors) return { active: false };
  return {
    active: true,
    orgName: result.CompanyName ?? undefined,
    email:   result.Email ?? undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getBranches(): Promise<I4UBranch[]> {
  const token = getToken();
  const raw = await callPost<I4UBranch[] | { Response?: I4UBranch[] } | null>(
    "GetBranches", { token }
  );
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const wrapped = raw as { Response?: I4UBranch[] | null };
  return wrapped.Response ?? [];
}

// Document types we fetch for reports (income + expense). DocumentType is REQUIRED
// by the Invoice4U API — without it GetDocuments silently returns null.
const FETCH_TYPES = [...INCOME_TYPES, ...EXPENSE_TYPES];

type DocResult = {
  Response: Record<string, unknown>[] | null;
  Errors?: { Error: string }[];
} | null;

// Fetch every page of a single DocumentType within a date range.
async function fetchDocsOfType(
  token: string,
  docType: number,
  fromIso: string,
  toIso: string,
  pageSize: number,
  branchId?: number,
): Promise<{ docs: I4UDocument[]; authError: boolean }> {
  const out: I4UDocument[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 50; page++) {
    const dr: Record<string, unknown> = {
      Token: token,
      FromDate: fromIso,
      ToDate: toIso,
      PageNumber: page,
      PageSize: pageSize,
      DocumentType: docType,
    };
    if (branchId) dr.BranchID = branchId;

    const data = await callPost<DocResult>("GetDocuments", { dr, token });
    if (!data) break;

    const wrapper = data as { Response?: Record<string, unknown>[] | null; Errors?: { Error: string }[] };
    if (wrapper.Errors?.some(e => e.Error === "UnauthorizedUser")) {
      return { docs: out, authError: true };
    }
    const resp = wrapper.Response ?? [];
    if (resp.length === 0) break;

    let added = 0;
    for (const raw of resp) {
      const doc = mapDoc(raw);
      const id = doc.ID || `num:${doc.DocumentNumber}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(doc);
      added++;
    }
    // Stop when the API returns a short page or no new documents (avoids dup loops).
    if (resp.length < pageSize || added === 0) break;
  }
  return { docs: out, authError: false };
}

export async function getDocuments(opts: {
  dateFrom?: string;
  dateTo?: string;
  docTypes?: number[];
  branchId?: number;
  pageSize?: number;
}): Promise<{ documents: I4UDocument[]; empty: boolean }> {
  const token = getToken();
  const pageSize = opts.pageSize ?? 200;
  const types = opts.docTypes ?? FETCH_TYPES;

  // Invoice4U needs ISO DateTime; date filtering can be loose, so we also filter client-side.
  const fromIso = opts.dateFrom ? toIso(opts.dateFrom, false) : "2000-01-01T00:00:00";
  const toIsoStr = opts.dateTo ? toIso(opts.dateTo, true) : "2100-12-31T23:59:59";
  const fromTime = new Date(fromIso).getTime();
  const toTime = new Date(toIsoStr).getTime();

  const all: I4UDocument[] = [];
  const seen = new Set<string>();
  for (const t of types) {
    const { docs, authError } = await fetchDocsOfType(token, t, fromIso, toIsoStr, pageSize, opts.branchId);
    if (authError) {
      throw new Error("UnauthorizedUser — API access not enabled in Invoice4U settings");
    }
    for (const d of docs) {
      const id = d.ID || `num:${d.DocumentNumber}`;
      if (seen.has(id)) continue;
      // Safety net: Invoice4U ignores the date params, so enforce the range client-side.
      const dt = d.DocumentDate ? parseI4UDate(d.DocumentDate) : null;
      if (dt) {
        const time = dt.getTime();
        if (time < fromTime || time > toTime) continue;
      }
      seen.add(id);
      all.push(d);
    }
  }

  all.sort((a, b) => {
    const da = parseI4UDate(a.DocumentDate)?.getTime() ?? 0;
    const db = parseI4UDate(b.DocumentDate)?.getTime() ?? 0;
    return da - db;
  });

  return { documents: all, empty: all.length === 0 };
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
