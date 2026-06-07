import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Building2,
  SendHorizonal,
  Zap,
  Bot,
  Settings,
  HelpCircle,
  User,
  X,
  LogOut,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Gift,
  Upload,
  Camera,
  Crown,
  Menu,
  Mail,
  Phone,
  Search,
  MailOpen,
  Plus,
  ChevronRight,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { UploadInvoiceModal } from "@/components/upload-invoice-modal";
import { GmailScanDialog } from "@/components/gmail-scan-dialog";
import { SendToAccountantModal } from "@/components/send-to-accountant-modal";
import { useTheme } from "@/context/theme-context";
import { useSearch } from "@/context/search-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const PRIMARY_NAV = [
  { href: "/",                           icon: LayoutDashboard, label: "דשבורד",       desc: "סקירה כללית ותזרים",         color: "text-primary",    bg: "rgba(75,126,245,0.08)",  border: "rgba(75,126,245,0.25)"  },
  { href: "/expenses",                   icon: Receipt,         label: "הוצאות",       desc: "חשבוניות ותשלומים",          color: "text-teal",       bg: "rgba(45,212,191,0.08)",  border: "rgba(45,212,191,0.25)"  },
  { href: "/suppliers",                  icon: Building2,       label: "ספקים",        desc: "ניהול ספקים וקשרים",         color: "text-amber-400",  bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)"  },
  { href: "/export",                     icon: SendHorizonal,   label: 'ייצוא לרו"ח', desc: "שליחת דוחות לרואה חשבון",   color: "text-violet-400", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.25)"  },
  { href: "/integrations",               icon: Zap,             label: "אינטגרציות",   desc: "Gmail, Telegram, API",       color: "text-rose-400",   bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.25)"   },
  { href: "/settings?tab=automations",   icon: Bot,             label: "אוטומציות",    desc: "שליחה אוטומטית ותזמונים",   color: "text-emerald-400", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.25)"  },
  { href: "/hermes",                      icon: Sparkles,        label: "הרמס AI",      desc: "עוזר חכם לחשבוניות",        color: "text-fuchsia-400", bg: "rgba(217,70,239,0.08)", border: "rgba(217,70,239,0.25)"  },
];

const SECONDARY_NAV = [
  { href: "/settings", icon: Settings,   label: "הגדרות", desc: "העדפות ופרטי חשבון",  color: "text-slate-400",  bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
  { href: "/help",     icon: HelpCircle, label: "עזרה",   desc: "תמיכה ומדריכים",      color: "text-sky-400",    bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.25)"  },
];

// Helper: replace alpha in rgba string
function accentAt(rgba: string, alpha: number) {
  return rgba.replace(/[\d.]+\)$/, `${alpha})`);
}

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

// Resolve the display label for the current path (ignore query params)
function navLabel(location: string): string {
  const searchParams = typeof window !== "undefined" ? window.location.search : "";
  const isAutomations = location === "/settings" && searchParams.includes("tab=automations");
  if (isAutomations) return "אוטומציות";
  return ALL_NAV.find((n) => n.href.split("?")[0] === location)?.label ?? "דשבורד";
}

// Check if a nav item is active given the current location + search params
function isNavActive(itemHref: string, location: string): boolean {
  const [itemPath, itemQuery] = itemHref.split("?");
  if (itemPath !== location) return false;
  if (!itemQuery) {
    // settings base path is only active when NOT in automations tab
    const searchParams = typeof window !== "undefined" ? window.location.search : "";
    if (itemPath === "/settings") return !searchParams.includes("tab=automations");
    return true;
  }
  const searchParams = typeof window !== "undefined" ? window.location.search : "";
  return searchParams.includes(itemQuery);
}

