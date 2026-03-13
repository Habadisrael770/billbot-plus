import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Receipt,
  Building2,
  SendHorizonal,
  Zap,
  Settings,
  HelpCircle,
  User,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Gift,
  Upload,
  CalendarDays,
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
import { Badge } from "@/components/ui/badge";

const PRIMARY_NAV = [
  { href: "/",            icon: LayoutDashboard, label: "דשבורד" },
  { href: "/expenses",    icon: Receipt,         label: "הוצאות" },
  { href: "/suppliers",   icon: Building2,       label: "ספקים" },
  { href: "/export",      icon: SendHorizonal,   label: 'ייצוא לרו"ח' },
  { href: "/integrations",icon: Zap,             label: "אינטגרציות" },
];

const SECONDARY_NAV = [
  { href: "/settings", icon: Settings,   label: "הגדרות" },
  { href: "/help",     icon: HelpCircle, label: "עזרה" },
  { href: "/profile",  icon: User,       label: "פרופיל" },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onClick,
  compact,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-[10px] transition-all duration-200 ${
          active ? "nav-item-active" : "nav-item"
        }`}
      >
        <Icon className={`w-5 h-5 shrink-0`} />
        <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={active ? "nav-item-active" : "nav-item"}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function CompactSidebar({ location, onClose }: { location: string; onClose?: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-center border-b border-border shrink-0">
        <span dir="ltr" className="text-sm font-black text-primary leading-none">BB+</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {PRIMARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={location === item.href}
            onClick={onClose}
            compact
          />
        ))}
      </nav>
      <div className="py-4 px-2 space-y-1 border-t border-border">
        {SECONDARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={location === item.href}
            onClick={onClose}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function MobileSidebar({ location, onClose }: { location: string; onClose: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-between px-5 border-b border-border shrink-0">
        <span dir="ltr" className="text-xl font-black text-primary">BillBOT+</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {PRIMARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={location === item.href}
            onClick={onClose}
          />
        ))}
      </nav>
      <div className="py-4 px-3 space-y-1 border-t border-border">
        {SECONDARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={location === item.href}
            onClick={onClose}
          />
        ))}
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

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-row-reverse">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <div
              className="relative w-72 bg-card border-l border-border flex flex-col"
              style={{ boxShadow: "var(--shadow-dropdown)" }}
            >
              <MobileSidebar location={location} onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
          {/* Header */}
          <header className="h-14 flex items-center gap-3 px-4 sm:px-6 border-b border-border bg-card z-10 shrink-0" style={{ boxShadow: "var(--shadow-sm)" }}>
            {/* Mobile hamburger */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <PersonalAreaDropdown />
            </div>

            {/* Center: current page title */}
            <div className="flex-1 flex justify-center">
              <span className="text-[14px] font-semibold text-foreground tracking-wide">{currentLabel}</span>
            </div>

            {/* Action buttons */}
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
                className="btn-primary h-9 px-4 py-0 text-[12px]"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">העלה חשבונית</span>
              </button>
            </div>

            {/* Theme + Bell + Logo */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-2 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-elevated transition-all duration-200"
              >
                {theme === "dark"
                  ? <Sun className="w-5 h-5 text-warning" />
                  : <Moon className="w-5 h-5 text-primary" />}
              </button>
              <button className="relative p-2 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning rounded-full" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 pr-3 border-r border-border mr-1">
                <span dir="ltr" className="text-[17px] font-black text-primary">BillBOT+</span>
              </div>
            </div>
          </header>

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
      </nav>

      {/* Global Upload Modal */}
      <UploadInvoiceModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
}
