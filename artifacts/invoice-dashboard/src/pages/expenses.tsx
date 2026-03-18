import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import {
  Search,
  Download,
  Check,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  FileDown,
  Mail,
  Filter,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  X,
  TrendingUp,
  PieChart as PieIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useInvoices, useInvoiceMutations } from "@/hooks/use-invoices";
import { Layout } from "@/components/layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtAmount(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return `₪${Number(v).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

function vatPct(total: string | null, vat: string | null) {
  if (!total || !vat || Number(total) === 0) return null;
  return Math.round((Number(vat) / Number(total)) * 100);
}

const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  gmail:    { label: "Gmail",    cls: "badge-primary" },
  outlook:  { label: "Outlook",  cls: "badge-primary" },
  upload:   { label: "העלאה",   cls: "badge-inactive" },
  telegram: { label: "Telegram", cls: "badge-teal" },
  manual:   { label: "ידני",    cls: "badge-inactive" },
  email:    { label: "Gmail",    cls: "badge-primary" },
  camera:   { label: "מצלמה",   cls: "badge-inactive" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  approved:       { label: "אושר",  cls: "badge-active"  },
  pending_review: { label: "ממתין", cls: "badge-warning" },
  rejected:       { label: "נדחה",  cls: "badge-error"   },
};

// ── chart palette ─────────────────────────────────────────────────────────────
const CAT_PALETTE = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#f43f5e", "#a855f7", "#fb923c", "#84cc16",
];

// ── Custom Tooltip for trend chart ───────────────────────────────────────────
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-border bg-card px-3 py-2 text-xs" style={{ boxShadow: "var(--shadow-dropdown)" }} dir="rtl">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span dir="ltr">₪{Number(p.value).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
        </p>
      ))}
    </div>
  );
}

