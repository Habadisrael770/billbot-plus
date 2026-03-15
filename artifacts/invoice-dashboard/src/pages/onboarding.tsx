import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Phone, Check, ChevronLeft,
  Mail, Rocket, Sparkles, Zap, Shield,
  Loader2, Star, CheckCircle2, AlertCircle,
} from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");
const STORAGE_KEY = "bb_onboarding_progress";

// ── Validation ──────────────────────────────────────────────────────────────
const IL_PHONE_RE = /^(\+972|0)(5[0-9]|[234679])[0-9]{7}$/;
function validatePhone(v: string) {
  const clean = v.replace(/[\s\-]/g, "");
  if (!clean) return null;
  return IL_PHONE_RE.test(clean) ? null : "מספר טלפון לא תקין";
}

// ── Plan definitions ────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    emoji: "🆓",
    name: "חינם",
    trial: "12 יום",
    price: null,
    priceSub: "ללא כרטיס אשראי",
    badge: null,
    features: ["גישה מלאה לכל התכונות", "ללא כרטיס אשראי", "ביטול בכל עת"],
    btnText: "התחל ניסיון חינם",
    highlighted: false,
  },
  {
    id: "starter",
    emoji: "🚀",
    name: "Starter",
    trial: null,
    price: "₪149",
    priceSub: "/ חודש",
    badge: "⭐ הכי פופולרי",
    features: ["גישה מלאה לכל התכונות", "תמיכה טכנית 24/7", "דוחות וניתוח נתונים"],
    btnText: "בחר עכשיו",
    highlighted: true,
  },
  {
    id: "business",
    emoji: "💼",
    name: "Business",
    trial: null,
    price: "₪349",
    priceSub: "/ חודש",
    badge: null,
    features: ["כל תכונות Starter", "ריבוי עסקים + API", "Customer success manager"],
    btnText: "צרו קשר",
    highlighted: false,
  },
] as const;
type PlanId = "free" | "starter" | "business";

// ── Slide animation ──────────────────────────────────────────────────────────
const SLIDE = {
  initial: (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as number[] } },
  exit:    (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40, transition: { duration: 0.22 } }),
};

// ── Step 1: Business Info ────────────────────────────────────────────────────
function StepBusinessInfo({
  bizName, setBizName, phone, setPhone, errors,
}: {
  bizName: string; setBizName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  errors: { bizName?: string; phone?: string };
}) {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <h2 className="text-[22px] font-black text-foreground">👋 ברוכים הבאים! בואו נתחיל</h2>
        <p className="text-sm text-muted-foreground">תן לנו מידע בסיסי על העסק שלך כדי שנוכל להתחיל</p>
      </div>

      {/* Business name */}
      <div className="space-y-1.5">
        <label className="input-label">
          <Building2 className="w-3.5 h-3.5 inline ml-1 opacity-60" />
          שם עסק / שם מלא *
        </label>
        <input
          type="text"
          value={bizName}
          onChange={(e) => setBizName(e.target.value)}
          placeholder='לדוגמא: דני כהן בע"מ'
          dir="rtl"
          autoFocus
          className={`input transition-colors ${errors.bizName ? "border-destructive focus:ring-destructive/30" : bizName.trim().length >= 2 ? "border-success focus:ring-success/30" : ""}`}
        />
        {errors.bizName ? (
          <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.bizName}</p>
        ) : bizName.trim().length >= 2 ? (
          <p className="text-[11px] text-success flex items-center gap-1"><Check className="w-3 h-3" />נראה טוב!</p>
        ) : null}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="input-label">
          <Phone className="w-3.5 h-3.5 inline ml-1 opacity-60" />
          מספר טלפון *
        </label>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 h-10 px-3 rounded-[10px] border border-border bg-elevated text-sm text-muted-foreground shrink-0">
            🇮🇱 +972
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+\-\s]/g, ""))}
            placeholder="050-1234-567"
            dir="ltr"
            className={`input flex-1 text-left transition-colors ${errors.phone ? "border-destructive focus:ring-destructive/30" : phone && !validatePhone(phone) ? "border-success focus:ring-success/30" : ""}`}
          />
        </div>
        {errors.phone ? (
          <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>
        ) : phone && !validatePhone(phone) ? (
          <p className="text-[11px] text-success flex items-center gap-1"><Check className="w-3 h-3" />מספר תקין</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">פורמט: 050-1234-567</p>
        )}
      </div>

      {/* Hint */}
      <div className="flex items-start gap-2.5 rounded-[10px] border border-primary/20 bg-primary/6 px-3.5 py-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          BillBOT+ ישתמש בשם העסק כדי לזהות ולסווג חשבוניות אוטומטית
        </p>
      </div>
    </div>
  );
}

