import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
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

function AppRouter() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem("vatrix_onboarded") === "1"
  );

  if (!onboarded) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.setItem("vatrix_onboarded", "1");
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
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
