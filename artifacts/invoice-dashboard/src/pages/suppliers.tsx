import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Tag,
  Receipt,
  ChevronDown,
  ChevronRight,
  Hash,
  AlertCircle,
  RefreshCw,
  Plus,
  FileText,
  Download,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { useInvoices } from "@/hooks/use-invoices";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

interface Alias {
  id: string;
  aliasName: string;
  normalizedAlias: string;
}

interface Vendor {
  id: string;
  canonicalName: string;
  taxId: string | null;
  aliases: Alias[];
}

function useVendors() {
  return useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/vendors`);
      if (!res.ok) throw new Error("Failed to load vendors");
      return res.json();
    },
  });
}

function fmtAmount(n: number) {
  return `₪${n.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

// ── Add Vendor Modal ───────────────────────────────────────────────────────
function AddVendorModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name.trim()) { setError("נא להזין שם ספק"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicalName: name.trim(), taxId: taxId.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "שגיאה"); }
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת ספק");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-6 space-y-4" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">הוסף ספק</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">שם ספק *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: שוק הסיטונאים בע&quot;מ"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ח.פ. / ע.מ. (אופציונלי)</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="מספר 9 ספרות"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={submit}
            disabled={loading || done}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {done ? <Check className="w-4 h-4" /> : loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {done ? "נוסף!" : "הוסף ספק"}
          </button>
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Invoice Modal ──────────────────────────────────────────────────────
function AddInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [vendorName, setVendorName] = useState("");
  const [total, setTotal] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!vendorName.trim()) { setError("נא להזין שם ספק"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/invoices/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName: vendorName.trim(),
          total: total ? Number(total) : undefined,
          invoiceDate: invoiceDate || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "שגיאה"); }
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת חשבונית");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-6 space-y-4" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">הוסף חשבונית ידנית</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">שם ספק *</label>
            <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="שם הספק"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">סכום (₪)</label>
              <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" min="0" step="0.01"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">תאריך</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">מספר חשבונית (אופציונלי)</label>
            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={loading || done}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
            {done ? <Check className="w-4 h-4" /> : loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {done ? "נוסף!" : "הוסף חשבונית"}
          </button>
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vendor Card ────────────────────────────────────────────────────────────
function VendorCard({ vendor, invoiceCount, totalSpent }: { vendor: Vendor; invoiceCount: number; totalSpent: number }) {
  const [open, setOpen] = useState(false);
  const initials = vendor.canonicalName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-shadow hover:shadow-md">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-4 px-5 py-4 text-right">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
          {initials || <Building2 className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{vendor.canonicalName}</p>
          {vendor.taxId && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Hash className="w-3 h-3" /> ח.פ. {vendor.taxId}
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-6 shrink-0 text-left">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">חשבוניות</p>
            <p className="font-semibold text-foreground text-sm">{invoiceCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">סה"כ הוצאות</p>
            <p className="font-semibold text-foreground text-sm" dir="ltr">{totalSpent > 0 ? fmtAmount(totalSpent) : "—"}</p>
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 bg-muted/30 space-y-3">
          <div className="flex flex-wrap gap-3 text-sm sm:hidden">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Receipt className="w-4 h-4" />{invoiceCount} חשבוניות</span>
            {totalSpent > 0 && <span className="font-medium text-foreground" dir="ltr">{fmtAmount(totalSpent)} סה"כ</span>}
          </div>
          {vendor.aliases.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />שמות חלופיים ({vendor.aliases.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {vendor.aliases.map((a) => (
                  <span key={a.id} className="text-xs px-2.5 py-1 bg-card border border-border rounded-lg text-foreground/70">{a.aliasName}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">אין שמות חלופיים רשומים</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const qc = useQueryClient();
  const { data: vendors = [], isLoading, isError, refetch } = useVendors();
  const { data: invoices = [] } = useInvoices();
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);

  const vendorStats = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const inv of invoices) {
      const vid = inv.vendorId;
      if (!vid) continue;
      if (!map[vid]) map[vid] = { count: 0, total: 0 };
      map[vid].count++;
      map[vid].total += Number(inv.total ?? 0);
    }
    return map;
  }, [invoices]);

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => (vendorStats[v.id]?.count ?? 0) > 0).length;
  const totalSpendAll = Object.values(vendorStats).reduce((s, v) => s + v.total, 0);

  const handleExport = () => {
    const rows = [["שם ספק", "ח.פ.", "חשבוניות", "סה\"כ הוצאות"]];
    for (const v of vendors) {
      rows.push([v.canonicalName, v.taxId ?? "", String(vendorStats[v.id]?.count ?? 0), String(vendorStats[v.id]?.total ?? 0)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vendors.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ספקים</h1>
            <p className="text-sm text-muted-foreground mt-1">כל הספקים שזוהו אוטומטית מחשבוניות שהועלו</p>
          </div>

          {/* 4 action buttons — 2 per row */}
          <div className="grid grid-cols-2 gap-2 sm:shrink-0">
            <button
              onClick={() => setShowAddVendor(true)}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              הוסף ספק
            </button>
            <button
              onClick={() => setShowAddInvoice(true)}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <FileText className="w-4 h-4" />
              הוסף חשבונית
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              רענן
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              ייצוא CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "סה\"כ ספקים", value: totalVendors, icon: Building2, color: "text-primary" },
            { label: "ספקים פעילים", value: activeVendors, icon: Receipt, color: "text-emerald-500" },
            { label: "סה\"כ הוצאות", value: fmtAmount(totalSpendAll), icon: Tag, color: "text-amber-500", ltr: true },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold text-foreground`} dir={stat.ltr ? "ltr" : undefined}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Vendor list */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />)}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="font-medium text-foreground">שגיאה בטעינת הספקים</p>
            <button onClick={() => refetch()} className="text-sm text-primary hover:underline">נסה שוב</button>
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">אין ספקים עדיין</p>
            <p className="text-sm text-muted-foreground max-w-xs">ספקים ייווצרו אוטומטית כשתעלה חשבוניות, או לחץ "הוסף ספק"</p>
            <button
              onClick={() => setShowAddVendor(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> הוסף ספק ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} invoiceCount={vendorStats[vendor.id]?.count ?? 0} totalSpent={vendorStats[vendor.id]?.total ?? 0} />
            ))}
            <p className="text-center text-xs text-muted-foreground pt-2">מציג {vendors.length} ספקים</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddVendor && (
        <AddVendorModal
          onClose={() => setShowAddVendor(false)}
          onSuccess={() => { void qc.invalidateQueries({ queryKey: ["vendors"] }); }}
        />
      )}
      {showAddInvoice && (
        <AddInvoiceModal
          onClose={() => setShowAddInvoice(false)}
          onSuccess={() => { void qc.invalidateQueries({ queryKey: ["invoices"] }); }}
        />
      )}
    </Layout>
  );
}
