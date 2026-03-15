import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Building2,
  SendHorizonal,
  Zap,
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
  CalendarDays,
  Crown,
  Menu,
  Mail,
  Phone,
} from "lucide-react";
import { UploadInvoiceModal } from "@/components/upload-invoice-modal";
import { useTheme } from "@/context/theme-context";
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
  { href: "/",             icon: LayoutDashboard, label: "דשבורד",       color: "text-primary",       bg: "rgba(75,126,245,0.08)",  border: "rgba(75,126,245,0.25)" },
  { href: "/expenses",     icon: Receipt,         label: "הוצאות",       color: "text-teal",          bg: "rgba(45,212,191,0.08)",  border: "rgba(45,212,191,0.25)" },
  { href: "/suppliers",    icon: Building2,       label: "ספקים",        color: "text-amber-400",     bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)" },
  { href: "/export",       icon: SendHorizonal,   label: 'ייצוא לרו"ח', color: "text-violet-400",    bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.25)" },
  { href: "/integrations", icon: Zap,             label: "אינטגרציות",   color: "text-rose-400",      bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.25)" },
];

const SECONDARY_NAV = [
  { href: "/settings", icon: Settings,   label: "הגדרות", color: "text-muted-foreground", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
  { href: "/help",     icon: HelpCircle, label: "עזרה",   color: "text-muted-foreground", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

function CompactSidebar({ location, onClose }: { location: string; onClose?: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-center border-b border-border shrink-0">
        <span dir="ltr" className="text-sm font-black text-primary leading-none">BB+</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {PRIMARY_NAV.map((item) => {
          const active = location === item.href;
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
          const active = location === item.href;
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
}: {
  location: string;
  onClose: () => void;
  onUpload: () => void;
}) {
  const hubUserData = (() => {
    try {
      const raw = localStorage.getItem("bb_user");
      if (!raw) return { name: "משתמש", email: "", phone: "", company: "" };
      const p = JSON.parse(raw);
      return {
        name:    p.name    ?? p.email  ?? "משתמש",
        email:   p.email   ?? "",
        phone:   p.phone   ?? "",
        company: p.company ?? p.businessName ?? "",
      };
    } catch { return { name: "משתמש", email: "", phone: "", company: "" }; }
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
      style={{ background: "linear-gradient(180deg, #1a1d3a 0%, #0f1219 100%)" }}
      dir="rtl"
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-5 border-b border-white/8 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:bg-white/10 transition-colors"
        >
          <Bell className="w-4 h-4 text-white/50" />
        </button>

        <div className="flex items-center gap-2">
          <span dir="ltr" className="text-[18px] font-black text-white tracking-tight">BillBOT+</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${
            hubPlan === "business" ? "bg-violet-500"
            : hubPlan === "starter" ? "bg-teal"
            : "bg-primary"
          }`}>{planLabel[hubPlan] ?? "חינם"}</span>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:bg-white/10 transition-colors"
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
          style={{ border: "1.5px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-4 mb-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-primary/40 to-teal/20 border border-primary/25 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#1a1d3a]" />
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

        {/* ── Primary CTAs: Upload + Calendar — equal width ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.22 }}
          className="flex gap-3"
        >
          <button
            onClick={() => { onClose(); onUpload(); }}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl text-[15px] font-bold text-white active:scale-[0.97] transition-transform"
            style={{ background: "linear-gradient(135deg, #4B7EF5, hsl(var(--teal)))" }}
          >
            <Upload className="w-5 h-5 shrink-0" />
            העלה חשבונית
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl text-[15px] font-bold text-white active:scale-[0.97] transition-transform"
            style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.22)" }}
          >
            <CalendarDays className="w-5 h-5 shrink-0" />
            יומן
          </button>
        </motion.div>

        {/* Primary nav — white border cards, uniform icon color */}
        {PRIMARY_NAV.map((item, i) => {
          const active = location === item.href;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.14 + i * 0.05, duration: 0.24, ease: "easeOut" }}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-4 px-5 h-[58px] rounded-2xl transition-all active:scale-[0.97] w-full"
                style={{
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  border: `1px solid ${active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)"}`,
                }}
              >
                <item.icon className="w-5 h-5 shrink-0 text-white" />
                <span className="flex-1 text-[16px] font-medium text-white">{item.label}</span>
                {active && <div className="w-2 h-2 rounded-full bg-white/60 shrink-0" />}
              </Link>
            </motion.div>
          );
        })}

        {/* Divider */}
        <div className="h-px bg-white/10 mx-1" />

        {/* Secondary nav */}
        {SECONDARY_NAV.map((item, i) => {
          const active = location === item.href;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.39 + i * 0.05, duration: 0.22, ease: "easeOut" }}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-4 px-5 h-[54px] rounded-2xl transition-all active:scale-[0.97] w-full"
                style={{
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  border: `1px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                }}
              >
                <item.icon className="w-5 h-5 shrink-0 text-white" />
                <span className="flex-1 text-[15px] font-medium text-white">{item.label}</span>
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
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)" }}
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
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-4 px-5 h-[54px] rounded-2xl active:scale-[0.97] transition-all"
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)" }}
        >
          <LogOut className="w-5 h-5 shrink-0 text-white" />
          <span className="text-[15px] font-medium text-white">יציאה מהחשבון</span>
        </motion.button>

      </div>
    </div>
  );
}

function PersonalAreaDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-elevated transition-colors focus:outline-none group">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-white text-sm font-bold">
              JA
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:flex flex-col items-start text-right">
            <span className="text-[13px] font-semibold text-foreground leading-none">Jean Azoulay</span>
            <span className="text-[11px] text-muted-foreground leading-none mt-0.5">b1.asakim770@gmail.com</span>
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-64 bg-card border border-border rounded-[14px] p-2" style={{ boxShadow: "var(--shadow-dropdown)" }}>
        <div className="px-3 py-3 mb-1 rounded-[10px] bg-elevated">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-white font-bold">JA</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Jean Azoulay</p>
              <p className="text-[11px] text-muted-foreground">b1.asakim770@gmail.com</p>
              <span className="badge badge-primary mt-1 inline-block">Admin</span>
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
        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] cursor-pointer text-[13px] text-destructive hover:bg-destructive/10 transition-colors">
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
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const currentLabel = ALL_NAV.find((n) => n.href === location)?.label ?? "דשבורד";

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
          <CompactSidebar location={location} />
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
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
          {/* Header */}
          <header className="h-20 md:h-14 flex items-center gap-3 px-4 sm:px-6 border-b border-border bg-card z-10 shrink-0" style={{ boxShadow: "var(--shadow-sm)" }}>
            {/* Mobile hamburger + theme toggle */}
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Mobile-only theme toggle — prominent day/night switch */}
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
              <PersonalAreaDropdown />
            </div>

            {/* Center: BillBOT+ logo (mobile) / page title (desktop) */}
            <div className="flex-1 flex justify-center items-center">
              <Link href="/">
                <span dir="ltr" className="md:hidden text-[46px] font-black tracking-tight leading-none select-none cursor-pointer active:opacity-70 transition-opacity">
                  <span className="text-foreground">Bill</span><span className="text-foreground">BOT</span><span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">+</span>
                </span>
              </Link>
              <span className="hidden md:inline text-[14px] font-semibold text-foreground tracking-wide">{currentLabel}</span>
            </div>

            {/* Action buttons — desktop only for Upload; mobile has sub-bar below */}
            <div className="flex items-center gap-2">
              <button
                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-border bg-card text-muted-foreground text-[12px] hover:bg-elevated hover:text-foreground transition-colors whitespace-nowrap shrink-0"
                title="יומן"
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">יומן</span>
              </button>
              <button
                onClick={() => setUploadOpen(true)}
                className="hidden sm:flex btn-primary h-9 px-4 py-0 text-[12px]"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">העלה חשבונית</span>
              </button>
            </div>

            {/* Theme + Bell + Logo */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all duration-200"
              >
                {theme === "dark"
                  ? <Sun className="w-4.5 h-4.5 text-warning" />
                  : <Moon className="w-4.5 h-4.5 text-primary" />}
              </button>
              <button className="relative w-9 h-9 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Bell className="w-4.5 h-4.5 text-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 pr-3 border-r border-border mr-1">
                <span dir="ltr" className="text-[17px] font-black text-primary">BillBOT<span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">+</span></span>
              </div>
            </div>
          </header>

          {/* ── Mobile action bar — Upload + Calendar side by side ── */}
          <div className="md:hidden flex gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
            <button
              onClick={() => setUploadOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[10px] text-[13px] font-bold text-white transition-all active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--teal)) 100%)" }}
            >
              <Upload className="w-4 h-4 shrink-0" />
              העלה חשבונית
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[10px] text-[13px] font-semibold text-foreground transition-all active:scale-[0.97] border border-border hover:bg-elevated"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              יומן
            </button>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 z-10 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex items-center justify-around px-2 py-1">
        {PRIMARY_NAV.map((item) => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-[10px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-[10px] transition-colors ${
            location === "/settings" ? "text-white" : "text-white"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-white" />
          </div>
        </Link>
      </nav>

      {/* Global Upload Modal */}
      <UploadInvoiceModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
}