// ── Custom Tooltip for category chart ────────────────────────────────────────
function CatTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-border bg-card px-3 py-2 text-xs" style={{ boxShadow: "var(--shadow-dropdown)" }} dir="rtl">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p style={{ color: payload[0]?.color }}>
        סכום: <span dir="ltr">₪{Number(payload[0]?.value || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
      </p>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { data: invoices = [] } = useInvoices();
  const { approve } = useInvoiceMutations();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("הכל");
  const [view, setView] = useState<"list" | "grid">("list");

  // ── filter ──
  const filtered = useMemo(() => {
    let r = [...invoices];
    if (statusFilter === "אושר") r = r.filter((i) => i.status === "approved");
    else if (statusFilter === "ממתין") r = r.filter((i) => i.status === "pending_review");
    else if (statusFilter === "נדחה") r = r.filter((i) => i.status === "rejected");
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (i) =>
          (i.canonicalVendorName ?? i.normalizedVendorName ?? i.rawVendorName ?? "").toLowerCase().includes(q) ||
          (i.invoiceNumber ?? "").toLowerCase().includes(q) ||
          (i.finalCategory ?? i.suggestedCategory ?? "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [invoices, statusFilter, search]);

  // ── totals ──
  const totalAmt = filtered.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalVat = filtered.reduce((s, i) => s + Number(i.vat || 0), 0);

  // ── chart data: expenses + VAT by day ──
  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; total: number; vat: number }> = {};
    invoices.forEach((inv) => {
      if (!inv.invoiceDate) return;
      try {
        const d = parseISO(inv.invoiceDate);
        if (!isValid(d)) return;
        const key = format(d, "dd/MM");
        if (!map[key]) map[key] = { date: key, total: 0, vat: 0 };
        map[key].total += Number(inv.total || 0);
        map[key].vat   += Number(inv.vat   || 0);
      } catch {}
    });
    return Object.values(map).sort((a, b) => {
      const [ad, am] = a.date.split("/").map(Number);
      const [bd, bm] = b.date.split("/").map(Number);
      return am !== bm ? am - bm : ad - bd;
    });
  }, [invoices]);

  // ── chart data: expenses by category ──
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => {
      const cat = inv.finalCategory ?? inv.suggestedCategory ?? "אחר";
      map[cat] = (map[cat] || 0) + Number(inv.total || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [invoices]);

  // ── select helpers ──
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(
      selected.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id))
    );

  // ── actions ──
  const handleApprove = (id: string) => approve(id);
  const handleDownload = () =>
    toast({ title: "הורדה", description: "הורדת קובץ PDF תתחיל בקרוב." });

  const hasData = invoices.length > 0;

  return (
    <Layout>
      {/* ── Title + Download ── */}
      <div className="flex items-center justify-between mb-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול הוצאות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            רשימת כל ההוצאות שנסרקו ומסווגו
          </p>
        </div>
        <button onClick={handleDownload} className="btn-secondary h-10">
          <Download className="w-4 h-4" />
          הורד קובץ
        </button>
      </div>

      {/* ── Charts ── */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4"
          dir="rtl"
        >
          {/* Trend chart */}
          <div className="bg-card border border-border rounded-[14px] p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">מגמת הוצאות ומע״מ</h3>
              <span className="text-xs text-muted-foreground mr-auto">לפי ימים</span>
            </div>
            {dailyData.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                אין מספיק נתונים להצגת גרף
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradVat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fill: "#888", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8, direction: "rtl" }}
                    formatter={(v) => v === "total" ? "הוצאות" : 'מע"מ'}
                  />
                  <Area type="monotone" dataKey="total" name="total" stroke="#6366f1" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
                  <Area type="monotone" dataKey="vat"   name="vat"   stroke="#22d3ee" strokeWidth={2} fill="url(#gradVat)"   dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category chart */}
          <div className="bg-card border border-border rounded-[14px] p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">הוצאות לפי קטגוריה</h3>
            </div>
            {categoryData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                אין נתונים
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#888", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#ccc", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip content={<CatTooltip />} />
                  <Bar dataKey="value" name="סכום" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CAT_PALETTE[i % CAT_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Filter bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-[14px] p-4 mb-4"
        style={{ boxShadow: "var(--shadow-card)" }}
        dir="rtl"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="btn-secondary h-9 px-3 gap-2">
                <span className="text-[13px]">{statusFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px] bg-card border-border" style={{ boxShadow: "var(--shadow-dropdown)" }}>
              {["הכל", "אושר", "ממתין", "נדחה"].map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="focus:bg-elevated cursor-pointer">
                  {s === statusFilter && <Check className="w-3.5 h-3.5 ml-2 text-primary" />}
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש ספק, מסמך, קטגוריה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              dir="rtl"
              className="search-bar h-9 pr-9 pl-3"
            />
          </div>

          <div className="flex-1" />

          {/* Filter icon button */}
          <button className="btn-secondary h-9 px-3 gap-1.5">
            <Filter className="w-4 h-4" />
            סינון
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-[10px] overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`h-9 px-3 flex items-center transition-colors text-[13px] ${
                view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-elevated"
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`h-9 px-3 flex items-center transition-colors text-[13px] border-r border-border ${
                view === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-elevated"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Grid View ── */}
      {view === "grid" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          dir="rtl"
        >
          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-[14px] px-4 py-16 text-center text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
              לא נמצאו הוצאות
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((inv, idx) => {
                const statusInfo = STATUS_MAP[inv.status] ?? STATUS_MAP["pending_review"];
                const srcKey = (inv.sourceType ?? "upload").toLowerCase();
                const srcInfo = SOURCE_LABELS[srcKey] ?? SOURCE_LABELS.upload;
                const cat = inv.finalCategory ?? inv.suggestedCategory ?? "לא מסווג";
                const vendorDisplay = inv.canonicalVendorName ?? inv.normalizedVendorName ?? inv.rawVendorName ?? "—";
                const initials = vendorDisplay.split(" ").slice(0, 2).map((w: string) => w[0] ?? "").join("").toUpperCase() || "?";

                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-card border border-border rounded-[14px] p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">{vendorDisplay}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd/MM/yyyy") : "—"}
                        </p>
                      </div>
                      <p className="font-bold text-foreground text-sm shrink-0" dir="ltr">{fmtAmount(inv.total)}</p>
                    </div>

                    {/* Category + Source */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="badge-primary text-[10px]">{cat}</span>
                      <span className={`${srcInfo.cls} text-[10px]`}>{srcInfo.label}</span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className={`${statusInfo.cls} text-[11px]`}>{statusInfo.label}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 flex items-center justify-center rounded-[8px] border border-border text-muted-foreground hover:text-foreground hover:bg-elevated transition-all">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px] bg-card border-border" style={{ boxShadow: "var(--shadow-dropdown)" }}>
                          <DropdownMenuItem className="gap-2 cursor-pointer text-success focus:text-success focus:bg-elevated" onClick={() => handleApprove(inv.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5" />אשר
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-elevated" onClick={handleDownload}>
                            <FileDown className="w-3.5 h-3.5" />הורד PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Table View ── */}
      {view === "list" && (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-[14px] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
        dir="rtl"
      >
        <div className="overflow-x-auto">
          <table className="table">
            {/* Head */}
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-primary cursor-pointer rounded"
                  />
                </th>
                <th>ספק</th>
                <th className="text-center">מס׳ מסמך</th>
                <th className="text-center">תאריך</th>
                <th>קטגוריה</th>
                <th className="text-left">סכום</th>
                <th className="text-center">מע״מ %</th>
                <th className="text-center">מקור</th>
                <th className="text-center">סטטוס</th>
                <th className="text-center">תפעול</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground">
                    לא נמצאו הוצאות
                  </td>
                </tr>
              )}
              {filtered.map((inv, idx) => {
                const isSelected = selected.has(inv.id);
                const statusInfo = STATUS_MAP[inv.status] ?? STATUS_MAP["pending_review"];
                const pct = vatPct(inv.total ?? null, inv.vat ?? null);
                const srcKey = (inv.sourceType ?? "upload").toLowerCase();
                const srcInfo = SOURCE_LABELS[srcKey] ?? SOURCE_LABELS.upload;
                const cat = inv.finalCategory ?? inv.suggestedCategory ?? "לא מסווג";
                const vendorDisplay = inv.canonicalVendorName ?? inv.normalizedVendorName ?? inv.rawVendorName ?? "—";

                return (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`group ${isSelected ? "!bg-primary/8" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(inv.id)}
                        className="w-4 h-4 accent-primary cursor-pointer rounded"
                      />
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-medium text-foreground">{vendorDisplay}</span>
                    </td>

                    {/* Document # */}
                    <td className="px-4 py-3.5 text-center font-mono text-muted-foreground text-xs">
                      {inv.invoiceNumber ?? "—"}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-center text-muted-foreground" dir="ltr">
                      {inv.invoiceDate
                        ? format(new Date(inv.invoiceDate), "dd/MM/yyyy")
                        : "—"}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="badge-primary">{cat}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 font-semibold text-foreground" dir="ltr">
                      {fmtAmount(inv.total)}
                    </td>

                    {/* VAT % */}
                    <td className="px-4 py-3.5 text-center">
                      {pct !== null ? (
                        <span className="badge-active">
                          <Check className="w-3 h-3 inline mr-0.5" />{pct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={srcInfo.cls}>{srcInfo.label}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={statusInfo.cls}>{statusInfo.label}</span>
                    </td>

                    {/* Action menu */}
                    <td className="px-4 py-3.5 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded-[8px] border border-border text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-elevated transition-all mx-auto"
                            title="פעולות"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="min-w-[140px] bg-card border-border" style={{ boxShadow: "var(--shadow-dropdown)" }}>
                          <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-elevated">
                            <Eye className="w-3.5 h-3.5" />
                            צפה
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-success focus:text-success focus:bg-elevated"
                            onClick={() => handleApprove(inv.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            אשר
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-elevated">
                            <XCircle className="w-3.5 h-3.5" />
                            דחה
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer focus:bg-elevated"
                            onClick={handleDownload}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            הורד PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer summary ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-elevated" dir="rtl">
          <p className="text-xs text-muted-foreground">
            {filtered.length > 0 ? (
              <>
                <span className="text-foreground font-semibold">{filtered.length}</span> הוצאות — סכום כולל{" "}
                <span className="text-foreground font-semibold" dir="ltr">{fmtAmount(totalAmt)}</span>
                {" "}| מע״מ{" "}
                <span className="text-success font-semibold" dir="ltr">{fmtAmount(totalVat)}</span>
              </>
            ) : "אין הוצאות להצגה"}
          </p>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} נבחרו</span>
              <button
                onClick={() => selected.forEach((id) => handleApprove(id))}
                className="text-xs h-7 px-3 rounded-[8px] bg-success/12 text-success hover:bg-success/20 border border-success/25 transition-colors"
              >
                אשר הכל
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs h-7 px-3 rounded-[8px] btn-secondary py-0"
              >
                בטל
              </button>
            </div>
          )}
        </div>
      </motion.div>
      )}
    </Layout>
  );
}