// ── Step 2: Choose Plan ──────────────────────────────────────────────────────
function StepChoosePlan({ selected, setSelected }: { selected: PlanId | null; setSelected: (v: PlanId) => void }) {
  return (
    <div className="space-y-5" dir="rtl">
      <div className="space-y-1">
        <h2 className="text-[22px] font-black text-foreground">בחרו את המסלול המתאים ביותר</h2>
        <p className="text-sm text-muted-foreground">התחילו בחינם או בהצעה המיוחדת שלנו</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PLANS.map((plan) => {
          const isActive = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative flex flex-col p-4 rounded-[14px] text-right transition-all duration-200 border-2 ${
                plan.highlighted
                  ? isActive
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-primary/60 bg-primary/5 hover:bg-primary/8"
                  : isActive
                    ? "border-primary bg-primary/8"
                    : "border-border bg-card hover:bg-elevated hover:border-primary/30"
              } ${plan.highlighted ? "scale-[1.03] origin-top" : ""}`}
              style={isActive ? { boxShadow: "var(--shadow-card)" } : undefined}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 right-1/2 translate-x-1/2 badge-teal text-[10px] whitespace-nowrap px-2 py-0.5">
                  {plan.badge}
                </div>
              )}

              {/* Icon + Name */}
              <div className="mb-2">
                <span className="text-2xl">{plan.emoji}</span>
                <div className="mt-1">
                  <p className="font-bold text-[14px] text-foreground">{plan.name}</p>
                  {plan.trial && <p className="text-[11px] text-muted-foreground">{plan.trial}</p>}
                </div>
              </div>

              {/* Price */}
              <div className="mb-3">
                {plan.price ? (
                  <>
                    <span className="text-[20px] font-black text-foreground" dir="ltr">{plan.price}</span>
                    <p className="text-[10px] text-muted-foreground">{plan.priceSub}</p>
                  </>
                ) : (
                  <span className="text-[14px] font-semibold text-success">חינם לחלוטין</span>
                )}
              </div>

              {/* Features */}
              <div className="space-y-1.5 mb-3 flex-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                    <span className="text-[11px] text-muted-foreground leading-tight">{f}</span>
                  </div>
                ))}
              </div>

              {/* Selected check */}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                isActive ? "border-primary bg-primary" : "border-border"
              }`}>
                {isActive && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {!selected && (
        <p className="text-center text-[11px] text-muted-foreground">
          בחרו תוכנית להמשיך
        </p>
      )}
    </div>
  );
}

// ── Step 3: Connect Gmail ────────────────────────────────────────────────────
function StepConnectGmail({
  gmailConnected, gmailEmail, onConnect, connecting,
}: {
  gmailConnected: boolean; gmailEmail: string;
  onConnect: () => void; connecting: boolean;
}) {
  if (gmailConnected) {
    return (
      <div className="space-y-5 text-center" dir="rtl">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 20 }}
          className="w-20 h-20 rounded-[24px] mx-auto flex items-center justify-center"
          style={{ background: "hsl(var(--success)/0.12)", border: "2px solid hsl(var(--success)/0.35)" }}
        >
          <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>

        <div>
          <h2 className="text-[22px] font-black text-foreground">Gmail מחובר בהצלחה! ✅</h2>
          {gmailEmail && <p className="text-sm text-muted-foreground mt-1">{gmailEmail}</p>}
          <p className="text-[12px] text-muted-foreground mt-0.5">סנכרון אחרון: כעת</p>
        </div>

        <div className="flex justify-center gap-2">
          {["✅","📧","🚀","🎉","⚡"].map((e, i) => (
            <motion.span key={i} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }} className="text-xl">{e}</motion.span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl icon-blue mx-auto flex items-center justify-center">
          <Mail className="w-8 h-8" />
        </div>
        <h2 className="text-[22px] font-black text-foreground">📧 חברו את ה-Gmail שלכם</h2>
        <p className="text-sm text-muted-foreground">
          אנחנו נסרוק חשבוניות באופן אוטומטי מתיבת הדוא״ל שלכם
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        {[
          { icon: "📥", title: "קבלה אוטומטית", desc: "חשבוניות מהמייל נכנסות ישירות" },
          { icon: "🤖", title: "AI OCR",         desc: "חילוץ נתונים — ספק, סכום, תאריך" },
          { icon: "🔒", title: "רק קריאה",       desc: "לא כותבים ולא מוחקים כלום" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-[10px] bg-elevated border border-border">
            <div className="w-9 h-9 rounded-[8px] bg-muted flex items-center justify-center text-lg shrink-0">{item.icon}</div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Connect button */}
      <button
        onClick={onConnect}
        disabled={connecting}
        className="w-full btn-primary justify-center py-3.5 text-[15px] gap-2.5"
      >
        {connecting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> מתחברים...</>
        ) : (
          <><GoogleIcon /> חבור עם Google</>
        )}
      </button>

      <div className="text-center">
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
          דלג — אחבר מאוחר יותר
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Success Page ─────────────────────────────────────────────────────
function StepSuccess({ bizName, plan, gmailConnected, onFinish, saving }: {
  bizName: string; plan: PlanId; gmailConnected: boolean; onFinish: () => void; saving: boolean;
}) {
  const planLabel = plan === "free" ? "ניסיון חינם" : plan === "starter" ? "Starter" : "Business";
  return (
    <div className="space-y-6 text-center" dir="rtl">
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-6xl mx-auto w-fit"
      >
        🎉
      </motion.div>

      <div className="space-y-1">
        <h2 className="text-[24px] font-black text-foreground">מזל טוב! הכל מוכן</h2>
        <p className="text-sm text-muted-foreground">החשבון שלך הוגדר בהצלחה. החשבוניות שלך כבר בדרך...</p>
      </div>

      {/* Checklist */}
      <div className="rounded-[14px] border border-border bg-elevated p-4 space-y-3 text-right">
        {[
          { label: "ביזנס מוגדר", detail: bizName, done: !!bizName },
          { label: "תוכנית נבחרה", detail: planLabel, done: !!plan },
          { label: "Gmail מחובר", detail: gmailConnected ? "מחובר" : "לא חובר (ניתן לחבר בהגדרות)", done: gmailConnected },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground text-[12px]">{item.detail}</span>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">{item.label}</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${item.done ? "bg-success/15" : "bg-muted"}`}>
                <Check className={`w-3 h-3 ${item.done ? "text-success" : "text-muted-foreground"}`} />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onFinish}
        disabled={saving}
        className="w-full btn-primary justify-center py-3.5 text-[15px]"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
          : <><Rocket className="w-4 h-4" /> 🚀 כניסה ל-Dashboard</>
        }
      </button>
    </div>
  );
}

// ── Google SVG ────────────────────────────────────────────────────────────────
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

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  const isComplete = step === total - 1;
  return (
    <div className="h-[3px] bg-muted">
      <motion.div
        className="h-full rounded-full"
        style={{ background: isComplete ? "hsl(var(--success))" : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--teal)))" }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 4;
const STEP_LABELS = ["פרטי עסק", "בחירת מסלול", "חיבור Gmail", "סיום"];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]   = useState(0);
  const [dir,  setDir]    = useState(1);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail]         = useState("");
  const [formErrors, setFormErrors] = useState<{ bizName?: string; phone?: string }>({});

  const [bizName, setBizName] = useState("");
  const [phone,   setPhone]   = useState("");
  const [plan,    setPlan]    = useState<PlanId | null>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved) as { step?: number; bizName?: string; phone?: string; plan?: PlanId };
        if (d.step !== undefined) setStep(d.step);
        if (d.bizName) setBizName(d.bizName);
        if (d.phone)   setPhone(d.phone);
        if (d.plan)    setPlan(d.plan);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, bizName, phone, plan }));
  }, [step, bizName, phone, plan]);

  // Handle Gmail OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      const email = params.get("email") ?? "";
      setGmailConnected(true);
      setGmailEmail(email);
      setStep(2);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const validateStep1 = () => {
    const errs: typeof formErrors = {};
    if (!bizName.trim() || bizName.trim().length < 2) errs.bizName = "חובה הכנסת שם עסק (מינימום 2 תווים)";
    if (!phone.trim()) errs.phone = "חובה הכנסת מספר טלפון";
    else { const e = validatePhone(phone); if (e) errs.phone = e; }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !plan) return;
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => { setDir(-1); setStep((s) => s - 1); };

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const res  = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string };
      if (data.url) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 2, bizName, phone, plan, gmailPending: true }));
        window.location.href = data.url;
      } else {
        // dev fallback
        setGmailConnected(true);
        setGmailEmail("demo@billbot.co.il");
        setConnecting(false);
      }
    } catch {
      setConnecting(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/business-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_names: bizName ? [bizName] : [], onboarding_completed: true, selected_plan: plan }),
      });
    } catch (e) { console.error(e); }
    finally {
      setSaving(false);
      localStorage.removeItem(STORAGE_KEY);
      onComplete();
    }
  };

  const canNext = () => {
    if (step === 0) return bizName.trim().length >= 2;
    if (step === 1) return !!plan;
    return true;
  };

  const isLastStep   = step === TOTAL_STEPS - 1;
  const progressPct  = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0 bg-card">
        <span dir="ltr" className="text-[17px] font-black text-primary">BillBOT+</span>

        {/* Step labels */}
        <div className="hidden sm:flex items-center gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <div className="w-6 h-px bg-border" />}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                i === step
                  ? "bg-primary/15 text-primary"
                  : i < step
                    ? "text-success"
                    : "text-muted-foreground"
              }`}>
                {i < step
                  ? <Check className="w-3 h-3" />
                  : <span className="w-4 h-4 rounded-full border text-center leading-4 text-[10px]"
                           style={{ borderColor: i === step ? "hsl(var(--primary))" : "hsl(var(--border))" }}>
                      {i + 1}
                    </span>
                }
                {label}
              </div>
            </div>
          ))}
        </div>

        <span className="text-[12px] text-muted-foreground">
          {step + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-[3px] bg-muted shrink-0">
        <motion.div
          className="h-full"
          style={{
            background: isLastStep
              ? "hsl(var(--success))"
              : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--teal)))",
          }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>

      {/* ── Step subtitle (mobile) ── */}
      {step < TOTAL_STEPS - 1 && (
        <div className="sm:hidden px-5 py-2 text-center border-b border-border bg-elevated">
          <span className="text-[11px] text-muted-foreground">
            שלב {step + 1} מתוך {TOTAL_STEPS - 1}{step === TOTAL_STEPS - 2 ? " — שלב אחרון!" : ""}
          </span>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={SLIDE} initial="initial" animate="animate" exit="exit">
              {step === 0 && (
                <StepBusinessInfo
                  bizName={bizName} setBizName={setBizName}
                  phone={phone} setPhone={setPhone}
                  errors={formErrors}
                />
              )}
              {step === 1 && <StepChoosePlan selected={plan} setSelected={setPlan} />}
              {step === 2 && (
                <StepConnectGmail
                  gmailConnected={gmailConnected}
                  gmailEmail={gmailEmail}
                  onConnect={handleConnectGmail}
                  connecting={connecting}
                />
              )}
              {step === 3 && (
                <StepSuccess
                  bizName={bizName}
                  plan={plan ?? "free"}
                  gmailConnected={gmailConnected}
                  onFinish={handleFinish}
                  saving={saving}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer ── */}
      {step < TOTAL_STEPS - 1 && (
        <div className="shrink-0 border-t border-border bg-card px-5 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {step > 0 ? (
              <button onClick={goBack} className="btn-secondary h-11 px-5 gap-1.5">
                <ChevronLeft className="w-4 h-4 rotate-180" />
                חזרה
              </button>
            ) : <div />}

            {step === 2 && gmailConnected ? (
              <button
                onClick={goNext}
                className="btn-primary h-11 flex-1 justify-center"
              >
                <Sparkles className="w-4 h-4" /> ✨ סיום וכניסה למערכת
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canNext()}
                className="btn-primary h-11 flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                המשך
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-2">
            {step === 0 && "שלב 1 מתוך 3 — פרטי העסק"}
            {step === 1 && (!plan ? "בחרו תוכנית להמשיך" : `בחרתם: ${plan === "free" ? "ניסיון חינם" : plan === "starter" ? "Starter" : "Business"}`)}
            {step === 2 && !gmailConnected && "שלב 3 מתוך 3 — שלב אחרון!"}
            {step === 2 && gmailConnected && "Gmail מחובר — לחץ להמשיך לדשבורד!"}
          </p>
        </div>
      )}
    </div>
  );
}
