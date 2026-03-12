import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ExpensesPage from "@/pages/expenses";
import Profile from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import { AIChat } from "@/components/ai-chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function GmailRedirectHandler() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");
    const email = params.get("email");
    if (gmailParam === "connected") {
      toast({
        title: "Gmail חובר בהצלחה!",
        description: email ? `מחובר כ: ${email}` : "החשבון חובר. עכשיו ניתן לסרוק חשבוניות.",
      });
      window.history.replaceState({}, "", window.location.pathname);
      navigate("/settings");
    } else if (gmailParam === "error") {
      const msg = params.get("msg") ?? "שגיאה בחיבור Gmail";
      toast({ title: "שגיאת Gmail", description: msg, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return null;
}

function AppRouter() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem("bb_wizard_done") === "1"
  );

  if (!onboarded) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.setItem("bb_wizard_done", "1");
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <>
      <GmailRedirectHandler />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/expenses" component={ExpensesPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function ThemedShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className={`${theme} min-h-screen bg-background text-foreground selection:bg-primary/30`}>
      {children}
      <AIChat />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <ThemedShell>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRouter />
            </WouterRouter>
          </ThemedShell>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
