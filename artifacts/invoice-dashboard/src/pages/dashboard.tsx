import React, { useState, useMemo } from "react";
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
  ChevronRight,
} from "lucide-react";
import { useInvoices, useInvoiceMutations } from "@/hooks/use-invoices";
import { Layout } from "@/components/layout";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MergeAliasDialog } from "@/components/merge-alias-dialog";

type FilterType = "all" | "pending" | "approved" | "duplicates";

type InvoiceRow = {
  id: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  rawVendorName?: string | null;
  canonicalVendorName?: string | null;
  taxId?: string | null;
  total?: string | null;
  currency: string;
  duplicateStatus: string;
  status: string;
  extractionConfidence?: string | null;
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "pending", label: "ממתין" },
  { key: "approved", label: "אושר" },
  { key: "duplicates", label: "כפולות" },
];

function getDuplicateBadge(status: string) {
  switch (status) {
    case "unique":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap">
          ייחודי
        </Badge>
      );
    case "exact_duplicate":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 whitespace-nowrap">
          כפול מדויק
        </Badge>
      );
    case "probable_duplicate":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap">
          ייתכן כפול
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap">
          ממתין
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap">
          אושר
        </Badge>
      );
    case "flagged_duplicate":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 whitespace-nowrap">
          מסומן
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatCurrency(amount: string | null | undefined, currency: string) {
  if (!amount) return "—";
  return Number(amount).toLocaleString("he-IL", {
    style: "currency",
    currency: currency || "ILS",
  });
}

