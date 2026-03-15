import React, { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { useSearch } from "@/context/search-context";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  FileCheck,
  Files,
  AlertTriangle,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Merge,
  Check,
  MoreHorizontal,
  Upload,
  Camera,
  ShoppingCart,
  Banknote,
  Tag,
  Copy,
  Paperclip,
  Mail,
  MailPlus,
  FileSpreadsheet,
  CalendarDays,
  ChevronDown,
  ArrowLeft,
  Receipt,
} from "lucide-react";
import { useInvoices, useInvoiceSummary, useInvoiceMutations } from "@/hooks/use-invoices";
import { Layout } from "@/components/layout";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OptimizeWidget } from "@/components/optimize-widget";
import { MergeAliasDialog } from "@/components/merge-alias-dialog";
import { EmailScanModal } from "@/components/email-scan-modal";
import { SendToAccountantModal } from "@/components/send-to-accountant-modal";

type FilterType = "all" | "pending" | "approved" | "duplicates";

type InvoiceRow = {
  id: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  rawVendorName?: string | null;
  normalizedVendorName?: string | null;
  canonicalVendorName?: string | null;
  taxId?: string | null;
  subtotal?: string | null;
  vat?: string | null;
  total?: string | null;
  currency: string;
  filePath?: string | null;
  duplicateStatus: string;
  status: string;
  extractionConfidence?: string | null;
  sourceType?: string | null;
  documentType?: string | null;
  suggestedCategory?: string | null;
  finalCategory?: string | null;
  categoryConfidence?: string | null;
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "pending", label: "ממתין" },
  { key: "approved", label: "אושר" },
  { key: "duplicates", label: "כפולות" },
];

const CATEGORIES = [
  "תקשורת",
  "ציוד משרדי / מחשבים",
  "תכנה /AI",
  "תוכנת ענן",
  "דלק / רכב",
  "סופרמרקט / מזון",
  "בנק / פיננסים",
  "ביטוח",
  "משלוחי אוכל",
  "שיווק / פרסום",
  "שירותים מקצועיים",
  "נסיעות / תחבורה",
  "ציוד / תשתיות",
  "שכירות / נדל״ן",
  "אחר",
];

function getDuplicateBadge(status: string) {
  switch (status) {
    case "unique":
      return <span className="badge-active">ייחודי</span>;
    case "exact_duplicate":
      return <span className="badge-error">כפול מדויק</span>;
    case "probable_duplicate":
      return <span className="badge-warning">ייתכן כפול</span>;
    default:
      return <span className="badge-inactive">{status}</span>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return <span className="badge-warning">ממתין</span>;
    case "approved":
      return <span className="badge-active">אושר</span>;
    case "flagged_duplicate":
      return <span className="badge-error">מסומן</span>;
    default:
      return <span className="badge-inactive">{status}</span>;
  }
}

function getCategoryBadge(category: string | null | undefined) {
  if (!category) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className="badge-primary">{category}</span>;
}

function formatCurrency(amount: string | null | undefined, currency: string) {
  if (!amount) return "—";
  const symbol = (currency || "ILS") === "ILS" ? "₪" : currency;
  const num = Number(amount).toLocaleString("he-IL", { maximumFractionDigits: 0 });
  return `${symbol}${num}`;
}