function CompactSidebar({ location, onClose, onAccountant }: { location: string; onClose?: () => void; onAccountant?: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-center border-b border-border shrink-0">
        <span dir="ltr" className="text-sm font-black text-primary leading-none">BB+</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {PRIMARY_NAV.map((item) => {
          const active = isNavActive(item.href, location);
          const isExport = item.href === "/export";
          if (isExport) {
            return (
              <button
                key={item.href}
                onClick={() => { onClose?.(); onAccountant?.(); }}
                className={`w-full flex flex-col items-center gap-1 px-2 py-3 rounded-[10px] transition-all duration-200 ${
                  active ? "nav-item-active" : "nav-item"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-[10px] transition-all duration-200 ${
                active ? "nav-item-active" : "nav-item"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="py-4 px-2 space-y-1 border-t border-border">
        {SECONDARY_NAV.map((item) => {
          const active = isNavActive(item.href, location);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-[10px] transition-all duration-200 ${
                active ? "nav-item-active" : "nav-item"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileSidebar({
  location,
  onClose,
  onUpload,
  onScanEmail,
  onAccountant,
}: {
  location: string;
  onClose: () => void;
  onUpload: () => void;
  onScanEmail: () => void;
  onAccountant: () => void;
}) {
  const { theme } = useTheme();
  const lm = theme === "light"; // light-mode shorthand
  const [bellTooltip, setBellTooltip] = useState(false);
  const hubUserData = (() => {
    const u = readBbUser();
    try {
      const raw = localStorage.getItem("bb_user");
      const p = raw ? JSON.parse(raw) : {};
      return {
        name:    p.name    ?? u.name,
        email:   p.email   ?? u.email,
        phone:   p.phone   ?? "",
        company: p.company ?? p.businessName ?? "",
        initials: u.initials,
      };
    } catch {
      return { name: u.name, email: u.email, phone: "", company: "", initials: u.initials };
    }
  })();
  const hubUser = hubUserData.name;

  const hubPlan = (() => {
    try {
      const raw = localStorage.getItem("bb_onboarding_progress");
      if (!raw) return "free";
      const parsed = JSON.parse(raw);
      return parsed.plan ?? "free";
    } catch { return "free"; }
  })();

  const planLabel: Record<string, string> = {
    free: "חינם",
    starter: "Starter",
    business: "Business",
  };

  return (
    <div
      className="h-full flex flex-col dark-panel"
      style={{
        background: theme === "light"
          ? "linear-gradient(180deg, #f0f4ff 0%, #e8edf8 100%)"
          : "linear-gradient(180deg, #1a1d3a 0%, #0f1219 100%)"
      }}
      dir="rtl"
    >
      {/* ── Header bar ── */}
      <div className={`flex items-center justify-between px-5 pt-5 pb-5 shrink-0 border-b ${lm ? "border-black/8" : "border-white/8"}`}>
        {/* Bell — notification indicator only, not close */}
        <div className="relative">
          <button
            onClick={() => setBellTooltip((v) => !v)}
            className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all ${lm ? "bg-white border border-black/8 shadow-sm" : "bg-white/5 border border-white/10"}`}
            aria-label="התראות"
          >
            <Bell className="w-4 h-4 text-white/50" />
          </button>
          {bellTooltip && (
            <div
              className="absolute top-11 right-0 z-50 bg-card border border-border rounded-[10px] px-3 py-2 text-xs text-muted-foreground whitespace-nowrap shadow-lg"
              dir="rtl"
            >
              אין התראות חדשות
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span dir="ltr" className="text-[18px] font-black text-white tracking-tight">BillBOT+</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${
            hubPlan === "business" ? "bg-violet-500"
            : hubPlan === "starter" ? "bg-teal"
            : "bg-primary"
          }`}>{planLabel[hubPlan] ?? "חינם"}</span>
        </div>

        {/* X — close sidebar */}
        <button
          onClick={onClose}
          className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all ${lm ? "bg-white border border-black/8 shadow-sm" : "bg-white/5 border border-white/10"}`}
          aria-label="סגור תפריט"
        >
          <X className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* ── Profile card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.22 }}
        className="px-4 pt-4 pb-3 shrink-0"
      >
        <div
          className="rounded-2xl p-4"
          style={{
            border: lm ? "1.5px solid rgb(0 0 0/0.09)" : "1.5px solid rgba(255,255,255,0.22)",
            background: lm ? "#ffffff" : "rgba(255,255,255,0.04)",
            boxShadow: lm ? "0 2px 12px rgb(0 0 0/0.07), 0 1px 3px rgb(0 0 0/0.05)" : "none",
          }}
        >
          <div className="flex items-center gap-4 mb-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-primary/40 to-teal/20 border border-primary/25 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 ${lm ? "border-white" : "border-[#1a1d3a]"}`} />
            </div>
            {/* Name + plan */}
            <div className="flex-1 min-w-0">
              <p className="text-[24px] font-black text-white truncate leading-tight">{hubUser}</p>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md text-white mt-0.5 ${
                hubPlan === "business" ? "bg-violet-500"
                : hubPlan === "starter" ? "bg-teal"
                : "bg-primary/60"
              }`}>{planLabel[hubPlan] ?? "חינם"}</span>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-1.5 border-t border-white/10 pt-3">
            {hubUserData.email ? (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span className="text-[12px] text-white/70 truncate" dir="ltr">{hubUserData.email}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-white/25 shrink-0" />
                <span className="text-[12px] text-white/30 italic">אימייל לא מוגדר</span>
              </div>
            )}
            {hubUserData.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span className="text-[12px] text-white/70" dir="ltr">{hubUserData.phone}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-white/25 shrink-0" />
                <span className="text-[12px] text-white/30 italic">נייד לא מוגדר</span>
              </div>
            )}
            {hubUserData.company ? (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span className="text-[12px] text-white/70 truncate">{hubUserData.company}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-white/25 shrink-0" />
                <span className="text-[12px] text-white/30 italic">חברה / ח.פ לא מוגדר</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">

        {/* ── Primary CTAs ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.22 }}
          className="flex flex-col gap-2.5"
        >
          {/* Row 1: Upload — full width */}
          <button
            onClick={() => { onClose(); onUpload(); }}
            className="w-full flex items-center justify-center gap-2.5 h-[52px] rounded-2xl text-[16px] font-bold text-white active:scale-[0.97] transition-transform"
            style={{ background: "linear-gradient(135deg, #4B7EF5, hsl(var(--teal)))" }}
          >
            <Upload className="w-5 h-5 shrink-0" />
            העלה חשבונית
          </button>

          {/* Row 2: Calendar + Scan Email — equal halves */}
          <div className="flex gap-2.5">
            <button
              onClick={() => { onClose(); onUpload(); }}
              className="flex-1 flex items-center justify-center gap-1.5 h-[48px] rounded-xl text-[14px] font-semibold text-white active:scale-[0.97] transition-transform"
              style={{
                background: lm ? "#f1f5f9" : "rgba(255,255,255,0.07)",
                border: lm ? "1.5px solid rgb(0 0 0/0.09)" : "1.5px solid rgba(255,255,255,0.22)",
                boxShadow: lm ? "0 1px 4px rgb(0 0 0/0.06)" : "none",
              }}
            >
              <Camera style={{ width: 18, height: 18 }} className="shrink-0" />
              צלם חשבונית
            </button>
            <button
              onClick={() => { onClose(); onScanEmail(); }}
              className="flex-1 flex items-center justify-center gap-1.5 h-[48px] rounded-xl text-[14px] font-semibold text-white active:scale-[0.97] transition-transform"
              style={{
                background: lm ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.18)",
                border: lm ? "1.5px solid rgba(99,102,241,0.25)" : "1.5px solid rgba(99,102,241,0.38)",
                boxShadow: lm ? "0 1px 4px rgba(99,102,241,0.12)" : "none",
              }}
            >
              <MailOpen className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              סרוק מייל
            </button>
          </div>
        </motion.div>

        {/* Primary nav — category cards */}
        {PRIMARY_NAV.map((item, i) => {
          const active = isNavActive(item.href, location);
          const cardBorder = active ? accentAt(item.border, 0.85) : accentAt(item.border, 0.33);
          const iconBg = lm ? accentAt(item.border, 0.13) : accentAt(item.border, 0.20);
          const cardBg = active
            ? (lm ? accentAt(item.border, 0.07) : accentAt(item.border, 0.12))
            : (lm ? "#ffffff" : "transparent");
          const cardStyle = {
            padding: "14px 16px",
            background: cardBg,
            border: `1.5px solid ${cardBorder}`,
            boxShadow: active
              ? `0 0 0 2px ${accentAt(item.border, 0.26)}, 0 1px 4px rgba(0,0,0,0.06)`
              : lm ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
          };
          const cardInner = (
            <>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: iconBg, border: `1.5px solid ${accentAt(item.border, 0.33)}` }}
              >
                <item.icon className={`w-[22px] h-[22px] ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[15px] font-bold text-white leading-tight mb-[2px]">{item.label}</p>
                <p className="text-[12px] text-white/50 truncate whitespace-nowrap overflow-hidden">{item.desc}</p>
              </div>
              <ChevronRight className={`w-[18px] h-[18px] shrink-0 rotate-180 ${item.color}`} />
            </>
          );
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {item.href === "/export" ? (
                <button
                  onClick={() => { onClose(); onAccountant(); }}
                  className="flex items-center gap-[14px] rounded-[14px] transition-all active:scale-[0.97] w-full"
                  style={cardStyle}
                >
                  {cardInner}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-[14px] rounded-[14px] transition-all active:scale-[0.97] w-full"
                  style={cardStyle}
                >
                  {cardInner}
                </Link>
              )}
            </motion.div>
          );
        })}

        {/* Divider */}
        <div className={`h-px mx-1 ${lm ? "bg-black/8" : "bg-white/10"}`} />

        {/* Secondary nav — same category card style */}
        {SECONDARY_NAV.map((item, i) => {
          const active = isNavActive(item.href, location);
          const cardBorder = active ? accentAt(item.border, 0.85) : accentAt(item.border, 0.33);
          const iconBg = lm ? accentAt(item.border, 0.13) : accentAt(item.border, 0.20);
          const cardBg = active
            ? (lm ? accentAt(item.border, 0.07) : accentAt(item.border, 0.12))
            : (lm ? "#ffffff" : "transparent");
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + (PRIMARY_NAV.length + 1 + i) * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-[14px] rounded-[14px] transition-all active:scale-[0.97] w-full"
                style={{
                  padding: "14px 16px",
                  background: cardBg,
                  border: `1.5px solid ${cardBorder}`,
                  boxShadow: active
                    ? `0 0 0 2px ${accentAt(item.border, 0.26)}, 0 1px 4px rgba(0,0,0,0.06)`
                    : lm ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: iconBg, border: `1.5px solid ${accentAt(item.border, 0.33)}` }}
                >
                  <item.icon className={`w-[22px] h-[22px] ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[15px] font-bold text-white leading-tight mb-[2px]">{item.label}</p>
                  <p className="text-[12px] text-white/50 truncate whitespace-nowrap overflow-hidden">{item.desc}</p>
                </div>
                <ChevronRight className={`w-[18px] h-[18px] shrink-0 rotate-180 ${item.color}`} />
              </Link>
            </motion.div>
          );
        })}

        {/* Upgrade CTA (free only) */}
        {hubPlan === "free" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.22 }}
          >
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-4 px-5 h-[54px] rounded-2xl transition-all active:scale-[0.97] w-full"
              style={lm ? {
                background: "rgba(139,92,246,0.06)",
                border: "1px solid rgba(139,92,246,0.22)",
                boxShadow: "0 1px 4px rgb(0 0 0/0.05)",
              } : {
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              <Crown className="w-5 h-5 shrink-0 text-white" />
              <span className="flex-1 text-[15px] font-medium text-white">שדרג לStarter</span>
            </Link>
          </motion.div>
        )}

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.56, duration: 0.22 }}
          onClick={() => {
            localStorage.removeItem("bb_user");
            localStorage.removeItem("bb_wizard_done");
            window.location.reload();
          }}
          className="w-full flex items-center gap-4 px-5 h-[54px] rounded-2xl active:scale-[0.97] transition-all"
          style={lm ? {
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.18)",
            boxShadow: "0 1px 4px rgb(0 0 0/0.05)",
          } : {
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <LogOut className="w-5 h-5 shrink-0 text-white" />
          <span className="text-[15px] font-medium text-white">יציאה מהחשבון</span>
        </motion.button>

      </div>
    </div>
  );
}

// ── Shared user-data reader ──────────────────────────────────────────────
function readBbUser(): { name: string; email: string; initials: string } {
  try {
    const raw = localStorage.getItem("bb_user");
    if (!raw) return { name: "משתמש", email: "", initials: "מ" };

    let email = raw;
    let name  = raw;

    // Try to parse as JSON (new format: { email, name?, ... })
    try {
      const p = JSON.parse(raw);
      email = p.email ?? raw;
      name  = p.name  ?? p.email ?? raw;
    } catch {
      // Legacy: plain email string stored directly
    }

    // Derive initials
    const trimmed = name.trim();
    let initials: string;
    if (trimmed.includes("@")) {
      initials = trimmed.substring(0, 2).toUpperCase();
    } else {
      const parts = trimmed.split(/\s+/);
      initials = parts.length >= 2
        ? (parts[0][0]! + parts[1][0]!).toUpperCase()
        : trimmed.substring(0, 2).toUpperCase();
    }

    return { name, email, initials };
  } catch {
    return { name: "משתמש", email: "", initials: "מ" };
  }
}

function PersonalAreaDropdown() {
  const [, navigate] = useLocation();
  const user = readBbUser();

  const handleLogout = () => {
    localStorage.removeItem("bb_user");
    navigate("/");
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-elevated transition-colors focus:outline-none group">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-white text-sm font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:flex flex-col items-start text-right max-w-[130px]">
            <span className="text-[13px] font-semibold text-foreground leading-none truncate w-full">{user.name}</span>
            {user.email && user.email !== user.name && (
              <span className="text-[11px] text-muted-foreground leading-none mt-0.5 truncate w-full">{user.email}</span>
            )}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-64 bg-card border border-border rounded-[14px] p-2" style={{ boxShadow: "var(--shadow-dropdown)" }}>
        <div className="px-3 py-3 mb-1 rounded-[10px] bg-elevated">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-white font-bold">{user.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate">{user.name}</p>
              {user.email && (
                <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{user.email}</p>
              )}
              <span className="badge badge-primary mt-1 inline-block">משתמש</span>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-border my-1" />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1">חשבון</DropdownMenuLabel>
        <Link href="/profile">
          <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] focus:bg-elevated cursor-pointer text-[13px] text-foreground/80 hover:text-foreground transition-colors">
            <User className="w-4 h-4 text-primary" /> אזור אישי
          </DropdownMenuItem>
        </Link>
        <Link href="/settings">
          <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] focus:bg-elevated cursor-pointer text-[13px] text-foreground/80 hover:text-foreground transition-colors">
            <Settings className="w-4 h-4 text-muted-foreground" /> הגדרות
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] focus:bg-elevated cursor-pointer text-[13px] text-foreground/80 hover:text-foreground transition-colors">
          <Bell className="w-4 h-4 text-warning" /> התראות
          <span className="badge badge-warning mr-auto">3</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border my-1" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] cursor-pointer text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" /> יציאה
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trialDismissed, setTrialDismissed] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [gmailScanOpen, setGmailScanOpen] = useState(false);
  const [accountantOpen, setAccountantOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { search, setSearch } = useSearch();
  const { theme, toggleTheme } = useTheme();

  const currentLabel = navLabel(location);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Trial Banner */}
      {!trialDismissed && (
        <div
          className="shrink-0 relative z-30 flex items-center justify-center gap-4 px-4 py-2.5 text-white text-[13px] font-medium"
          style={{ background: "linear-gradient(90deg, #4361ee 0%, #2dd4bf 100%)" }}
        >
          <Gift className="w-4 h-4 shrink-0" />
          <span>נותרו לך <strong>7 ימים</strong> בניסיון חינמי</span>
          <Link href="/settings">
            <button className="px-3 py-1 rounded-[8px] bg-white/20 hover:bg-white/30 transition-colors text-white text-[11px] font-semibold border border-white/25">
              שדרג עכשיו
            </button>
          </Link>
          <button
            onClick={() => setTrialDismissed(true)}
            className="absolute left-4 p-1 rounded-[6px] hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-row-reverse flex-1 overflow-hidden">
        {/* Desktop Sidebar — compact, right */}
        <aside className="hidden md:flex w-20 shrink-0 border-l border-border bg-sidebar flex-col z-20">
          <CompactSidebar location={location} onAccountant={() => setAccountantOpen(true)} />
        </aside>

        {/* Mobile sidebar — AnimatePresence slide panel */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="mobile-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="md:hidden fixed inset-0 z-50 bg-black/60"
                onClick={() => setSidebarOpen(false)}
              />

              {/* Panel — full screen slide from right */}
              <motion.div
                key="mobile-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="md:hidden fixed inset-0 z-50 flex flex-col"
              >
                <MobileSidebar
                  location={location}
                  onClose={() => setSidebarOpen(false)}
                  onUpload={() => setUploadOpen(true)}
                  onScanEmail={() => setGmailScanOpen(true)}
                  onAccountant={() => { setSidebarOpen(false); setAccountantOpen(true); }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
          {/* Header */}
          <header dir="rtl" className="h-16 md:h-14 flex items-center gap-2 px-3 sm:px-6 border-b border-border bg-card z-10 shrink-0" style={{ boxShadow: "var(--shadow-sm)" }}>

            {/* ── RIGHT side (RTL start): hamburger + small logo ── */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Hamburger — mobile only, subtle border */}
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="md:hidden w-9 h-9 rounded-[10px] flex items-center justify-center text-foreground transition-all active:scale-95 shrink-0"
                style={{
                  border: theme === "dark"
                    ? "1.5px solid rgba(255,255,255,0.18)"
                    : "1.5px solid rgba(0,0,0,0.14)",
                  background: theme === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                }}
              >
                <Menu className="w-[18px] h-[18px]" />
              </button>

              {/* BillBOT+ logo — mobile only, compact */}
              <Link href="/" className="md:hidden">
                <span dir="ltr" className="text-[22px] font-black tracking-tight leading-none select-none cursor-pointer active:opacity-70 transition-opacity">
                  <span className="text-foreground">Bill</span><span className="text-foreground">BOT</span><span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">+</span>
                </span>
              </Link>

              {/* Desktop: page title */}
              <span className="hidden md:inline text-[14px] font-semibold text-foreground tracking-wide">{currentLabel}</span>
            </div>

            {/* ── CENTER: spacer ── */}
            <div className="flex-1" />

            {/* ── LEFT side: user profile + theme toggle ── */}
            <div className="flex items-center gap-1.5">
              {/* Mobile theme toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0"
                style={{
                  background: theme === "dark"
                    ? "rgba(251,191,36,0.15)"
                    : "rgba(99,102,241,0.12)",
                  border: theme === "dark"
                    ? "1.5px solid rgba(251,191,36,0.35)"
                    : "1.5px solid rgba(99,102,241,0.35)",
                }}
              >
                {theme === "dark"
                  ? <Sun  className="w-[18px] h-[18px]" style={{ color: "#fbbf24" }} />
                  : <Moon className="w-[18px] h-[18px]" style={{ color: "#6366f1" }} />}
              </button>

              {/* User profile (mobile + desktop) */}
              <PersonalAreaDropdown />

              {/* Desktop action buttons */}
              <button
                onClick={() => setGmailScanOpen(true)}
                className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-border bg-card text-muted-foreground text-[12px] hover:bg-elevated hover:text-foreground transition-colors whitespace-nowrap shrink-0"
                title="סרוק מייל"
              >
                <MailOpen className="w-4 h-4 shrink-0" />
                <span>סרוק מייל</span>
              </button>
              <button
                onClick={() => setUploadOpen(true)}
                className="hidden md:flex btn-primary h-9 px-4 py-0 text-[12px]"
              >
                <Upload className="w-4 h-4" />
                <span>העלה חשבונית</span>
              </button>

              {/* Desktop theme + bell + logo */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="hidden md:flex w-9 h-9 rounded-xl border border-white/15 bg-white/5 items-center justify-center hover:bg-white/10 transition-all duration-200"
              >
                {theme === "dark"
                  ? <Sun className="w-4.5 h-4.5 text-warning" />
                  : <Moon className="w-4.5 h-4.5 text-primary" />}
              </button>
              <button className="hidden md:flex relative w-9 h-9 rounded-xl border border-white/15 bg-white/5 items-center justify-center hover:bg-white/10 transition-colors">
                <Bell className="w-4.5 h-4.5 text-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 pr-3 border-r border-border mr-1">
                <span dir="ltr" className="text-[17px] font-black text-primary">BillBOT<span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">+</span></span>
              </div>
            </div>
          </header>

          {/* ── Mobile search bar — full width below header ── */}
          <div className="md:hidden px-4 py-2.5 border-b border-border bg-card shrink-0">
            <div className="search-shimmer">
            <div className="relative">
              {/* Search icon — right */}
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />

              <input
                type="text"
                placeholder="חיפוש ספק, מספר חשבונית..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                dir="rtl"
                className="mobile-search-input w-full h-11 rounded-[10px] pr-10 pl-[84px] text-[14px] outline-none transition-all bg-elevated border border-border text-foreground placeholder:text-muted-foreground"
              />

              {/* Action buttons — left side of search bar */}
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {/* Upload invoice */}
                <button
                  onClick={() => setUploadOpen(true)}
                  title="העלה חשבונית"
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: theme === "dark" ? "rgba(75,126,245,0.18)" : "rgba(75,126,245,0.12)",
                    border: "1.5px solid rgba(75,126,245,0.35)",
                  }}
                >
                  <Plus className="w-[15px] h-[15px]" style={{ color: "#4B7EF5" }} />
                </button>

                {/* Scan email */}
                <button
                  onClick={() => setGmailScanOpen(true)}
                  title="סרוק מייל"
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: theme === "dark" ? "rgba(45,212,191,0.18)" : "rgba(45,212,191,0.12)",
                    border: "1.5px solid rgba(45,212,191,0.35)",
                  }}
                >
                  <ScanLine className="w-[15px] h-[15px]" style={{ color: "#2dd4bf" }} />
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 z-10 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav — 2 items | FAB | 2 items */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex items-end justify-around px-1" style={{ height: "60px" }}>
        {(() => {
          const MOBILE_NAV_ITEMS = [
            PRIMARY_NAV[0]!, // דשבורד /
            PRIMARY_NAV[1]!, // הוצאות /expenses
            PRIMARY_NAV[2]!, // ספקים /suppliers
            PRIMARY_NAV[5]!, // אוטומציות /settings?tab=automations
          ];
          const left  = MOBILE_NAV_ITEMS.slice(0, 2);
          const right = MOBILE_NAV_ITEMS.slice(2);
          return (
            <>
              {left.map((item) => {
                const active = isNavActive(item.href, location);
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex flex-col items-center gap-0.5 px-3 pb-2 pt-1 rounded-[10px] transition-colors flex-1 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* Centre FAB — elevated above the bar */}
              <div className="flex flex-col items-center justify-end pb-2 flex-1" style={{ marginBottom: "14px" }}>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, #2dd4bf 100%)",
                    boxShadow: "0 6px 20px hsl(var(--primary) / 0.45), 0 2px 8px rgba(0,0,0,0.25)",
                  }}
                  aria-label="תפריט"
                >
                  <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                </button>
              </div>

              {right.map((item) => {
                const active = isNavActive(item.href, location);
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex flex-col items-center gap-0.5 px-3 pb-2 pt-1 rounded-[10px] transition-colors flex-1 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </>
          );
        })()}
      </nav>

      {/* Global Upload Modal */}
      <UploadInvoiceModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />

      {/* Gmail Scan Dialog */}
      <GmailScanDialog
        isOpen={gmailScanOpen}
        onClose={() => setGmailScanOpen(false)}
        onViewInvoices={() => {
          setGmailScanOpen(false);
          sessionStorage.setItem("bb_expense_source_filter", "gmail");
          navigate("/expenses");
        }}
      />

      {/* Send to Accountant Modal */}
      <SendToAccountantModal
        isOpen={accountantOpen}
        onClose={() => setAccountantOpen(false)}
        invoiceCount={0}
      />
    </div>
  );
}
