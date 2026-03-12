import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Search,
  Tag,
  Receipt,
  ChevronDown,
  ChevronRight,
  Hash,
  AlertCircle,
  RefreshCw,
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

function VendorCard({
  vendor,
  invoiceCount,
  totalSpent,
}: {
  vendor: Vendor;
  invoiceCount: number;
  totalSpent: number;
}) {
  const [open, setOpen] = useState(false);
  const initials = vendor.canonicalName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-shadow hover:shadow-md">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-right"
      >
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
            <p className="font-semibold text-foreground text-sm" dir="ltr">
              {totalSpent > 0 ? fmtAmount(totalSpent) : "—"}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 bg-muted/30 space-y-3">
          <div className="flex flex-wrap gap-3 text-sm sm:hidden">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Receipt className="w-4 h-4" />
              {invoiceCount} חשבוניות
            </span>
            {totalSpent > 0 && (
              <span className="font-medium text-foreground" dir="ltr">
                {fmtAmount(totalSpent)} סה"כ
              </span>
            )}
          </div>

          {vendor.aliases.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                שמות חלופיים ({vendor.aliases.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {vendor.aliases.map((a) => (
                  <span
                    key={a.id}
                    className="text-xs px-2.5 py-1 bg-card border border-border rounded-lg text-foreground/70"
                  >
                    {a.aliasName}
                  </span>
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

export default function SuppliersPage() {
  const { data: vendors = [], isLoading, isError, refetch } = useVendors();
  const { data: invoices = [] } = useInvoices();
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.canonicalName.toLowerCase().includes(q) ||
        v.taxId?.includes(q) ||
        v.aliases.some((a) => a.aliasName.toLowerCase().includes(q))
    );
  }, [vendors, search]);

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => (vendorStats[v.id]?.count ?? 0) > 0).length;
  const totalSpendAll = Object.values(vendorStats).reduce((s, v) => s + v.total, 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ספקים</h1>
            <p className="text-sm text-muted-foreground mt-1">
              כל הספקים שזוהו אוטומטית מחשבוניות שהועלו
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            רענן
          </button>
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
              <p className={`text-xl font-bold text-foreground ${stat.ltr ? "dir-ltr" : ""}`} dir={stat.ltr ? "ltr" : undefined}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="חיפוש לפי שם ספק, ח.פ. או שם חלופי..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pr-10 pl-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="font-medium text-foreground">שגיאה בטעינת הספקים</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-primary hover:underline"
            >
              נסה שוב
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">
              {search ? "לא נמצאו ספקים תואמים" : "אין ספקים עדיין"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search
                ? "נסה מילות חיפוש אחרות"
                : "ספקים ייווצרו אוטומטית כשתעלה חשבוניות"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                invoiceCount={vendorStats[vendor.id]?.count ?? 0}
                totalSpent={vendorStats[vendor.id]?.total ?? 0}
              />
            ))}
            {filtered.length > 0 && (
              <p className="text-center text-xs text-muted-foreground pt-2">
                מציג {filtered.length} מתוך {totalVendors} ספקים
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
