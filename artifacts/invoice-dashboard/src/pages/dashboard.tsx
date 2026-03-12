import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
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
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap text-xs">
          ייחודי
        </Badge>
      );
    case "exact_duplicate":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 whitespace-nowrap text-xs">
          כפול מדויק
        </Badge>
      );
    case "probable_duplicate":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap text-xs">
          ייתכן כפול
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap text-xs">
          ממתין
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap text-xs">
          אושר
        </Badge>
      );
    case "flagged_duplicate":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 whitespace-nowrap text-xs">
          מסומן
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getCategoryBadge(category: string | null | undefined) {
  if (!category) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/20 whitespace-nowrap text-xs">
      {category}
    </Badge>
  );
}

function formatCurrency(amount: string | null | undefined, currency: string) {
  if (!amount) return "—";
  const symbol = (currency || "ILS") === "ILS" ? "₪" : currency;
  const num = Number(amount).toLocaleString("he-IL", { maximumFractionDigits: 0 });
  return `${symbol}${num}`;
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
      className="rounded-2xl border border-white/5 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">
            {inv.invoiceNumber || "ללא מספר"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {inv.invoiceDate
              ? format(new Date(inv.invoiceDate), "dd/MM/yyyy")
              : "תאריך לא ידוע"}
          </p>
        </div>
        <p className="text-base font-bold text-white shrink-0" dir="ltr">
          {formatCurrency(inv.total, inv.currency)}
        </p>
      </div>

      <div className="rounded-xl bg-white/5 px-3 py-2">
        <p className="text-xs text-muted-foreground">ספק</p>
        <p className="text-sm font-medium text-white truncate">
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

      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        {inv.status === "pending_review" && (
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-8 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs"
            onClick={onApprove}
            disabled={isPending}
          >
            <Check className="w-3.5 h-3.5 mr-1" /> אשר
          </Button>
        )}
        {inv.duplicateStatus !== "unique" && (
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-8 border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 rounded-lg text-xs"
            onClick={onMarkNotDuplicate}
            disabled={isPending}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" /> לא כפול
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg text-xs"
            >
              <Tag className="w-3.5 h-3.5 mr-1" /> קטגוריה
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card border-white/10 shadow-xl rounded-xl max-h-60 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-muted-foreground">בחר קטגוריה</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            {CATEGORIES.map((cat) => (
              <DropdownMenuItem
                key={cat}
                className="focus:bg-white/5 cursor-pointer rounded-lg text-sm"
                onClick={() => onChangeCategory(cat)}
              >
                {cat}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg text-xs"
          onClick={onMerge}
        >
          <Merge className="w-3.5 h-3.5 mr-1" /> מיזוג
        </Button>
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
  const [search, setSearch] = useState("");
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

  return (
    <Layout>
      {/* ── Action bar (shares grid columns with stat cards) ── */}
      {/* xl: 6 cols — spacer(1) spacer(2) | SEARCH(3=סה"כ) | cal+upload(4-6) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 items-center mb-3" dir="rtl">
        {/* cols 1-2 on xl: empty spacers above מסמכים + ספק */}
        <div className="hidden xl:block" />
        <div className="hidden xl:block" />

        {/* col 3 on xl: Search — aligned above סה"כ חשבוניות */}
        <div className="col-span-1 xl:col-span-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              dir="rtl"
              className="w-full h-10 pr-9 pl-3 text-sm rounded-xl border border-white/10 bg-card/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
          </div>
        </div>

        {/* cols 4-6 on xl: action buttons */}
        <div className="col-span-1 lg:col-span-2 xl:col-span-3 flex items-center gap-2">
          {/* Calendar / date range */}
          <button className="flex items-center gap-2 h-10 px-3 sm:px-4 rounded-xl border border-white/10 bg-card/60 text-foreground text-sm hover:bg-white/5 transition-colors whitespace-nowrap shrink-0" dir="rtl">
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="hidden sm:inline">{monthStart} - {monthEnd}</span>
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

      {/* ── Table / cards panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="rounded-2xl border border-white/5 bg-card/30 backdrop-blur-xl flex flex-col overflow-hidden"
      >
        {/* Controls — filter tabs + send to accountant */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/5 flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  filter === key
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAccountantOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all"
            title="שלח לרואה חשבון"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">שלח לרו"ח</span>
          </button>
        </div>

        {/* ── Mobile: card list ── */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm">טוען נתונים...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-base font-medium text-white/70">לא נמצאו חשבוניות</p>
              <p className="text-xs mt-1">נסה לשנות את הסינון או החיפוש</p>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ספק</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">מס׳ מסמך</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">תאריך</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">קטגוריה</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">סכום</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">מע״מ %</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">מקור</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">סטטוס</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">תפעול</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      טוען נתוני מערכת...
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-white/70">לא נמצאו חשבוניות</p>
                      <p className="text-sm mt-1">העלה חשבונית ראשונה או שנה את הסינון.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const vatNum = inv.total && inv.vat && Number(inv.total) > 0
                    ? Math.round((Number(inv.vat) / Number(inv.total)) * 100)
                    : null;
                  const srcKey = (inv.sourceType ?? "upload").toLowerCase();
                  const srcLabels: Record<string, { label: string; color: string }> = {
                    gmail:    { label: "Gmail",    color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
                    email:    { label: "Gmail",    color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
                    outlook:  { label: "Outlook",  color: "bg-blue-700/15 text-blue-300 border-blue-700/20" },
                    telegram: { label: "Telegram", color: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
                    camera:   { label: "מצלמה",   color: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
                    upload:   { label: "העלאה",   color: "bg-white/10 text-muted-foreground border-white/10" },
                    manual:   { label: "ידני",    color: "bg-white/10 text-muted-foreground border-white/10" },
                  };
                  const srcInfo = srcLabels[srcKey] ?? srcLabels.upload;
                  const cat = inv.finalCategory ?? inv.suggestedCategory ?? "לא מסווג";
                  const catColors: Record<string, string> = {
                    תקשורת: "bg-amber-500/10 text-amber-300 border-amber-500/15",
                    "נסיעות והובלה": "bg-violet-500/10 text-violet-300 border-violet-500/15",
                    "ציוד משרדי": "bg-cyan-500/10 text-cyan-300 border-cyan-500/15",
                    שיווק: "bg-pink-500/10 text-pink-300 border-pink-500/15",
                    "תכנה /AI": "bg-emerald-500/10 text-emerald-300 border-emerald-500/15",
                  };
                  const catColor = catColors[cat] ?? "bg-violet-500/10 text-violet-300 border-violet-500/15";
                  const statusMap: Record<string, { label: string; color: string }> = {
                    approved:       { label: "אושר",   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
                    pending_review: { label: "ממתין",  color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
                    rejected:       { label: "נדחה",   color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
                  };
                  const statusInfo = statusMap[inv.status] ?? statusMap.pending_review;
                  const vendorDisplay = inv.canonicalVendorName ?? inv.normalizedVendorName ?? inv.rawVendorName ?? "—";

                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors group"
                    >
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
                              <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${catColor}`}>
                                {cat}
                              </span>
                              <Tag className="w-3 h-3 text-muted-foreground opacity-0 group-hover/cat:opacity-100 transition-opacity" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-white/10 shadow-xl rounded-xl max-h-60 overflow-y-auto" dir="rtl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">שנה קטגוריה</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            {CATEGORIES.map((c) => (
                              <DropdownMenuItem
                                key={c}
                                className="focus:bg-white/5 cursor-pointer rounded-lg text-sm"
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
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            {vatNum}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${srcInfo.color}`}>
                          <Mail className="w-3 h-3" />
                          {srcInfo.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-lg"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="bg-card border-white/10 shadow-xl rounded-xl" dir="rtl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">פעולות</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            {inv.status === "pending_review" && (
                              <DropdownMenuItem
                                className="focus:bg-white/5 cursor-pointer text-emerald-400 focus:text-emerald-300 rounded-lg text-sm gap-2"
                                onClick={() => approve(inv.id)}
                                disabled={isPending}
                              >
                                <Check className="w-3.5 h-3.5" />
                                אשר
                              </DropdownMenuItem>
                            )}
                            {inv.duplicateStatus !== "unique" && (
                              <DropdownMenuItem
                                className="focus:bg-white/5 cursor-pointer text-amber-400 focus:text-amber-300 rounded-lg text-sm gap-2"
                                onClick={() => markNotDuplicate(inv.id)}
                                disabled={isPending}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                סמן כלא-כפול
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="focus:bg-white/5 cursor-pointer rounded-lg text-sm gap-2"
                              onClick={() => openMerge(inv)}
                            >
                              <Merge className="w-3.5 h-3.5 text-primary" />
                              מיזוג ספק
                            </DropdownMenuItem>
                            {inv.filePath && (
                              <DropdownMenuItem
                                className="focus:bg-white/5 cursor-pointer rounded-lg text-sm gap-2"
                                onClick={() => window.open(inv.filePath!, "_blank")}
                              >
                                <FileCheck className="w-3.5 h-3.5 text-violet-400" />
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
