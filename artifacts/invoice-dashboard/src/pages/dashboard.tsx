import React, { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { Link, useLocation } from "wouter";
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
  MailOpen,
  Eye,
  Download,
} from "lucide-react";
import { useInvoices, useInvoiceMutations } from "@/hooks/use-invoices";
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
import { GmailScanDialog } from "@/components/gmail-scan-dialog";
import { UploadInvoiceModal } from "@/components/upload-invoice-modal";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

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
  isForeign?: boolean | null;
  supplierCountry?: string | null;
  extractionSource?: string | null;
  extractionStatus?: string | null;
  reviewReason?: string | null;
  pdfType?: string | null;
  lineItemsCount?: number | null;
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

function ForeignBadge({ isForeign, country }: { isForeign?: boolean | null; country?: string | null }) {
  if (!isForeign) return null;
  const label = country === "US" ? 'ארה"ב' : country === "GB" ? "בריטניה" : country === "DE" ? "גרמניה" : country === "NL" ? "הולנד" : country === "SE" ? "שבדיה" : 'חו"ל';
  return (
    <span
      title={'חשבונית מחו"ל \u2014 אין ניכוי מע"מ'}
      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 shrink-0"
    >
      🌍 {label}
    </span>
  );
}

function formatCurrency(amount: string | null | undefined, currency: string) {
  if (!amount) return "—";
  const symbol = (currency || "ILS") === "ILS" ? "₪" : currency;
  const num = Number(amount).toLocaleString("he-IL", { maximumFractionDigits: 0 });
  return `${symbol}${num}`;
}

type LineItem = {
  id: string;
  productName: string | null;
  barcode: string | null;
  sku: string | null;
  quantity: string | null;
  unitPrice: string | null;
  lineTotal: string | null;
  discount: string | null;
  vatRate: string | null;
  itemConfidence: string | null;
  sortOrder: number;
};

function getPdfTypeLabel(t?: string | null) {
  switch (t) {
    case "text_pdf":      return { label: "PDF טקסט",   cls: "bg-blue-500/15 text-blue-400" };
    case "scanned_pdf":   return { label: "PDF סרוק",   cls: "bg-violet-500/15 text-violet-400" };
    case "encrypted_pdf": return { label: "PDF מוצפן",  cls: "bg-orange-500/15 text-orange-400" };
    case "corrupted_pdf": return { label: "PDF פגום",   cls: "bg-red-500/15 text-red-400" };
    default:              return null;
  }
}

function getExtractionStatusBadge(s?: string | null) {
  switch (s) {
    case "success": return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">✓ הצליח</span>;
    case "partial": return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">⚠ חלקי</span>;
    case "failed":  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500">✗ נכשל</span>;
    default: return null;
  }
}

function getReviewReasonLabel(r?: string | null) {
  if (!r) return null;
  const map: Record<string, string> = {
    HEADER_ONLY: "כותרות בלבד",
    LOW_CONFIDENCE: "ביטחון נמוך",
    NO_TOTAL: "סכום חסר",
    NO_VENDOR: "ספק חסר",
    NO_DATE: "תאריך חסר",
    PDF_ENCRYPTED: "PDF מוצפן",
    PDF_CORRUPTED: "PDF פגום",
    OCR_REQUIRED: "נדרש OCR",
    SCANNED_EMPTY: "סריקה ריקה",
  };
  return map[r] ?? r;
}

