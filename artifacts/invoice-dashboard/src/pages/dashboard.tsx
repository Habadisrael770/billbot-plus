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
  MoreHorizontal
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
  TableRow 
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

export default function Dashboard() {
  const { data: invoices, isLoading } = useInvoices();
  const { approve, markNotDuplicate, mergeAlias, isPending } = useInvoiceMutations();
  
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  
  const [mergeDialog, setMergeDialog] = useState<{
    isOpen: boolean;
    invoiceId: string | null;
    rawVendorName: string | null;
  }>({
    isOpen: false,
    invoiceId: null,
    rawVendorName: null,
  });

  // Calculate stats based on all data
  const stats = useMemo(() => {
    if (!invoices) return { total: 0, pending: 0, flagged: 0, approved: 0 };
    return {
      total: invoices.length,
      pending: invoices.filter(i => i.status === "pending_review").length,
      flagged: invoices.filter(i => i.status === "flagged_duplicate").length,
      approved: invoices.filter(i => i.status === "approved").length,
    };
  }, [invoices]);

  // Apply filters and search
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let result = invoices;

    if (filter === "pending") result = result.filter(i => i.status === "pending_review");
    if (filter === "approved") result = result.filter(i => i.status === "approved");
    if (filter === "duplicates") result = result.filter(i => i.duplicateStatus !== "unique");

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => 
        i.invoiceNumber?.toLowerCase().includes(q) || 
        i.rawVendorName?.toLowerCase().includes(q) ||
        i.canonicalVendorName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [invoices, filter, search]);

  const handleMergeConfirm = (invoiceId: string, aliasName: string, targetVendorId: string) => {
    mergeAlias(invoiceId, aliasName, targetVendorId);
    setMergeDialog({ isOpen: false, invoiceId: null, rawVendorName: null });
  };

  const getDuplicateBadge = (status: string) => {
    switch (status) {
      case "unique":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Unique</Badge>;
      case "exact_duplicate":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20">Exact Match</Badge>;
      case "probable_duplicate":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">Probable</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved</Badge>;
      case "flagged_duplicate":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20">Flagged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string | null | undefined, currency: string) => {
    if (!amount) return "-";
    return Number(amount).toLocaleString('en-IL', { style: 'currency', currency: currency || 'ILS' });
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Processed" 
          value={stats.total} 
          icon={<Files className="w-6 h-6" />} 
          delay={0} 
        />
        <StatCard 
          title="Pending Review" 
          value={stats.pending} 
          icon={<Clock className="w-6 h-6" />} 
          delay={0.1} 
        />
        <StatCard 
          title="Flagged Duplicates" 
          value={stats.flagged} 
          icon={<AlertTriangle className="w-6 h-6 text-rose-400" />} 
          trend={`${stats.total > 0 ? ((stats.flagged / stats.total) * 100).toFixed(1) : 0}% rate`}
          trendUp={false}
          delay={0.2} 
        />
        <StatCard 
          title="Approved" 
          value={stats.approved} 
          icon={<FileCheck className="w-6 h-6 text-emerald-400" />} 
          delay={0.3} 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-panel rounded-2xl flex flex-col overflow-hidden"
      >
        {/* Table Header Controls */}
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {(['all', 'pending', 'approved', 'duplicates'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                  filter === f 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search invoices..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black/20 border-white/10 focus:border-primary transition-colors text-foreground rounded-xl"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black/20 border-b border-white/5">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-muted-foreground font-medium py-4 px-6">Invoice</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-6">Date</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-6">Vendor Info</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-6 text-right">Total</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-6">Duplication</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-6">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium py-4 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      Loading intelligence data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-white/70">No invoices found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <TableRow 
                    key={inv.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <TableCell className="py-4 px-6">
                      <div className="font-medium text-white">{inv.invoiceNumber || "N/A"}</div>
                      {inv.extractionConfidence && (
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1.5" />
                          {(Number(inv.extractionConfidence) * 100).toFixed(0)}% confidence
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                      {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'MMM dd, yyyy') : "Unknown"}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="font-medium text-white max-w-[200px] truncate" title={inv.canonicalVendorName || inv.rawVendorName || "Unknown"}>
                        {inv.canonicalVendorName || inv.rawVendorName || "Unknown Vendor"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                        <span>Tax ID: {inv.taxId || "N/A"}</span>
                        {inv.rawVendorName && inv.canonicalVendorName && inv.rawVendorName !== inv.canonicalVendorName && (
                          <span className="text-primary/70" title={`Raw: ${inv.rawVendorName}`}>Has Alias</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right font-medium text-white">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getDuplicateBadge(inv.duplicateStatus)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getStatusBadge(inv.status)}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === "pending_review" && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            onClick={() => approve(inv.id)}
                            disabled={isPending}
                          >
                            <Check className="w-4 h-4 mr-1.5" /> Approve
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-white/10 shadow-xl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            
                            {inv.duplicateStatus !== "unique" && (
                              <DropdownMenuItem 
                                className="focus:bg-white/5 cursor-pointer text-amber-400 focus:text-amber-300"
                                onClick={() => markNotDuplicate(inv.id)}
                                disabled={isPending}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Mark Not Duplicate
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                              className="focus:bg-white/5 cursor-pointer"
                              onClick={() => setMergeDialog({
                                isOpen: true,
                                invoiceId: inv.id,
                                rawVendorName: inv.rawVendorName || null
                              })}
                            >
                              <Merge className="w-4 h-4 mr-2 text-primary" />
                              Merge Vendor Alias
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
        onConfirm={handleMergeConfirm}
        isPending={isPending}
      />
    </Layout>
  );
}
