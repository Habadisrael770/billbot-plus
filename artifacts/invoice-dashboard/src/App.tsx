import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { SearchProvider } from "@/context/search-context";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ExpensesPage from "@/pages/expenses";
import Profile from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import LoginPage from "@/pages/login";
import SuppliersPage from "@/pages/suppliers";
import HelpPage from "@/pages/help";
import IntegrationsPage from "@/pages/integrations";
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
      // Persist the connected Gmail token in localStorage so the app knows it's linked
      if (email) {
        try {
          localStorage.setItem("bb_gmail_token", JSON.stringify({ email, connectedAt: Date.now() }));
        } catch {}
      }
      toast({
        title: "!Gmail חובר בהצלחה",
        description: email ? `מחובר כ: ${email}` : "החשבון חובר. עכשיו ניתן לסרוק חשבוניות.",
      });
      window.history.replaceState({}, "", window.location.pathname);
      navigate("/");
    } else if (gmailParam === "error") {
      const msg = params.get("msg") ?? "שגיאה בחיבור Gmail";
      toast({ title: "שגיאת Gmail", description: msg, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return null;
}

function AppRouter() {
  const isReset = new URLSearchParams(window.location.search).get("reset") === "1";
  if (isReset) {
    localStorage.removeItem("bb_wizard_done");
    localStorage.removeItem("bb_onboarding_progress");
    localStorage.removeItem("bb_user");
    window.history.replaceState({}, "", window.location.pathname);
  }

  const [loggedIn,  setLoggedIn]  = useState(() => !!localStorage.getItem("bb_user"));
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("bb_wizard_done") === "1");

  const handleLogin = (email: string) => {
    localStorage.setItem("bb_user", JSON.stringify({ email: email || "user" }));
    setLoggedIn(true);
  };

  // Handle Google OAuth completion.
  //
  // Architecture in Replit:
  //   Main Replit browser tab
  //   └── Replit iframe (cross-origin shell)
  //       └── Our app iframe (our origin — where this code runs)
  //
  // When user clicks "Login with Google":
  //   popup = window.open(googleUrl)   ← opener = our app iframe
  //   Google → callback → popup navigates to /?gmail=connected  (our origin)
  //   The popup loads our App.tsx again, detects gmail=connected,
  //   calls handleLogin() then sends postMessage to opener and closes.
  //   Our app iframe receives the postMessage and calls handleLogin() too.
  //
  useEffect(() => {
    // ── Case 1: we ARE the popup (window.opener exists and gmail=connected in URL)
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    const email = params.get("email") ?? "";

    if (gmail === "connected" && window.opener) {
      // Running inside the popup — notify the opener (our app iframe) via postMessage
      window.history.replaceState({}, "", window.location.pathname);
      try {
        window.opener.postMessage({ type: "GMAIL_CONNECTED", email }, "*");
      } catch {}
      // Close this popup after a short delay
      setTimeout(() => window.close(), 800);
      return;
    }

    // ── Case 2: redirect-based (popup was blocked, _top navigated here)
    if (gmail === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
      handleLogin(email);
      return;
    }

    if (loggedIn) return;

    // ── Case 3: Listen for postMessage from popup (popup → opener = this window)
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "GMAIL_CONNECTED") {
        handleLogin(e.data.email ?? "");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onSkip={() => {
          localStorage.setItem("bb_user", JSON.stringify({ email: "guest" }));
          setLoggedIn(true);
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
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/help" component={HelpPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>

      {/* Onboarding modal — renders on top of dashboard */}
      {!onboarded && (
        <Onboarding
          onComplete={() => {
            localStorage.setItem("bb_wizard_done", "1");
            setOnboarded(true);
          }}
        />
      )}
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
          <SearchProvider>
          <ThemedShell>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRouter />
            </WouterRouter>
          </ThemedShell>
          </SearchProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