// ── Compact expandable expense row ──────────────────────────────────────────
function MonthlyExpenseRow({ inv }: { inv: InvoiceRow }) {
  const [expanded, setExpanded] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [lineItemsLoaded, setLineItemsLoaded] = useState(false);

  useEffect(() => {
    if (expanded && !lineItemsLoaded && (inv.lineItemsCount ?? 0) > 0) {
      fetch(`${API_BASE}/invoices/${inv.id}/line-items`)
        .then((r) => r.json())
        .then((data: LineItem[]) => { setLineItems(data); setLineItemsLoaded(true); })
        .catch(() => setLineItemsLoaded(true));
    }
  }, [expanded, lineItemsLoaded, inv.id, inv.lineItemsCount]);

  const vendor =
    inv.canonicalVendorName ?? inv.normalizedVendorName ?? inv.rawVendorName ?? "—";
  const amount = formatCurrency(inv.total, inv.currency);
  const date = inv.invoiceDate
    ? format(new Date(inv.invoiceDate), "dd/MM/yy")
    : "—";
  const isApproved = inv.status === "approved";
  const pdfBadge = getPdfTypeLabel(inv.pdfType);

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
              className="px-4 pb-4 pt-2 bg-elevated/40 border-t border-border space-y-3"
              dir="rtl"
            >
              {/* — invoice header fields — */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
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

              {/* — extraction metadata — */}
              {(inv.pdfType || inv.extractionStatus || inv.reviewReason) && (
                <div className="border-t border-border/50 pt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">מידע חילוץ AI</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {pdfBadge && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${pdfBadge.cls} border-current/20`}>
                        {pdfBadge.label}
                      </span>
                    )}
                    {getExtractionStatusBadge(inv.extractionStatus)}
                    {inv.reviewReason && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border">
                        {getReviewReasonLabel(inv.reviewReason)}
                      </span>
                    )}
                    {inv.extractionConfidence && (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        ביטחון: {Math.round(Number(inv.extractionConfidence) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* — line items table — */}
              {(inv.lineItemsCount ?? 0) > 0 && (
                <div className="border-t border-border/50 pt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    שורות פירוט ({inv.lineItemsCount})
                  </p>
                  {lineItems.length > 0 ? (
                    <div className="overflow-x-auto rounded-[8px] border border-border/60">
                      <table className="w-full text-[12px]" dir="rtl">
                        <thead>
                          <tr className="bg-elevated/60 border-b border-border/60">
                            <th className="text-right font-semibold text-muted-foreground px-3 py-1.5">פריט</th>
                            <th className="text-center font-semibold text-muted-foreground px-2 py-1.5 w-16">כמות</th>
                            <th className="text-left font-semibold text-muted-foreground px-2 py-1.5 w-24" dir="ltr">מחיר יח׳</th>
                            <th className="text-left font-semibold text-muted-foreground px-2 py-1.5 w-24" dir="ltr">סה״כ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((li) => (
                            <tr key={li.id} className="border-b border-border/40 last:border-0 hover:bg-elevated/30 transition-colors">
                              <td className="px-3 py-2 text-foreground font-medium max-w-[180px] truncate">{li.productName ?? "—"}</td>
                              <td className="px-2 py-2 text-center text-muted-foreground">{li.quantity ? Number(li.quantity).toLocaleString("he-IL") : "—"}</td>
                              <td className="px-2 py-2 text-muted-foreground" dir="ltr">
                                {li.unitPrice ? formatCurrency(li.unitPrice, inv.currency) : "—"}
                              </td>
                              <td className="px-2 py-2 font-semibold text-foreground" dir="ltr">
                                {li.lineTotal ? formatCurrency(li.lineTotal, inv.currency) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">טוען...</p>
                  )}
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
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">
            {inv.canonicalVendorName || inv.rawVendorName || "לא ידוע"}
          </p>
          <ForeignBadge isForeign={inv.isForeign} country={inv.supplierCountry} />
        </div>
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

      {/* View / Download row */}
      <div className="flex gap-2 pt-1">
        <a
          href={`${API_BASE}/invoices/${inv.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 h-8 flex items-center justify-center gap-1.5 border border-primary/25 text-primary hover:bg-primary/8 rounded-[8px] text-xs font-medium transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> צפייה
        </a>
        <a
          href={`${API_BASE}/invoices/${inv.id}/file`}
          download
          className="flex-1 h-8 flex items-center justify-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-elevated rounded-[8px] text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> הורדה
        </a>
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

// ── Re-extract banner ─────────────────────────────────────────────────────────
function ReExtractBanner({ totalUnprocessed, apiBase }: { totalUnprocessed: number; apiBase: string }) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [processed, setProcessed] = useState(0);
  const [remaining, setRemaining] = useState(totalUnprocessed);
  const runningRef = useRef(false);

  const startExtraction = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setState("running");
    let done = false;
    let totalProcessed = 0;
    while (!done) {
      try {
        const res = await fetch(`${apiBase}/invoices/re-extract?limit=20`, { method: "POST" });
        const data = await res.json() as { processed: number; remaining: number };
        totalProcessed += data.processed ?? 0;
        setProcessed(totalProcessed);
        setRemaining(data.remaining ?? 0);
        if ((data.remaining ?? 0) === 0 || (data.processed ?? 0) === 0) {
          done = true;
        }
      } catch {
        done = true;
      }
    }
    runningRef.current = false;
    setState("done");
  };

  if (state === "done") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[14px] border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3"
      dir="rtl"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-amber-400">
          {state === "running"
            ? `מעבד חשבוניות... (${processed} עובדו, ${remaining} נותרו)`
            : `נמצאו ${remaining.toLocaleString()} חשבוניות ללא נתוני AI`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {state === "running"
            ? "מחלץ נתונים — שם ספק, סכום, תאריך..."
            : "לחץ לעיבוד חשבוניות וחילוץ שם ספק, סכום ותאריך"}
        </p>
      </div>
      <button
        onClick={startExtraction}
        disabled={state === "running"}
        className="h-9 px-4 rounded-[10px] text-[12px] font-semibold whitespace-nowrap shrink-0 disabled:opacity-60 active:scale-95 transition-all flex items-center gap-2"
        style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", color: "#fff" }}
      >
        {state === "running" ? (
          <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />מעבד...</>
        ) : (
          "⚡ עבד חשבוניות"
        )}
      </button>
    </motion.div>
  );
}

// ── Date Range Picker popup ───────────────────────────────────────────────────
const DATE_PRESETS_LIST = [
  { key: "today", label: "היום"      },
  { key: "week",  label: "שבוע"      },
  { key: "month", label: "החודש"     },
  { key: "3m",    label: "3 חודשים"  },
  { key: "6m",    label: "חצי שנה"   },
  { key: "year",  label: "שנה"       },
  { key: "all",   label: "הכל"       },
] as const;

function DateRangePicker({
  activePreset, customFrom, customTo, onPreset, onCustomChange, onCustomApply, onClose, anchorRef,
}: {
  activePreset: string; customFrom: string; customTo: string;
  onPreset: (k: string) => void; onCustomChange: (from: string, to: string) => void;
  onCustomApply: () => void; onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement>;
}) {
  const [top, setTop] = useState(60);
  const [right, setRight] = useState(16);

  useLayoutEffect(() => {
    if (anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setTop(r.bottom + 8);
      setRight(window.innerWidth - r.right);
    }
  }, [anchorRef]);

  return (
    <>
      <div className="fixed inset-0 z-[190]" onClick={onClose} />
      <div
        style={{ top, right }}
        className="fixed z-[200] w-72 rounded-2xl border border-border bg-card shadow-2xl p-4"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-muted-foreground mb-2.5">בחר טווח תאריכים</p>
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {DATE_PRESETS_LIST.filter((p) => p.key !== "all").map((p) => (
            <button
              key={p.key}
              onClick={() => onPreset(p.key)}
              className={`h-8 rounded-[10px] text-xs font-medium transition-all ${
                activePreset === p.key
                  ? "bg-primary text-white"
                  : "bg-elevated border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => onPreset("all")}
            className={`h-8 col-span-2 rounded-[10px] text-xs font-medium transition-all ${
              activePreset === "all"
                ? "bg-primary text-white"
                : "bg-elevated border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            הכל
          </button>
        </div>
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">טווח מותאם אישית</p>
          <div className="flex gap-2 items-center">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-muted-foreground">מ-</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomChange(e.target.value, customTo)}
                style={{ colorScheme: "dark" }}
                className="h-8 px-2 rounded-[10px] border border-border bg-background text-xs text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-muted-foreground">עד</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomChange(customFrom, e.target.value)}
                style={{ colorScheme: "dark" }}
                className="h-8 px-2 rounded-[10px] border border-border bg-background text-xs text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>
          <button
            onClick={onCustomApply}
            disabled={!customFrom || !customTo}
            className="w-full h-8 rounded-[10px] bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors disabled:opacity-40"
          >
            החל טווח
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: invoices, isLoading } = useInvoices();
  const { approve, markNotDuplicate, mergeAlias, updateCategory, isPending } = useInvoiceMutations();

  const goToExpenses = (filter = "הכל") => {
    sessionStorage.setItem("bb_expense_filter", filter);
    navigate("/expenses");
  };

  const now = new Date();

  // ── Date range state ──────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: new Date(2020, 0, 1),
    to:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
  }));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerBtnRef = useRef<HTMLButtonElement>(null);
  const [activePreset, setActivePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState(() => format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"));
  const [customTo,   setCustomTo]   = useState(() => format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"));

  const applyPreset = (key: string) => {
    const n = new Date();
    let from: Date;
    let to = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59);
    switch (key) {
      case "today": from = new Date(n.getFullYear(), n.getMonth(), n.getDate()); break;
      case "week":  from = new Date(n); from.setDate(from.getDate() - 7); break;
      case "month": from = new Date(n.getFullYear(), n.getMonth(), 1); to = new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59); break;
      case "3m":    from = new Date(n); from.setMonth(from.getMonth() - 3); break;
      case "6m":    from = new Date(n); from.setMonth(from.getMonth() - 6); break;
      case "year":  from = new Date(n); from.setFullYear(from.getFullYear() - 1); break;
      default:      from = new Date(2020, 0, 1); to = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59);
    }
    setDateRange({ from, to });
    setActivePreset(key);
    setCustomFrom(format(from, "yyyy-MM-dd"));
    setCustomTo(format(to, "yyyy-MM-dd"));
    setDatePickerOpen(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    const from = new Date(customFrom);
    const to   = new Date(customTo + "T23:59:59");
    setDateRange({ from, to });
    setActivePreset("custom");
    setDatePickerOpen(false);
  };

  // Range label for display
  const rangeLabel = activePreset === "all"
    ? "כל הזמן"
    : `${format(dateRange.from, "d MMM")} — ${format(dateRange.to, "d MMM yyyy")}`;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [gmailScanOpen, setGmailScanOpen] = useState(false);
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

  // ── Date-range filtered invoices ──────────────────────────────────────────
  const dateFilteredInvoices = useMemo(() => {
    if (!invoices) return [];
    const fromMs = dateRange.from.getTime();
    const toMs   = dateRange.to.getTime();
    return (invoices as InvoiceRow[]).filter((inv) => {
      if (!inv.invoiceDate) return false;
      const d = new Date(inv.invoiceDate).getTime();
      return d >= fromMs && d <= toMs;
    });
  }, [invoices, dateRange]);

  // ── Client-side summary stats (synced to current date range) ─────────────
  const summaryStats = useMemo(() => ({
    total_documents:      dateFilteredInvoices.length,
    supplier_invoices:    dateFilteredInvoices.filter((i) => i.documentType !== "receipt").length,
    total_amount:         dateFilteredInvoices.reduce((s, i) => s + Number(i.total || 0), 0).toFixed(0),
    total_vat:            dateFilteredInvoices.reduce((s, i) => s + Number(i.vat   || 0), 0).toFixed(0),
    pending_review:       dateFilteredInvoices.filter((i) => i.status === "pending_review").length,
    suspected_duplicates: dateFilteredInvoices.filter((i) => i.duplicateStatus !== "unique").length,
  }), [dateFilteredInvoices]);

  const filteredInvoices = useMemo(() => {
    let result = dateFilteredInvoices;
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
  }, [dateFilteredInvoices, filter, search]);

  const openMerge = useCallback((inv: InvoiceRow) =>
    setMergeDialog({ isOpen: true, invoiceId: inv.id, rawVendorName: inv.rawVendorName ?? null }),
  []);

  const openEmail = (mode: "scan" | "attach") => {
    setEmailMode(mode);
    setEmailOpen(true);
  };

  const recentInvoices = useMemo(() => dateFilteredInvoices.slice(0, 3) as InvoiceRow[], [dateFilteredInvoices]);

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
      <div className="mb-4" dir="rtl">
        <h1 className="text-[22px] sm:text-[26px] font-black text-foreground leading-tight tracking-tight">
          {userName ? `${greeting}, ${userName.split(" ")[0]} 👋` : "דשבורד"}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          סקירה כללית · {rangeLabel}
        </p>

        {/* ── Mobile action row: יומן + upload + scan ── */}
        <div className="sm:hidden flex items-center gap-2 mt-3">
          {/* Date range button (mobile) */}
          <div className="flex-1 min-w-0">
            <button
              ref={datePickerBtnRef}
              onClick={() => setDatePickerOpen((o) => !o)}
              className="w-full h-10 rounded-[10px] flex items-center gap-2 px-3 border border-border bg-card text-[12px] font-semibold text-foreground hover:bg-elevated active:scale-95 transition-all"
            >
              <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="flex-1 truncate text-right">{rangeLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
            {datePickerOpen && (
              <DateRangePicker
                anchorRef={datePickerBtnRef}
                activePreset={activePreset}
                customFrom={customFrom}
                customTo={customTo}
                onPreset={applyPreset}
                onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
                onCustomApply={applyCustomRange}
                onClose={() => setDatePickerOpen(false)}
              />
            )}
          </div>

          {/* Upload invoice */}
          <button
            onClick={() => setUploadOpen(true)}
            className="h-10 px-3 rounded-[10px] flex items-center gap-1.5 text-[12px] font-semibold text-white whitespace-nowrap shrink-0 active:scale-95 transition-all"
            style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
          >
            <Upload className="w-3.5 h-3.5" />
            העלה
          </button>

          {/* Scan email */}
          <button
            onClick={() => setGmailScanOpen(true)}
            className="h-10 px-3 rounded-[10px] flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all border border-border bg-card text-foreground hover:bg-elevated"
          >
            <MailOpen className="w-3.5 h-3.5" />
            סרוק
          </button>
        </div>
      </div>

      {/* ── Desktop toolbar: יומן date range + actions ── */}
      <div className="hidden sm:flex items-center justify-between gap-3 mb-1" dir="rtl">

        {/* יומן — Date range picker button */}
        <div>
          <button
            ref={datePickerBtnRef}
            onClick={() => setDatePickerOpen((o) => !o)}
            className="h-10 px-4 rounded-[10px] flex items-center gap-2 border border-border bg-card text-[13px] font-semibold text-foreground hover:bg-elevated hover:border-primary/40 active:scale-95 transition-all whitespace-nowrap"
          >
            <CalendarDays className="w-4 h-4 text-blue-500" />
            <span>יומן</span>
            <span className="text-muted-foreground font-normal">·</span>
            <span className="text-foreground">{rangeLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {datePickerOpen && (
            <DateRangePicker
              anchorRef={datePickerBtnRef}
              activePreset={activePreset}
              customFrom={customFrom}
              customTo={customTo}
              onPreset={applyPreset}
              onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
              onCustomApply={applyCustomRange}
              onClose={() => setDatePickerOpen(false)}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="h-10 px-4 rounded-[10px] flex items-center gap-2 text-[13px] font-semibold text-white whitespace-nowrap active:scale-95 transition-all"
            style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
          >
            <Upload className="w-4 h-4" />
            העלה חשבונית
          </button>
          <button
            onClick={() => setGmailScanOpen(true)}
            className="h-10 px-4 rounded-[10px] flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap active:scale-95 transition-all border border-border bg-card text-foreground hover:bg-elevated"
          >
            <MailOpen className="w-4 h-4" />
            סרוק מייל
          </button>
        </div>

      </div>

      {/* ── 6 Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="סה״כ מסמכים"
          value={summaryStats.total_documents}
          icon={<Files className="w-5 h-5 sm:w-6 sm:h-6" />}
          delay={0}
          onClick={() => goToExpenses("הכל")}
        />
        <StatCard
          title="חשבוניות ספק"
          value={summaryStats.supplier_invoices}
          icon={<ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />}
          delay={0.05}
          onClick={() => goToExpenses("הכל")}
        />
        <StatCard
          title="סה״כ חשבוניות"
          value={Number(summaryStats.total_amount) > 0
            ? `₪${Number(summaryStats.total_amount).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`
            : "₪0"}
          icon={<Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
          delay={0.1}
          onClick={() => goToExpenses("הכל")}
        />
        <StatCard
          title="סה״כ מע״מ"
          value={Number(summaryStats.total_vat) > 0
            ? `₪${Number(summaryStats.total_vat).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`
            : "₪0"}
          icon={<Tag className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />}
          delay={0.15}
          onClick={() => goToExpenses("הכל")}
        />
        <StatCard
          title="ממתינות לאישור"
          value={summaryStats.pending_review}
          icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />}
          delay={0.2}
          onClick={() => goToExpenses("ממתין")}
        />
        <StatCard
          title="חשודות בכפילות"
          value={summaryStats.suspected_duplicates}
          icon={<Copy className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />}
          trend={
            summaryStats.total_documents > 0
              ? `${((summaryStats.suspected_duplicates / summaryStats.total_documents) * 100).toFixed(1)}%`
              : undefined
          }
          trendUp={false}
          delay={0.25}
          onClick={() => goToExpenses("כפול")}
        />
      </div>

      {/* ── Re-extraction banner (shows when unprocessed invoices exist) ── */}
      {(invoices as InvoiceRow[] | undefined)?.some(i => !i.extractionStatus) && (
        <ReExtractBanner totalUnprocessed={(invoices as InvoiceRow[]).filter(i => !i.extractionStatus).length} apiBase={API_BASE} />
      )}

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
              <h2 className="text-[15px] font-bold text-foreground leading-tight">הוצאות הטווח</h2>
              <p className="text-[11px] text-muted-foreground">{rangeLabel}</p>
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
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span className="font-medium text-foreground">{vendorDisplay}</span>
                          <ForeignBadge isForeign={inv.isForeign} country={inv.supplierCountry} />
                        </div>
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
                            {inv.filePath && inv.filePath !== "manual" && (
                              <DropdownMenuItem
                                className="focus:bg-elevated cursor-pointer rounded-lg text-sm gap-2"
                                onClick={() => window.open(`${API_BASE}/invoices/${inv.id}/file`, "_blank")}
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

      {/* ── Click-outside overlay for date picker ── */}
      {datePickerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDatePickerOpen(false)} />
      )}

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

      <UploadInvoiceModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />

      <GmailScanDialog
        isOpen={gmailScanOpen}
        onClose={() => setGmailScanOpen(false)}
        onViewInvoices={() => {
          setGmailScanOpen(false);
          sessionStorage.setItem("bb_expense_source_filter", "gmail");
          navigate("/expenses");
        }}
      />
    </Layout>
  );
}
