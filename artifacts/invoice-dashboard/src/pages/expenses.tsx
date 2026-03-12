import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
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
} from "lucide-react";
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

function fmtAmount(v: string | null | undefined) {
  if (!v) return "—";
  return `₪${Number(v).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

function vatPct(total: string | null, vat: string | null) {
  if (!total || !vat || Number(total) === 0) return null;
  return Math.round((Number(vat) / Number(total)) * 100);
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  gmail: { label: "Gmail", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  outlook: { label: "Outlook", color: "bg-blue-700/15 text-blue-300 border-blue-700/20" },
  upload: { label: "העלאה", color: "bg-white/10 text-muted-foreground border-white/10" },
  telegram: { label: "Telegram", color: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
  manual: { label: "ידני", color: "bg-white/10 text-muted-foreground border-white/10" },
  email: { label: "Gmail", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
};

const CATEGORY_COLORS: Record<string, string> = {
  תקשורת: "bg-amber-500/10 text-amber-300 border-amber-500/15",
  "נסיעות והובלה": "bg-violet-500/10 text-violet-300 border-violet-500/15",
  "ציוד משרדי": "bg-cyan-500/10 text-cyan-300 border-cyan-500/15",
  שיווק: "bg-pink-500/10 text-pink-300 border-pink-500/15",
  תוכנה: "bg-emerald-500/10 text-emerald-300 border-emerald-500/15",
  "שכ״ד": "bg-orange-500/10 text-orange-300 border-orange-500/15",
  חשמל: "bg-yellow-500/10 text-yellow-300 border-yellow-500/15",
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approved: {
    label: "אושר",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    icon: <Check className="w-3 h-3" />,
  },
  pending_review: {
    label: "ממתין",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    icon: null,
  },
  rejected: {
    label: "נדחה",
    color: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    icon: <X className="w-3 h-3" />,
  },
};

// ── component ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { data: invoices = [] } = useInvoices();
  const { approve } = useInvoiceMutations();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<number>>(new Set());
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
          i.vendorName?.toLowerCase().includes(q) ||
          i.vendorNameNormalized?.toLowerCase().includes(q) ||
          i.invoiceNumber?.toLowerCase().includes(q) ||
          i.suggestedCategory?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [invoices, statusFilter, search]);

  // ── totals ──
  const totalAmt = filtered.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalVat = filtered.reduce((s, i) => s + Number(i.vat || 0), 0);

  // ── select helpers ──
  const toggleRow = (id: number) =>
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
  const handleApprove = (id: number) => approve(id);
  const handleDownload = () =>
    toast({ title: "הורדה", description: "הורדת קובץ PDF תתחיל בקרוב." });

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
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-white/10 bg-card/60 text-foreground text-sm hover:bg-white/5 transition-colors"
        >
          <Download className="w-4 h-4" />
          הורד קובץ
        </button>
      </div>

      {/* ── Filter bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-4 mb-4"
        dir="rtl"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-sm text-foreground hover:bg-white/10 transition-colors">
                <span>{statusFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
              {["הכל", "אושר", "ממתין", "נדחה"].map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
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
              className="w-full h-9 pr-9 pl-3 text-sm rounded-xl border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          <div className="flex-1" />

          {/* Filter icon button */}
          <button className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            סינון
          </button>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`h-9 px-3 flex items-center transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`h-9 px-3 flex items-center transition-colors ${view === "grid" ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-2xl overflow-hidden"
        dir="rtl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Head */}
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                {/* Checkbox */}
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-primary cursor-pointer rounded"
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ספק</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">מס׳ מסמך</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">תאריך</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">קטגוריה</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">סכום</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">מע״מ</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">מקור</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">ביטחון</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">תפעול</th>
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
                const pct = vatPct(inv.total, inv.vat);
                const srcKey = (inv.sourceType ?? "upload").toLowerCase();
                const srcInfo = SOURCE_LABELS[srcKey] ?? SOURCE_LABELS.upload;
                const cat = inv.finalCategory ?? inv.suggestedCategory ?? "לא מסווג";
                const catColor =
                  CATEGORY_COLORS[cat] ??
                  "bg-white/8 text-muted-foreground border-white/10";

                return (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`border-b border-white/5 transition-colors group ${
                      isSelected ? "bg-primary/5" : "hover:bg-white/3"
                    }`}
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
                      <span className="font-medium text-foreground">
                        {inv.vendorName ?? inv.vendorNameNormalized ?? "—"}
                      </span>
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
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${catColor}`}
                      >
                        {cat}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 font-semibold text-foreground" dir="ltr">
                      {fmtAmount(inv.total)}
                    </td>

                    {/* VAT % */}
                    <td className="px-4 py-3.5 text-center">
                      {pct !== null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${srcInfo.color}`}
                      >
                        <Mail className="w-3 h-3" />
                        {srcInfo.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Action menu */}
                    <td className="px-4 py-3.5 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-white/10 hover:ring-1 hover:ring-emerald-500/50 transition-all"
                            title="פעולות"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="min-w-[140px]" dir="rtl">
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Eye className="w-3.5 h-3.5" />
                            צפה
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-emerald-400 focus:text-emerald-400"
                            onClick={() => handleApprove(inv.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            אשר
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer text-rose-400 focus:text-rose-400">
                            <XCircle className="w-3.5 h-3.5" />
                            דחה
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
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
        <div
          className="flex items-center justify-between px-5 py-3 border-t border-white/8 bg-white/2"
          dir="rtl"
        >
          <p className="text-xs text-muted-foreground">
            {filtered.length > 0 ? (
              <>
                <span className="text-foreground font-medium">{filtered.length}</span> הוצאות בסכום
                כולל של{" "}
                <span className="text-foreground font-medium" dir="ltr">
                  {fmtAmount(String(totalAmt))}
                </span>{" "}
                מתוכם{" "}
                <span className="text-emerald-400 font-medium" dir="ltr">
                  {fmtAmount(String(totalVat))}
                </span>{" "}
                מע״מ
              </>
            ) : (
              "אין הוצאות להצגה"
            )}
          </p>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} נבחרו</span>
              <button
                onClick={() => selected.forEach((id) => handleApprove(id))}
                className="text-xs h-7 px-3 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-colors"
              >
                אשר הכל
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs h-7 px-3 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10 transition-colors"
              >
                בטל
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}
