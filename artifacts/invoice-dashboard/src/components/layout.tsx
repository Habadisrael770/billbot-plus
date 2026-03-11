import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  FileText,
  LayoutDashboard,
  Settings,
  User,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  Shield,
  Building2,
} from "lucide-react";
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

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/profile", icon: User, label: "אזור אישי" },
  { href: "/vendors", icon: Building2, label: "Vendors", disabled: true },
  { href: "/settings", icon: Settings, label: "הגדרות", disabled: true },
];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200";
  const activeClass = "bg-primary/10 text-primary border border-primary/20";
  const inactiveClass =
    "text-muted-foreground hover:bg-white/5 hover:text-white";
  const disabledClass = "text-muted-foreground/40 cursor-not-allowed";

  if (disabled) {
    return (
      <span className={`${base} ${disabledClass}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${base} ${active ? activeClass : inactiveClass}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function Sidebar({
  onClose,
  location,
}: {
  onClose?: () => void;
  location: string;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Logo"
            className="w-8 h-8 rounded-lg"
          />
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Invoice AI
          </h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={location === item.href}
            disabled={item.disabled}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Bottom user summary */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-xs font-bold text-white shrink-0">
            JD
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalAreaDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-tr from-primary to-accent text-white text-sm font-bold">
              JD
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:flex flex-col items-start text-left">
            <span className="text-sm font-medium text-white leading-none">John Doe</span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">Admin</span>
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 bg-card border border-white/10 shadow-2xl rounded-2xl p-2"
      >
        {/* Profile Header */}
        <div className="px-3 py-3 mb-1 rounded-xl bg-white/5">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-tr from-primary to-accent text-white font-bold">
                JD
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-white">John Doe</p>
              <p className="text-xs text-muted-foreground">john@company.co.il</p>
              <Badge
                variant="outline"
                className="mt-1 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
              >
                Admin
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-white/5 my-1" />

        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1">
          חשבון
        </DropdownMenuLabel>

        <Link href="/profile">
          <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl focus:bg-white/5 cursor-pointer text-sm text-white/80 hover:text-white">
            <User className="w-4 h-4 text-primary" />
            אזור אישי
          </DropdownMenuItem>
        </Link>

        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl focus:bg-white/5 cursor-pointer text-sm text-white/80 hover:text-white">
          <Bell className="w-4 h-4 text-amber-400" />
          התראות
          <Badge
            variant="outline"
            className="ml-auto text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20"
          >
            3
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl focus:bg-white/5 cursor-pointer text-sm text-white/80 hover:text-white">
          <Settings className="w-4 h-4 text-muted-foreground" />
          הגדרות
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl focus:bg-white/5 cursor-pointer text-sm text-white/80 hover:text-white">
          <Shield className="w-4 h-4 text-emerald-400" />
          אבטחה
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/5 my-1" />

        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl focus:bg-rose-500/10 cursor-pointer text-sm text-rose-400 hover:text-rose-300 focus:text-rose-300">
          <LogOut className="w-4 h-4" />
          יציאה
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/5 bg-card/30 backdrop-blur-xl flex-col z-20">
        <Sidebar location={location} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-72 bg-card border-r border-white/10 shadow-2xl flex flex-col">
            <Sidebar
              location={location}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 bg-background/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page title */}
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {NAV_ITEMS.find((n) => n.href === location)?.label ?? "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
            </button>

            {/* Personal area dropdown */}
            <PersonalAreaDropdown />
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 z-10 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 pb-safe">
        {NAV_ITEMS.filter((i) => !i.disabled).map((item) => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-white"
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
