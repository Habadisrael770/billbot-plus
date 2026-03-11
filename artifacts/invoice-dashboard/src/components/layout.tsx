import React from "react";
import { Link } from "wouter";
import { FileText, LayoutDashboard, Settings, User } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-card/30 backdrop-blur-xl flex flex-col hidden md:flex z-10">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Logo"
            className="w-8 h-8 mr-3"
          />
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Invoice AI
          </h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <Link href="/" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl bg-primary/10 text-primary border border-primary/20 transition-colors">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <button disabled className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-colors cursor-not-allowed opacity-50">
            <FileText className="w-5 h-5 mr-3" />
            All Invoices
          </button>
          <button disabled className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-colors cursor-not-allowed opacity-50">
            <User className="w-5 h-5 mr-3" />
            Vendors
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button disabled className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-colors cursor-not-allowed opacity-50">
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-background/50 backdrop-blur-md z-10">
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-primary/20">
              JD
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 z-10">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
