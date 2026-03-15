import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, FileText, Brain, Zap, Shield } from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");

const FEATURES = [
  { icon: FileText, text: "חילוץ חשבוניות אוטומטי מהמייל" },
  { icon: Brain,    text: "בינה מלאכותית מסווגת כל הוצאה" },
  { icon: Zap,      text: "חיבור לרו\"ח בלחיצה אחת" },
  { icon: Shield,   text: "אבטחה מלאה — רק קריאה מהמייל" },
];

interface LoginPageProps {
  onLogin: (email: string) => void;
  onSkip: () => void;
}

export default function LoginPage({ onLogin, onSkip }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Handle return from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail  = params.get("gmail");
    const email  = params.get("email") ?? "";
    if (gmail === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
      onLogin(email);
    } else if (gmail === "error") {
      const msg = params.get("msg") ?? "שגיאה בהתחברות לגוגל";
      setError(msg);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Credentials not configured — simulate login for dev
        onLogin("demo@billbot.co.il");
      }
    } catch {
      setError("לא ניתן להתחבר לשרת. נסה שוב.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-background" dir="rtl">

      {/* ── Left: Branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] xl:w-[40%] p-10 relative overflow-hidden border-l border-border"
        style={{ background: "linear-gradient(160deg, hsl(var(--primary)/0.18) 0%, hsl(var(--teal)/0.10) 60%, hsl(var(--background)) 100%)" }}
      >
        {/* Glow blobs */}
        <div className="absolute top-0 left-0 w-[420px] h-[420px] rounded-full pointer-events-none opacity-30"
             style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.4) 0%, transparent 70%)", transform: "translate(-40%, -40%)" }} />
        <div className="absolute bottom-0 right-0 w-[320px] h-[320px] rounded-full pointer-events-none opacity-20"
             style={{ background: "radial-gradient(circle, hsl(var(--teal)/0.5) 0%, transparent 70%)", transform: "translate(40%, 40%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <span dir="ltr" className="text-[24px] font-black text-primary tracking-tight">BillBOT+</span>
          <p className="text-[13px] text-muted-foreground mt-1">ניהול חשבוניות חכם בעזרת AI</p>
        </div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative z-10 space-y-8"
        >
          <div className="space-y-3">
            <h2 className="text-[32px] font-black text-foreground leading-tight">
              ניהול חשבוניות<br />
              <span className="text-primary">מהיר ואוטומטי</span>
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[280px]">
              BillBOT+ סורק, מסווג ומנתח את כל חשבוניות העסק שלך — ללא מאמץ
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-[8px] shrink-0 flex items-center justify-center"
                    style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.25)", color: "hsl(var(--primary))" }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] text-foreground">{f.text}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer quote */}
        <div className="relative z-10 text-[11px] text-muted-foreground">
          מאות עסקים כבר חוסכים שעות בכל חודש
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <span dir="ltr" className="text-[22px] font-black text-primary">BillBOT+</span>
          <p className="text-[12px] text-muted-foreground mt-1">ניהול חשבוניות חכם בעזרת AI</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[380px] space-y-7"
        >
          {/* Heading */}
          <div className="space-y-1.5 text-center">
            <h1 className="text-[26px] font-black text-foreground">ברוכים הבאים</h1>
            <p className="text-[14px] text-muted-foreground">
              התחבר כדי להתחיל לנהל חשבוניות בצורה חכמה
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-[12px] border-2 border-border bg-card hover:bg-elevated hover:border-primary/30 transition-all font-semibold text-[15px] text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? "מתחבר..." : "המשך עם Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground">או</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email placeholder (future) */}
          <button
            onClick={onSkip}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-[12px] border border-border bg-transparent hover:bg-elevated transition-all text-[14px] text-muted-foreground hover:text-foreground"
          >
            המשך ללא חשבון
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[12px] text-destructive"
            >
              {error}
            </motion.p>
          )}

          {/* Terms */}
          <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
            בהתחברות אתה מסכים ל
            <button className="underline underline-offset-2 hover:text-foreground transition-colors mx-1">תנאי השימוש</button>
            ול
            <button className="underline underline-offset-2 hover:text-foreground transition-colors mr-1">מדיניות הפרטיות</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ── Google SVG Icon ────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
