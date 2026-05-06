import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Download, RefreshCw, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, FileSpreadsheet, BarChart3, List,
  AlertCircle,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

interface MonthRow {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
}

interface ReportData {
  rows: MonthRow[];
  hasDocuments: boolean;
  totalIncome: number;
  totalExpense: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export function Invoice4UReport() {
  const { toast } = useToast();
  const [year,     setYear]     = useState(CURRENT_YEAR);
  const [data,     setData]     = useState<ReportData | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [view,     setView]     = useState<"chart" | "table">("chart");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchReport = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/invoice4u/report?year=${y}`);
      const json = await res.json() as ReportData & { error?: string };
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      toast({ title: "שגיאה", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleYearChange = (y: number) => {
    setYear(y);
    if (data) fetchReport(y);
  };

  const downloadCsv = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoice4u/export?year=${year}`);
      if (!res.ok) throw new Error("שגיאה בייצוא");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `invoice4u-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "שגיאת ייצוא", description: (e as Error).message, variant: "destructive" });
    }
  };

  const rows         = data?.rows ?? [];
  const totalIncome  = data?.totalIncome  ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const totalNet     = totalIncome - totalExpense;
  const hasDocuments = data?.hasDocuments ?? false;
  const maxVal       = Math.max(...rows.map(r => Math.max(r.income, r.expense)), 1);

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={year}
          onChange={e => handleYearChange(Number(e.target.value))}
          className="h-9 px-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          dir="ltr"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <button
          onClick={() => fetchReport(year)}
          disabled={loading}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {data ? "רענן" : "טען דוח"}
        </button>

        {data && (
          <>
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              ייצוא Excel
            </button>

            <div className="flex gap-1 border border-border rounded-xl p-1 bg-muted/30 mr-auto">
              <button
                onClick={() => setView("chart")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${view === "chart" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart3 className="w-3 h-3" /> גרף
              </button>
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${view === "table" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-3 h-3" /> טבלה
              </button>
            </div>
          </>
        )}
      </div>

      {/* Empty state — not yet loaded */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 opacity-20" />
          <p className="text-sm">לחץ "טען דוח" לשליפת נתוני הכנסות והוצאות מ-Invoice4U</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">טוען נתונים מ-Invoice4U…</span>
        </div>
      )}

      {/* Loaded */}
      {data && !loading && (
        <>
          {/* No documents notice */}
          {!hasDocuments && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">לא נמצאו מסמכים בשנת {year}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  החשבון ב-Invoice4U ריק מחשבוניות/קבלות לשנה זו. ברגע שתיצור מסמכים במערכת — הם יופיעו כאן אוטומטית.
                </p>
              </div>
            </div>
          )}

          {/* Summary cards — always show when loaded */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold">סה"כ הכנסות</span>
              </div>
              <p className="text-lg font-bold text-emerald-500">{fmt(totalIncome)}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-semibold">סה"כ הוצאות</span>
              </div>
              <p className="text-lg font-bold text-red-500">{fmt(totalExpense)}</p>
            </div>
            <div className={`rounded-2xl p-4 text-center border ${totalNet >= 0 ? "bg-blue-500/10 border-blue-500/20" : "bg-orange-500/10 border-orange-500/20"}`}>
              <div className={`flex items-center justify-center gap-1 mb-1 ${totalNet >= 0 ? "text-blue-400" : "text-orange-500"}`}>
                <Minus className="w-4 h-4" />
                <span className="text-xs font-semibold">רווח נקי</span>
              </div>
              <p className={`text-lg font-bold ${totalNet >= 0 ? "text-blue-400" : "text-orange-500"}`}>{fmt(totalNet)}</p>
            </div>
          </div>

          {/* Chart / Table */}
          {view === "chart" ? (
            <div className="bg-card border border-border rounded-2xl p-5 overflow-x-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-4">הכנסות vs הוצאות לפי חודש — {year}</p>
              {hasDocuments ? (
                <div className="flex items-end gap-2 h-48 min-w-[600px]">
                  {rows.map(row => {
                    const incH  = (row.income  / maxVal) * 180;
                    const expH  = (row.expense / maxVal) * 180;
                    const label = row.monthLabel.split(" ")[0];
                    return (
                      <div key={row.month} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                        <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 180 }}>
                          <div
                            className="bg-emerald-500/80 rounded-t-sm w-4 transition-all"
                            style={{ height: Math.max(incH, row.income > 0 ? 2 : 0) }}
                            title={`הכנסות: ${fmt(row.income)}`}
                          />
                          <div
                            className="bg-red-500/70 rounded-t-sm w-4 transition-all"
                            style={{ height: Math.max(expH, row.expense > 0 ? 2 : 0) }}
                            title={`הוצאות: ${fmt(row.expense)}`}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground/40 text-sm">
                  אין נתונים להצגה
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500/80" /><span className="text-xs text-muted-foreground">הכנסות</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500/70" /><span className="text-xs text-muted-foreground">הוצאות</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">חודש</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-emerald-500">הכנסות</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-red-500">הוצאות</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">רווח נקי</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">מסמכים</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const net = row.income - row.expense;
                    const isExpanded = expanded === row.month;
                    return (
                      <>
                        <tr
                          key={row.month}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => setExpanded(isExpanded ? null : row.month)}
                        >
                          <td className="py-3 px-4 font-medium">{row.monthLabel}</td>
                          <td className="py-3 px-4 text-emerald-500 font-mono tabular-nums">
                            {row.income > 0 ? fmt(row.income) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-3 px-4 text-red-500 font-mono tabular-nums">
                            {row.expense > 0 ? fmt(row.expense) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className={`py-3 px-4 font-mono tabular-nums font-semibold ${net > 0 ? "text-emerald-500" : net < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {row.income > 0 || row.expense > 0 ? fmt(net) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            {row.incomeCount + row.expenseCount > 0
                              ? `${row.incomeCount} הכנסה · ${row.expenseCount} הוצאה`
                              : <span className="opacity-40">ריק</span>}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {(row.incomeCount + row.expenseCount) > 0 &&
                              (isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                          </td>
                        </tr>
                        {isExpanded && (row.income > 0 || row.expense > 0) && (
                          <tr key={`${row.month}-exp`} className="bg-muted/10">
                            <td colSpan={6} className="p-4">
                              <p className="text-xs text-muted-foreground mb-2">פירוט — {row.monthLabel}</p>
                              <div className="space-y-1">
                                {row.income > 0 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-emerald-500 font-medium">הכנסות:</span>
                                    <span>{fmt(row.income)} ({row.incomeCount} מסמכים)</span>
                                  </div>
                                )}
                                {row.expense > 0 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                    <span className="text-red-500 font-medium">הוצאות:</span>
                                    <span>{fmt(row.expense)} ({row.expenseCount} מסמכים)</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    <td className="py-3 px-4 text-sm">סה"כ {year}</td>
                    <td className="py-3 px-4 text-emerald-500 font-mono">{fmt(totalIncome)}</td>
                    <td className="py-3 px-4 text-red-500 font-mono">{fmt(totalExpense)}</td>
                    <td className={`py-3 px-4 font-mono ${totalNet >= 0 ? "text-emerald-500" : "text-red-500"}`}>{fmt(totalNet)}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {rows.reduce((s, r) => s + r.incomeCount + r.expenseCount, 0)} מסמכים
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