// ── Mobile invoice card ──────────────────────────────────────────────────────
function InvoiceCard({
  inv,
  onApprove,
  onMarkNotDuplicate,
  onMerge,
  isPending,
}: {
  inv: InvoiceRow;
  onApprove: () => void;
  onMarkNotDuplicate: () => void;
  onMerge: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/5 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      {/* Top row */}
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
        <p className="text-base font-bold text-white shrink-0">
          {formatCurrency(inv.total, inv.currency)}
        </p>
      </div>

      {/* Vendor */}
      <div className="rounded-xl bg-white/5 px-3 py-2">
        <p className="text-xs text-muted-foreground">ספק</p>
        <p className="text-sm font-medium text-white truncate">
          {inv.canonicalVendorName || inv.rawVendorName || "לא ידוע"}
        </p>
        {inv.taxId && (
          <p className="text-xs text-muted-foreground">ח.פ. {inv.taxId}</p>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2 items-center">
        {getDuplicateBadge(inv.duplicateStatus)}
        {getStatusBadge(inv.status)}
        {inv.extractionConfidence && (
          <span className="text-xs text-muted-foreground">
            {(Number(inv.extractionConfidence) * 100).toFixed(0)}% דיוק
          </span>
        )}
      </div>

      {/* Actions */}
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
  const { approve, markNotDuplicate, mergeAlias, isPending } = useInvoiceMutations();

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [mergeDialog, setMergeDialog] = useState<{
    isOpen: boolean;
    invoiceId: string | null;
    rawVendorName: string | null;
  }>({ isOpen: false, invoiceId: null, rawVendorName: null });

  const stats = useMemo(() => {
    if (!invoices) return { total: 0, pending: 0, flagged: 0, approved: 0 };
    return {
      total: invoices.length,
      pending: invoices.filter((i) => i.status === "pending_review").length,
      flagged: invoices.filter((i) => i.status === "flagged_duplicate").length,
      approved: invoices.filter((i) => i.status === "approved").length,
    };
  }, [invoices]);

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
          i.canonicalVendorName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, filter, search]);

  const openMerge = (inv: InvoiceRow) =>
    setMergeDialog({ isOpen: true, invoiceId: inv.id, rawVendorName: inv.rawVendorName ?? null });

  return (
    <Layout>
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard title="סה״כ חשבוניות" value={stats.total} icon={<Files className="w-5 h-5 sm:w-6 sm:h-6" />} delay={0} />
        <StatCard title="ממתינות לאישור" value={stats.pending} icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />} delay={0.1} />
        <StatCard
          title="כפולות שזוהו"
          value={stats.flagged}
          icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />}
          trend={`${stats.total > 0 ? ((stats.flagged / stats.total) * 100).toFixed(1) : 0}%`}
          trendUp={false}
          delay={0.2}
        />
        <StatCard
          title="אושרו"
          value={stats.approved}
          icon={<FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
          delay={0.3}
        />
      </div>

      {/* ── Table / cards panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="rounded-2xl border border-white/5 bg-card/30 backdrop-blur-xl flex flex-col overflow-hidden"
      >
        {/* Controls */}
        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col gap-3">
          {/* Filter pills — scrollable on mobile */}
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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש חשבוניות..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black/20 border-white/10 focus:border-primary text-foreground rounded-xl"
            />
          </div>
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
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Desktop: table ── */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-black/20 border-b border-white/5">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-muted-foreground font-medium py-4 px-4 lg:px-6">חשבונית</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-4 lg:px-6">תאריך</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-4 lg:px-6">ספק</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-4 lg:px-6 text-right">סכום</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-4 lg:px-6">כפילות</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-4 lg:px-6">סטטוס</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-4 lg:px-6 text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      טוען נתוני מערכת...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-white/70">לא נמצאו חשבוניות</p>
                      <p className="text-sm mt-1">נסה לשנות את הסינון או החיפוש.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <TableCell className="py-4 px-4 lg:px-6">
                      <div className="font-medium text-white">{inv.invoiceNumber || "—"}</div>
                      {inv.extractionConfidence && (
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1.5" />
                          {(Number(inv.extractionConfidence) * 100).toFixed(0)}% דיוק
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-4 lg:px-6 text-sm text-muted-foreground whitespace-nowrap">
                      {inv.invoiceDate
                        ? format(new Date(inv.invoiceDate), "dd/MM/yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="py-4 px-4 lg:px-6">
                      <div
                        className="font-medium text-white max-w-[180px] truncate"
                        title={inv.canonicalVendorName || inv.rawVendorName || "לא ידוע"}
                      >
                        {inv.canonicalVendorName || inv.rawVendorName || "ספק לא ידוע"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
                        {inv.taxId && <span>ח.פ.: {inv.taxId}</span>}
                        {inv.rawVendorName &&
                          inv.canonicalVendorName &&
                          inv.rawVendorName !== inv.canonicalVendorName && (
                            <span className="text-primary/70">כינוי</span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4 lg:px-6 text-right font-medium text-white whitespace-nowrap">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell className="py-4 px-4 lg:px-6">
                      {getDuplicateBadge(inv.duplicateStatus)}
                    </TableCell>
                    <TableCell className="py-4 px-4 lg:px-6">
                      {getStatusBadge(inv.status)}
                    </TableCell>
                    <TableCell className="py-4 px-4 lg:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === "pending_review" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-lg"
                            onClick={() => approve(inv.id)}
                            disabled={isPending}
                          >
                            <Check className="w-4 h-4 mr-1" /> אשר
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            >
                              <span className="sr-only">פתח תפריט</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-card border-white/10 shadow-xl rounded-xl"
                          >
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              פעולות
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            {inv.duplicateStatus !== "unique" && (
                              <DropdownMenuItem
                                className="focus:bg-white/5 cursor-pointer text-amber-400 focus:text-amber-300 rounded-lg"
                                onClick={() => markNotDuplicate(inv.id)}
                                disabled={isPending}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                לא כפול
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="focus:bg-white/5 cursor-pointer rounded-lg"
                              onClick={() => openMerge(inv)}
                            >
                              <Merge className="w-4 h-4 mr-2 text-primary" />
                              מיזוג כינוי ספק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

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
    </Layout>
  );
}