// ── Compact expandable expense row ──────────────────────────────────────────
function MonthlyExpenseRow({ inv }: { inv: InvoiceRow }) {
  const [expanded, setExpanded] = useState(false);
  const vendor =
    inv.canonicalVendorName ?? inv.normalizedVendorName ?? inv.rawVendorName ?? "—";
  const amount = formatCurrency(inv.total, inv.currency);
  const date = inv.invoiceDate
    ? format(new Date(inv.invoiceDate), "dd/MM/yy")
    : "—";
  const isApproved = inv.status === "approved";

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-right hover:bg-elevated/60 transition-colors"
        dir="rtl"
      >
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
        <span className="flex-1 font-medium text-foreground truncate text-[14px] text-right">
          {vendor}
        </span>
        <span className="text-[12px] text-muted-foreground shrink-0 hidden sm:inline">{date}</span>
        <span
          className="font-bold text-foreground text-[14px] shrink-0 min-w-[70px] text-left"
          dir="ltr"
        >
          {amount}
        </span>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          isApproved
            ? "bg-emerald-500/15 text-emerald-500"
            : "bg-amber-500/15 text-amber-500"
        }`}>
          {isApproved ? "אושר" : "ממתין"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 bg-elevated/40 border-t border-border"
              dir="rtl"
            >
              {inv.invoiceNumber && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">מס׳ מסמך</p>
                  <p className="text-[13px] font-semibold text-foreground">{inv.invoiceNumber}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">תאריך מלא</p>
                <p className="text-[13px] font-semibold text-foreground">
                  {inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd/MM/yyyy") : "—"}
                </p>
              </div>
              {(inv.finalCategory ?? inv.suggestedCategory) && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">קטגוריה</p>
                  <p className="text-[13px] font-semibold text-foreground">
                    {inv.finalCategory ?? inv.suggestedCategory}
                  </p>
                </div>
              )}
              {inv.subtotal && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">לפני מע״מ</p>
                  <p className="text-[13px] font-semibold text-foreground" dir="ltr">
                    {formatCurrency(inv.subtotal, inv.currency)}
                  </p>
                </div>
              )}
              {inv.vat && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">מע״מ</p>
                  <p className="text-[13px] font-semibold text-foreground" dir="ltr">
                    {formatCurrency(inv.vat, inv.currency)}
                  </p>
                </div>
              )}
              {inv.taxId && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">ח.פ. / עוסק מורשה</p>
                  <p className="text-[13px] font-semibold text-foreground">{inv.taxId}</p>
                </div>
              )}
              {inv.sourceType && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">מקור</p>
                  <p className="text-[13px] font-semibold text-foreground capitalize">{inv.sourceType}</p>
                </div>
              )}
              {inv.documentType && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">סוג מסמך</p>
                  <p className="text-[13px] font-semibold text-foreground">{inv.documentType}</p>
                </div>
              )}
              {inv.duplicateStatus !== "unique" && (
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground mb-1">סטטוס כפילות</p>
                  {getDuplicateBadge(inv.duplicateStatus)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mobile invoice card ──────────────────────────────────────────────────────
function InvoiceCard({
  inv,
  onApprove,
  onMarkNotDuplicate,
  onMerge,
  onChangeCategory,
  isPending,
}: {
  inv: InvoiceRow;
  onApprove: () => void;
  onMarkNotDuplicate: () => void;
  onMerge: () => void;
  onChangeCategory: (category: string) => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-[14px] p-4 space-y-3"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {inv.invoiceNumber || "ללא מספר"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {inv.invoiceDate
              ? format(new Date(inv.invoiceDate), "dd/MM/yyyy")
              : "תאריך לא ידוע"}
          </p>
        </div>
        <p className="text-base font-bold text-foreground shrink-0" dir="ltr">
          {formatCurrency(inv.total, inv.currency)}
        </p>
      </div>

      <div className="rounded-[10px] bg-elevated border border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">ספק</p>
        <p className="text-sm font-medium text-foreground truncate">
          {inv.canonicalVendorName || inv.rawVendorName || "לא ידוע"}
        </p>
        {inv.taxId && (
          <p className="text-xs text-muted-foreground">ח.פ. {inv.taxId}</p>
        )}
      </div>

      {/* Category row */}
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">קטגוריה:</span>
        {getCategoryBadge(inv.finalCategory || inv.suggestedCategory)}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {getDuplicateBadge(inv.duplicateStatus)}
        {getStatusBadge(inv.status)}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border">
        {inv.status === "pending_review" && (
          <button
            className="flex-1 h-8 flex items-center justify-center gap-1.5 border border-success/25 text-success hover:bg-success/8 rounded-[8px] text-xs font-medium transition-colors"
            onClick={onApprove}
            disabled={isPending}
          >
            <Check className="w-3.5 h-3.5" /> אשר
          </button>
        )}
        {inv.duplicateStatus !== "unique" && (
          <button
            className="flex-1 h-8 flex items-center justify-center gap-1.5 border border-warning/25 text-warning hover:bg-warning/8 rounded-[8px] text-xs font-medium transition-colors"
            onClick={onMarkNotDuplicate}
            disabled={isPending}
          >
            <XCircle className="w-3.5 h-3.5" /> לא כפול
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 px-3 flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-elevated rounded-[8px] text-xs font-medium transition-colors">
              <Tag className="w-3.5 h-3.5" /> קטגוריה
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card border-border shadow-xl rounded-xl max-h-60 overflow-y-auto" style={{ boxShadow: "var(--shadow-dropdown)" }}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">בחר קטגוריה</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            {CATEGORIES.map((cat) => (
              <DropdownMenuItem
                key={cat}
                className="focus:bg-elevated cursor-pointer rounded-lg text-sm"
                onClick={() => onChangeCategory(cat)}
              >
                {cat}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="h-8 px-3 flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-elevated rounded-[8px] text-xs font-medium transition-colors"
          onClick={onMerge}
        >
          <Merge className="w-3.5 h-3.5" /> מיזוג
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: summary } = useInvoiceSummary();
  const { approve, markNotDuplicate, mergeAlias, updateCategory, isPending } = useInvoiceMutations();

  const [filter, setFilter] = useState<FilterType>("all");
  const { search, setSearch } = useSearch();
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"scan" | "attach">("scan");
  const [accountantOpen, setAccountantOpen] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<{
    isOpen: boolean;
    invoiceId: string | null;
    rawVendorName: string | null;
  }>({ isOpen: false, invoiceId: null, rawVendorName: null });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let result = invoices as InvoiceRow[];
    if (filter === "pending") result = result.filter((i) => i.status === "pending_review");
    if (filter === "approved") result = result.filter((i) => i.status === "approved");
    if (filter === "duplicates") result = result.filter((i) => i.duplicateStatus !== "unique");
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.invoiceNumber?.toLowerCase().includes(q) ||
          i.rawVendorName?.toLowerCase().includes(q) ||
          i.canonicalVendorName?.toLowerCase().includes(q) ||
          i.finalCategory?.toLowerCase().includes(q) ||
          i.suggestedCategory?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, filter, search]);

  const openMerge = useCallback((inv: InvoiceRow) =>
    setMergeDialog({ isOpen: true, invoiceId: inv.id, rawVendorName: inv.rawVendorName ?? null }),
  []);

  const openEmail = (mode: "scan" | "attach") => {
    setEmailMode(mode);
    setEmailOpen(true);
  };

  const now = new Date();
  const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "d MMM yyyy");
  const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "d MMM yyyy");

  // Current month label (Hebrew style)
  const monthLabel = format(now, "MMMM yyyy");
  const recentInvoices = useMemo(() => (invoices ?? []).slice(0, 3) as InvoiceRow[], [invoices]);

  // Greeting by hour
  const hour = now.getHours();
  const greeting = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
  const userName = (() => {
    try {
      const raw = localStorage.getItem("bb_user");
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p.name ?? p.email ?? null;
    } catch { return null; }
  })();

  return (
    <Layout>
      {/* ── Page heading ── */}
      <div className="mb-5" dir="rtl">
        <h1 className="text-[22px] sm:text-[26px] font-black text-foreground leading-tight tracking-tight">
          {userName ? `${greeting}, ${userName.split(" ")[0]} 👋` : "דשבורד"}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          סקירה כללית עבור {monthLabel}
        </p>
      </div>

      {/* ── Action bar (shares grid columns with stat cards) ── */}
      {/* Search + filters row — hidden on mobile (search is in the layout header bar) */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 items-center mb-3" dir="rtl">
        <div className="hidden xl:block" />
        <div className="hidden xl:block" />

        {/* Search field */}
        <div className="col-span-2 sm:col-span-1 xl:col-span-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש ספק, מספר..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              dir="rtl"
              className="search-bar h-10 pr-9 pl-3"
            />
          </div>
        </div>

        {/* Date range */}
        <div className="col-span-2 lg:col-span-2 xl:col-span-3 flex items-center gap-2">
          <button className="btn-secondary h-10 px-3 sm:px-4 whitespace-nowrap shrink-0" dir="rtl">
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-[13px]">{monthStart} - {monthEnd}</span>
          </button>
        </div>
      </div>

      {/* ── 6 Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="סה״כ מסמכים"
          value={summary?.total_documents ?? invoices?.length ?? 0}
          icon={<Files className="w-5 h-5 sm:w-6 sm:h-6" />}
          delay={0}
        />
        <StatCard
          title="חשבוניות ספק"
          value={summary?.supplier_invoices ?? 0}
          icon={<ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />}
          delay={0.05}
        />
        <StatCard
          title="סה״כ חשבוניות"
          value={summary?.total_amount
            ? `₪${Number(summary.total_amount).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`
            : "₪0"}
          icon={<Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
          delay={0.1}
        />
        <StatCard
          title="סה״כ מע״מ"
          value={summary?.total_vat
            ? `₪${Number(summary.total_vat).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`
            : "₪0"}
          icon={<Tag className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />}
          delay={0.15}
        />
        <StatCard
          title="ממתינות לאישור"
          value={summary?.pending_review ?? 0}
          icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />}
          delay={0.2}
        />
        <StatCard
          title="חשודות בכפילות"
          value={summary?.suspected_duplicates ?? 0}
          icon={<Copy className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />}
          trend={
            summary && summary.total_documents > 0
              ? `${((summary.suspected_duplicates / summary.total_documents) * 100).toFixed(1)}%`
              : undefined
          }
          trendUp={false}
          delay={0.25}
        />
      </div>

      {/* ── Optimize Account Widget ── */}
      <OptimizeWidget invoiceCount={invoices?.length ?? 0} />

      {/* ── הוצאות החודש — compact preview ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-card border border-border rounded-[14px] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
        dir="rtl"
      >
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-foreground leading-tight">הוצאות החודש</h2>
              <p className="text-[11px] text-muted-foreground">{monthLabel}</p>
            </div>
          </div>
          <Link href="/expenses">
            <span className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer">
              צפה בהכל
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            טוען...
          </div>
        ) : recentInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">אין הוצאות להצגה</p>
          </div>
        ) : (
          <>
            {recentInvoices.map((inv) => (
              <MonthlyExpenseRow key={inv.id} inv={inv} />
            ))}
            {(invoices?.length ?? 0) > 3 && (
              <div className="px-5 py-3 border-t border-border">
                <Link href="/expenses">
                  <span className="text-[13px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    + עוד {(invoices?.length ?? 0) - 3} הוצאות
                  </span>
                </Link>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Table / cards panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="bg-card border border-border rounded-[14px] flex flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Controls — filter tabs + send to accountant */}
        <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={filter === key ? "tab-active" : "tab-inactive"}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAccountantOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-teal hover:bg-teal/8 border border-teal/25 transition-colors"
            title="שלח לרואה חשבון"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">שלח לרו"ח</span>
          </button>
        </div>

        {/* ── Mobile: card list ── */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="empty-state">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="empty-state-desc">טוען נתונים...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 className="empty-state-icon" />
              <p className="empty-state-title">לא נמצאו חשבוניות</p>
              <p className="empty-state-desc">נסה לשנות את הסינון או החיפוש</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredInvoices.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  inv={inv}
                  isPending={isPending}
                  onApprove={() => approve(inv.id)}
                  onMarkNotDuplicate={() => markNotDuplicate(inv.id)}
                  onMerge={() => openMerge(inv)}
                  onChangeCategory={(cat) => updateCategory(inv.id, cat)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Desktop: table ── */}
        <div className="hidden sm:block overflow-x-auto" dir="rtl">
          <table className="table">
            <thead>
              <tr>
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
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="empty-state py-0">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="empty-state-desc">טוען נתוני מערכת...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="empty-state py-0">
                      <CheckCircle2 className="empty-state-icon" />
                      <p className="empty-state-title">לא נמצאו חשבוניות</p>
                      <p className="empty-state-desc">העלה חשבונית ראשונה או שנה את הסינון.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const vatNum = inv.total && inv.vat && Number(inv.total) > 0
                    ? Math.round((Number(inv.vat) / Number(inv.total)) * 100)
                    : null;
                  const srcKey = (inv.sourceType ?? "upload").toLowerCase();
                  const srcLabels: Record<string, { label: string; cls: string }> = {
                    gmail:    { label: "Gmail",    cls: "badge-primary" },
                    email:    { label: "Gmail",    cls: "badge-primary" },
                    outlook:  { label: "Outlook",  cls: "badge-primary" },
                    telegram: { label: "Telegram", cls: "badge-teal" },
                    camera:   { label: "מצלמה",   cls: "badge-inactive" },
                    upload:   { label: "העלאה",   cls: "badge-inactive" },
                    manual:   { label: "ידני",    cls: "badge-inactive" },
                  };
                  const srcInfo = srcLabels[srcKey] ?? srcLabels.upload;
                  const cat = inv.finalCategory ?? inv.suggestedCategory ?? "לא מסווג";
                  const statusMap: Record<string, string> = {
                    approved:       "badge-active",
                    pending_review: "badge-warning",
                    rejected:       "badge-error",
                  };
                  const statusCls = statusMap[inv.status] ?? "badge-warning";
                  const statusLabel: Record<string, string> = {
                    approved: "אושר", pending_review: "ממתין", rejected: "נדחה",
                  };
                  const vendorDisplay = inv.canonicalVendorName ?? inv.normalizedVendorName ?? inv.rawVendorName ?? "—";

                  return (
                    <tr key={inv.id} className="group">
                      {/* Supplier */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-medium text-foreground">{vendorDisplay}</span>
                      </td>

                      {/* Doc # */}
                      <td className="px-4 py-3.5 text-center font-mono text-muted-foreground text-xs">
                        {inv.invoiceNumber ?? "—"}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-center text-muted-foreground" dir="ltr">
                        {inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd/MM/yyyy") : "—"}
                      </td>

                      {/* Category — clickable to change */}
                      <td className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 group/cat hover:opacity-80 transition-opacity">
                              <span className="badge-primary">{cat}</span>
                              <Tag className="w-3 h-3 text-muted-foreground opacity-0 group-hover/cat:opacity-100 transition-opacity" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border rounded-xl max-h-60 overflow-y-auto" style={{ boxShadow: "var(--shadow-dropdown)" }} dir="rtl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">שנה קטגוריה</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border" />
                            {CATEGORIES.map((c) => (
                              <DropdownMenuItem
                                key={c}
                                className="focus:bg-elevated cursor-pointer rounded-lg text-sm"
                                onClick={() => updateCategory(inv.id, c)}
                              >
                                {c}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-semibold text-foreground" dir="ltr">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>

                      {/* VAT % */}
                      <td className="px-4 py-3.5 text-center">
                        {vatNum !== null ? (
                          <span className="badge-active">
                            <Check className="w-3 h-3 inline mr-0.5" />{vatNum}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={srcInfo.cls}>
                          {srcInfo.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={statusCls}>
                          {statusLabel[inv.status] ?? inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-[8px] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-elevated mx-auto">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="bg-card border-border rounded-xl" style={{ boxShadow: "var(--shadow-dropdown)" }} dir="rtl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">פעולות</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border" />
                            {inv.status === "pending_review" && (
                              <DropdownMenuItem
                                className="focus:bg-elevated cursor-pointer text-success focus:text-success rounded-lg text-sm gap-2"
                                onClick={() => approve(inv.id)}
                                disabled={isPending}
                              >
                                <Check className="w-3.5 h-3.5" />
                                אשר
                              </DropdownMenuItem>
                            )}
                            {inv.duplicateStatus !== "unique" && (
                              <DropdownMenuItem
                                className="focus:bg-elevated cursor-pointer text-warning focus:text-warning rounded-lg text-sm gap-2"
                                onClick={() => markNotDuplicate(inv.id)}
                                disabled={isPending}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                סמן כלא-כפול
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="focus:bg-elevated cursor-pointer rounded-lg text-sm gap-2"
                              onClick={() => openMerge(inv)}
                            >
                              <Merge className="w-3.5 h-3.5 text-primary" />
                              מיזוג ספק
                            </DropdownMenuItem>
                            {inv.filePath && (
                              <DropdownMenuItem
                                className="focus:bg-elevated cursor-pointer rounded-lg text-sm gap-2"
                                onClick={() => window.open(inv.filePath!, "_blank")}
                              >
                                <FileCheck className="w-3.5 h-3.5 text-purple" />
                                צפה בקובץ
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Dialogs ── */}
      <MergeAliasDialog
        isOpen={mergeDialog.isOpen}
        onClose={() => setMergeDialog({ isOpen: false, invoiceId: null, rawVendorName: null })}
        invoiceId={mergeDialog.invoiceId}
        rawVendorName={mergeDialog.rawVendorName}
        onConfirm={(id, alias, vendorId) => {
          mergeAlias(id, alias, vendorId);
          setMergeDialog({ isOpen: false, invoiceId: null, rawVendorName: null });
        }}
        isPending={isPending}
      />

      <EmailScanModal
        isOpen={emailOpen}
        mode={emailMode}
        onClose={() => setEmailOpen(false)}
      />

      <SendToAccountantModal
        isOpen={accountantOpen}
        onClose={() => setAccountantOpen(false)}
        invoiceCount={invoices?.length ?? 0}
      />
    </Layout>
  );
}
