import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, Eye, EyeOff, X } from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");

interface LoginPageProps {
  onLogin: (email: string) => void;
  onSkip: () => void;
}

export default function LoginPage({ onLogin, onSkip }: LoginPageProps) {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passError, setPassError]   = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Handle return from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail  = params.get("gmail");
    const mail   = params.get("email") ?? "";
    if (gmail === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
      onLogin(mail);
    } else if (gmail === "error") {
      const msg = params.get("msg") ?? "שגיאה בהתחברות לגוגל";
      setError(msg);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        onLogin("demo@billbot.co.il");
      }
    } catch {
      setError("לא ניתן להתחבר לשרת. נסה שוב.");
      setLoadingGoogle(false);
    }
  };

  const validate = () => {
    let ok = true;
    setEmailError(null);
    setPassError(null);
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("נא להזין כתובת אימייל תקינה");
      ok = false;
    }
    if (!password || password.length < 6) {
      setPassError("הסיסמה חייבת להכיל לפחות 6 תווים");
      ok = false;
    }
    return ok;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoadingEmail(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json() as { email?: string };
        onLogin(data.email ?? email);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "אימייל או סיסמה שגויים");
      }
    } catch {
      // Dev fallback
      onLogin(email);
    } finally {
      setLoadingEmail(false);
    }
  };

  const loading = loadingGoogle || loadingEmail;

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: "#11172e" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[440px]"
      >
        {/* Card */}
        <div
          className="rounded-2xl p-8 space-y-6"
          style={{
            background: "#1f263f",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <span dir="ltr" className="text-[36px] font-black tracking-tight select-none">
              <span style={{ color: "#f8fafc" }}>BillBOT</span>
              <span
                style={{
                  background: "linear-gradient(135deg, #34d399 0%, #22d3ee 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                +
              </span>
            </span>
          </div>

          {/* Headings */}
          <div className="text-center space-y-1.5">
            <h1 className="text-[26px] font-black" style={{ color: "#f8fafc" }}>
              התחברות למערכת
            </h1>
            <p className="text-[14px]" style={{ color: "#8899bb" }}>
              התחבר לחשבון שלך
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
            {/* Email field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-[13px] font-medium"
                style={{ color: "#c4cfe8" }}
              >
                כתובת אימייל
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  placeholder="example@email.com"
                  autoComplete="email"
                  dir="ltr"
                  className="w-full h-12 rounded-[10px] px-4 pr-4 pl-11 text-[15px] outline-none transition-all placeholder:text-[#4a5a7a]"
                  style={{
                    background: "#253056",
                    border: emailError
                      ? "1.5px solid #f87171"
                      : "1.5px solid rgba(255,255,255,0.1)",
                    color: "#f8fafc",
                  }}
                  onFocus={(e) => {
                    if (!emailError) e.currentTarget.style.border = "1.5px solid #5a75dc";
                  }}
                  onBlur={(e) => {
                    if (!emailError) e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)";
                  }}
                />
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 pointer-events-none"
                  style={{ color: "#4a5a7a", width: 18, height: 18 }}
                />
              </div>
              <AnimatePresence>
                {emailError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px]"
                    style={{ color: "#f87171" }}
                  >
                    {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-medium"
                  style={{ color: "#c4cfe8" }}
                >
                  סיסמה
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[12px] font-medium transition-opacity hover:opacity-70"
                  style={{ color: "#5a75dc" }}
                  tabIndex={-1}
                >
                  שכחת סיסמה?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPassError(null); }}
                  placeholder="הכנס סיסמה"
                  autoComplete="current-password"
                  className="w-full h-12 rounded-[10px] px-4 pr-4 pl-20 text-[15px] outline-none transition-all placeholder:text-[#4a5a7a]"
                  style={{
                    background: "#253056",
                    border: passError
                      ? "1.5px solid #f87171"
                      : "1.5px solid rgba(255,255,255,0.1)",
                    color: "#f8fafc",
                  }}
                  onFocus={(e) => {
                    if (!passError) e.currentTarget.style.border = "1.5px solid #5a75dc";
                  }}
                  onBlur={(e) => {
                    if (!passError) e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)";
                  }}
                />
                {/* Lock icon */}
                <Lock
                  className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "#4a5a7a", width: 17, height: 17 }}
                />
                {/* Eye toggle */}
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "#4a5a7a" }}
                  tabIndex={-1}
                >
                  {showPass
                    ? <EyeOff style={{ width: 17, height: 17 }} />
                    : <Eye   style={{ width: 17, height: 17 }} />}
                </button>
              </div>
              <AnimatePresence>
                {passError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px]"
                    style={{ color: "#f87171" }}
                  >
                    {passError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-[10px] font-bold text-[15px] text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loadingEmail
                  ? "#4a65c8"
                  : "linear-gradient(135deg, #5a75dc 0%, #4a65cc 100%)",
                boxShadow: "0 4px 16px rgba(90,117,220,0.35)",
              }}
            >
              {loadingEmail ? (
                <><Loader2 className="w-4 h-4 animate-spin" />מתחבר...</>
              ) : (
                "התחברות"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="text-[12px]" style={{ color: "#4a5a7a" }}>או</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-12 rounded-[10px] flex items-center justify-center gap-3 font-semibold text-[14px] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "#ffffff",
              color: "#1a1f36",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#f0f4ff")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#ffffff")}
          >
            {loadingGoogle ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#5a75dc" }} />
            ) : (
              <GoogleIcon />
            )}
            {loadingGoogle ? "מתחבר לגוגל..." : "התחבר עם Google"}
          </button>

          {/* Global error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-[12px]"
                style={{ color: "#f87171" }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Register link */}
          <p className="text-center text-[13px]" style={{ color: "#8899bb" }}>
            אין לך חשבון?{" "}
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="font-semibold transition-opacity hover:opacity-70"
              style={{ color: "#5a75dc" }}
            >
              הירשם כאן
            </button>
          </p>
        </div>
      </motion.div>
    </div>
    {/* ── Forgot Password Modal ── */}
    <AnimatePresence>
      {showForgot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowForgot(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] rounded-2xl p-6 space-y-4"
            style={{ background: "#1f263f", border: "1px solid rgba(255,255,255,0.12)" }}
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold" style={{ color: "#f8fafc" }}>איפוס סיסמה</h2>
              <button onClick={() => setShowForgot(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X style={{ width: 18, height: 18, color: "#8899bb" }} />
              </button>
            </div>
            <div className="text-center py-3 space-y-3">
              <div className="text-4xl">🔐</div>
              <p className="font-semibold text-[15px]" style={{ color: "#f8fafc" }}>שחזור סיסמה — בקרוב</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#8899bb" }}>
                האפשרות לאיפוס סיסמה בדוא"ל תהיה זמינה בגרסה הבאה.
                בינתיים, ניתן להתחבר עם Google.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="w-full h-11 rounded-[10px] font-bold text-[14px] text-white transition-all"
              style={{ background: "linear-gradient(135deg, #5a75dc 0%, #4a65cc 100%)" }}
            >
              סגור
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Register Info Modal ── */}
    <AnimatePresence>
      {showRegister && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowRegister(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] rounded-2xl p-6 space-y-4"
            style={{ background: "#1f263f", border: "1px solid rgba(255,255,255,0.12)" }}
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold" style={{ color: "#f8fafc" }}>הרשמה ל-BillBOT+</h2>
              <button onClick={() => setShowRegister(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X style={{ width: 18, height: 18, color: "#8899bb" }} />
              </button>
            </div>
            <div className="text-center py-2 space-y-3">
              <div className="text-4xl">🚀</div>
              <p className="font-semibold text-[16px]" style={{ color: "#f8fafc" }}>ההרשמה בקרוב!</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#8899bb" }}>
                מערכת ההרשמה העצמאית עומדת להיפתח. בינתיים, ניתן להתחבר דרך Google
                ולהתחיל את תקופת הניסיון החינמית.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowRegister(false); onSkip(); }}
              className="w-full h-11 rounded-[10px] font-bold text-[14px] text-white transition-all"
              style={{ background: "linear-gradient(135deg, #5a75dc 0%, #4a65cc 100%)" }}
            >
              המשך כאורח — ניסיון חינם
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
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
