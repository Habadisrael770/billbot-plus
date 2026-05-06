import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, Eye, EyeOff, X, User } from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");

interface LoginPageProps {
  onLogin: (email: string) => void;
  onSkip: () => void;
}

type Mode = "login" | "register" | "forgot";

export default function LoginPage({ onLogin, onSkip }: LoginPageProps) {
  const [mode, setMode]               = useState<Mode>("login");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [name, setName]               = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [emailError, setEmailError]   = useState<string | null>(null);
  const [passError, setPassError]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

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

  const resetErrors = () => {
    setError(null);
    setEmailError(null);
    setPassError(null);
    setSuccessMsg(null);
  };

  const switchMode = (m: Mode) => {
    resetErrors();
    setPassword("");
    setMode(m);
  };

  // ── Google OAuth ────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoadingGoogle(true);
    resetErrors();
    try {
      const res  = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("לא ניתן לקבל קישור לגוגל. נסה שוב.");
        setLoadingGoogle(false);
      }
    } catch {
      setError("לא ניתן להתחבר לשרת. נסה שוב.");
      setLoadingGoogle(false);
    }
  };

  // ── Validate ─────────────────────────────────────────────────────────────
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

  // ── Email Login ──────────────────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoadingEmail(true);
    resetErrors();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      const data = await res.json() as { email?: string; error?: string };
      if (res.ok) {
        onLogin(data.email ?? email);
      } else {
        setError(data.error ?? "אימייל או סיסמה שגויים");
      }
    } catch {
      setError("לא ניתן להתחבר לשרת. נסה שוב.");
    } finally {
      setLoadingEmail(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoadingEmail(true);
    resetErrors();
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password, name: name.trim() || undefined }),
      });
      const data = await res.json() as { email?: string; error?: string };
      if (res.ok) {
        onLogin(data.email ?? email);
      } else {
        setError(data.error ?? "שגיאה בהרשמה");
      }
    } catch {
      setError("לא ניתן להתחבר לשרת. נסה שוב.");
    } finally {
      setLoadingEmail(false);
    }
  };

  const loading = loadingGoogle || loadingEmail;

  const inputStyle = (hasError: boolean) => ({
    background: "#253056",
    border: hasError ? "1.5px solid #f87171" : "1.5px solid rgba(255,255,255,0.1)",
    color: "#f8fafc",
  });

  const onFocus = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    if (!hasError) e.currentTarget.style.border = "1.5px solid #5a75dc";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    if (!hasError) e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl" style={{ background: "#11172e" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[440px]"
      >
        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: "#1f263f",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center">
            <span dir="ltr" className="text-[36px] font-black tracking-tight select-none">
              <span style={{ color: "#f8fafc" }}>BillBOT</span>
              <span style={{ background: "linear-gradient(135deg, #34d399 0%, #22d3ee 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>+</span>
            </span>
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h1 className="text-[24px] font-black" style={{ color: "#f8fafc" }}>
              {mode === "login"    ? "התחברות למערכת"
               : mode === "register" ? "הרשמה למערכת"
               : "שחזור סיסמה"}
            </h1>
            <p className="text-[13px]" style={{ color: "#8899bb" }}>
              {mode === "login"    ? "התחבר לחשבון שלך"
               : mode === "register" ? "צור חשבון חדש ב-BillBOT+"
               : "נשלח קישור לאיפוס סיסמה לאימייל שלך"}
            </p>
          </div>

          {/* Forgot password view */}
          <AnimatePresence mode="wait">
            {mode === "forgot" ? (
              <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "rgba(90,117,220,0.08)", border: "1px solid rgba(90,117,220,0.2)" }}>
                  <div className="text-2xl">📬</div>
                  <p className="text-sm" style={{ color: "#c4cfe8" }}>
                    שחזור סיסמה בדוא"ל יהיה זמין בגרסה הבאה.<br/>
                    בינתיים, ניתן להתחבר דרך Google.
                  </p>
                </div>
                <button
                  onClick={() => { resetErrors(); handleGoogle(); }}
                  disabled={loading}
                  className="w-full h-11 rounded-[10px] flex items-center justify-center gap-3 font-semibold text-[14px] transition-all"
                  style={{ background: "#ffffff", color: "#1a1f36" }}
                >
                  <GoogleIcon />
                  התחבר עם Google
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full text-center text-[13px] font-medium transition-opacity hover:opacity-70"
                  style={{ color: "#5a75dc" }}
                >
                  ← חזרה להתחברות
                </button>
              </motion.div>
            ) : (

            /* Login / Register form */
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={mode === "login" ? handleEmailLogin : handleRegister}
              className="space-y-4"
              noValidate
            >
              {/* Name field — register only */}
              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium" style={{ color: "#c4cfe8" }}>שם מלא (אופציונלי)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ישראל ישראלי"
                      className="w-full h-11 rounded-[10px] px-4 pl-10 text-[14px] outline-none transition-all placeholder:text-[#4a5a7a]"
                      style={inputStyle(false)}
                      onFocus={(e) => onFocus(e, false)}
                      onBlur={(e) => onBlur(e, false)}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#4a5a7a", width: 16, height: 16 }} />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium" style={{ color: "#c4cfe8" }}>כתובת אימייל</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                    placeholder="example@email.com"
                    autoComplete="email"
                    dir="ltr"
                    className="w-full h-11 rounded-[10px] px-4 pl-10 text-[14px] outline-none transition-all placeholder:text-[#4a5a7a]"
                    style={inputStyle(!!emailError)}
                    onFocus={(e) => onFocus(e, !!emailError)}
                    onBlur={(e) => onBlur(e, !!emailError)}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#4a5a7a", width: 16, height: 16 }} />
                </div>
                <AnimatePresence>
                  {emailError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px]" style={{ color: "#f87171" }}>{emailError}</motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-medium" style={{ color: "#c4cfe8" }}>סיסמה</label>
                  {mode === "login" && (
                    <button type="button" onClick={() => switchMode("forgot")} className="text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: "#5a75dc" }} tabIndex={-1}>
                      שכחת סיסמה?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPassError(null); }}
                    placeholder={mode === "register" ? "לפחות 6 תווים" : "הכנס סיסמה"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    className="w-full h-11 rounded-[10px] px-4 pl-20 text-[14px] outline-none transition-all placeholder:text-[#4a5a7a]"
                    style={inputStyle(!!passError)}
                    onFocus={(e) => onFocus(e, !!passError)}
                    onBlur={(e) => onBlur(e, !!passError)}
                  />
                  <Lock className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#4a5a7a", width: 16, height: 16 }} />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70" style={{ color: "#4a5a7a" }} tabIndex={-1}>
                    {showPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                <AnimatePresence>
                  {passError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px]" style={{ color: "#f87171" }}>{passError}</motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-[10px] font-bold text-[15px] text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: loadingEmail ? "#4a65c8" : "linear-gradient(135deg, #5a75dc 0%, #4a65cc 100%)", boxShadow: "0 4px 16px rgba(90,117,220,0.35)" }}
              >
                {loadingEmail ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === "register" ? "נרשם..." : "מתחבר..."}</> : (mode === "register" ? "הרשמה" : "התחברות")}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
                <span className="text-[12px]" style={{ color: "#4a5a7a" }}>או</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full h-11 rounded-[10px] flex items-center justify-center gap-3 font-semibold text-[14px] transition-all disabled:opacity-60"
                style={{ background: "#ffffff", color: "#1a1f36", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#f0f4ff")}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#ffffff")}
              >
                {loadingGoogle ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#5a75dc" }} /> : <GoogleIcon />}
                {loadingGoogle ? "מתחבר לגוגל..." : (mode === "register" ? "הרשמה עם Google" : "התחבר עם Google")}
              </button>

              {/* Global error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 rounded-xl p-3"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                  >
                    <span className="text-[12px] leading-relaxed" style={{ color: "#f87171" }}>{error}</span>
                    <button type="button" onClick={() => setError(null)} className="mr-auto shrink-0 opacity-60 hover:opacity-100">
                      <X style={{ width: 14, height: 14, color: "#f87171" }} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success message */}
              <AnimatePresence>
                {successMsg && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center text-[12px]" style={{ color: "#34d399" }}>{successMsg}</motion.p>
                )}
              </AnimatePresence>

              {/* Mode switch */}
              <p className="text-center text-[13px]" style={{ color: "#8899bb" }}>
                {mode === "login" ? (
                  <>אין לך חשבון?{" "}<button type="button" onClick={() => switchMode("register")} className="font-semibold transition-opacity hover:opacity-70" style={{ color: "#5a75dc" }}>הירשם כאן</button></>
                ) : (
                  <>יש לך כבר חשבון?{" "}<button type="button" onClick={() => switchMode("login")} className="font-semibold transition-opacity hover:opacity-70" style={{ color: "#5a75dc" }}>התחבר</button></>
                )}
              </p>

              {/* Guest skip */}
              <p className="text-center">
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-[12px] transition-opacity hover:opacity-70"
                  style={{ color: "#4a5a7a" }}
                >
                  המשך כאורח ←
                </button>
              </p>
            </motion.form>
          )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ── Google SVG Icon ────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
