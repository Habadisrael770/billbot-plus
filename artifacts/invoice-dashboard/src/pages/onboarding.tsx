import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Phone, Check, ChevronLeft,
  Mail, Rocket, Sparkles, Zap, Shield,
  Loader2, Star,
} from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");

const STORAGE_KEY = "bb_onboarding_progress";

// ── Animation variants ─────────────────────────────────────────────────────
const SLIDE = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 56 : -56 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
  exit:    (dir: number) => ({ opacity: 0, x: dir > 0 ? -56 : 56, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }),
};

// ── Plan definitions ───────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    name: "ניסיון חינמי",
    price: "₪0",
    period: "/ 14 יום",
    description: "היכרות מלאה עם המערכת",
    color: "border-border hover:border-primary/40",
    activeColor: "border-primary bg-primary/8",
    badge: null,
    badgeColor: "",
    icon: Zap,
    iconBg: "icon-blue",
    features: ["עד 50 חשבוניות", "OCR בסיסי", "ייצוא Excel"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "₪149",
    period: "/ חודש",
    description: "לעצמאים ועסקים קטנים",
    color: "border-border hover:border-teal/40",
    activeColor: "border-teal bg-teal/8",
    badge: "פופולרי",
    badgeColor: "badge-teal",
    icon: Star,
    iconBg: "icon-teal",
    features: ["חשבוניות ללא הגבלה", "OCR מתקדם + AI", "Gmail & Telegram", "ייצוא לרו\"ח"],
  },
  {
    id: "business",
    name: "Business",
    price: "₪349",
    period: "/ חודש",
    description: "לחברות ורואי חשבון",
    color: "border-border hover:border-purple/40",
    activeColor: "border-purple bg-purple/8",
    badge: "הכי שלם",
    badgeColor: "badge-primary",
    icon: Shield,
    iconBg: "icon-purple",
    features: ["הכל ב-Starter", "ריבוי עסקים", "API מלא", "תמיכה 24/7"],
  },
] as const;

type PlanId = "free" | "starter" | "business";

// ── Step 1: Business Info ──────────────────────────────────────────────────
function StepBusinessInfo({
  bizName, setBizName, phone, setPhone,
}: {
  bizName: string; setBizName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
}) {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl icon-blue mx-auto flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">ספר לנו על העסק שלך</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          מידע זה עוזר ל-BillBOT+ לזהות ולסווג את החשבוניות שלך אוטומטית
        </p>
      </div>

      <div className="space-y-4">
        {/* Business name */}
        <div className="space-y-2">
          <label className="input-label">
            <Building2 className="w-3.5 h-3.5 inline ml-1.5 text-primary" />
            שם העסק *
          </label>
          <input
            type="text"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
            placeholder="שם החברה, מותג או שם עצמאי..."
            dir="rtl"
            className="input"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            כפי שמופיע על החשבוניות שלך
          </p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="input-label">
            <Phone className="w-3.5 h-3.5 inline ml-1.5 text-primary" />
            טלפון ליצירת קשר
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+\-\s]/g, ""))}
            placeholder="05X-XXXXXXX"
            dir="ltr"
            className="input text-left"
          />
          <p className="text-[11px] text-muted-foreground">
            לא חובה — לשימוש פנימי בלבד
          </p>
        </div>
      </div>

      {/* Hint box */}
      <div className="flex items-start gap-3 rounded-[10px] border border-primary/20 bg-primary/6 px-4 py-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          BillBOT+ ישתמש בשם העסק כדי להבדיל אוטומטית בין חשבוניות שהוצאת לקבלות שקיבלת
        </p>
      </div>
    </div>
  );
}

// ── Step 2: Choose Plan ────────────────────────────────────────────────────
function StepChoosePlan({
  selected, setSelected,
}: { selected: PlanId; setSelected: (v: PlanId) => void }) {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl icon-teal mx-auto flex items-center justify-center mb-4">
          <Rocket className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">בחר תוכנית</h2>
        <p className="text-muted-foreground text-sm">
          ניתן לשנות בכל עת — ללא התחייבות
        </p>
      </div>

      <div className="grid gap-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isActive = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative flex items-center gap-4 p-4 rounded-[14px] border-2 text-right transition-all duration-200 w-full ${
                isActive ? plan.activeColor : plan.color + " bg-card"
              }`}
              style={{ boxShadow: isActive ? "var(--shadow-card)" : undefined }}
            >
              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${plan.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground text-[15px]">{plan.name}</span>
                  {plan.badge && (
                    <span className={plan.badgeColor}>{plan.badge}</span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">{plan.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {plan.features.map((f) => (
                    <span key={f} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="text-left shrink-0">
                <span className="text-xl font-black text-foreground" dir="ltr">{plan.price}</span>
                <p className="text-[10px] text-muted-foreground">{plan.period}</p>
              </div>

              {/* Check */}
              <div className={`absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                isActive ? "border-primary bg-primary" : "border-border bg-transparent"
              }`}>
                {isActive && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        כל התוכניות כוללות הצפנה מלאה ואבטחת מידע ברמה גבוהה
      </p>
    </div>
  );
}

// ── Step 3: Connect Gmail ──────────────────────────────────────────────────
function StepConnectGmail({
  gmailConnected, onConnect, connecting,
}: {
  gmailConnected: boolean;
  onConnect: () => void;
  connecting: boolean;
}) {
  return (
    <div className="space-y-6 text-center" dir="rtl">
      {gmailConnected ? (
        /* ── Success state ── */
        <div className="space-y-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
            style={{ background: "rgb(16 185 129 / 0.12)", border: "1px solid rgb(16 185 129 / 0.3)" }}
          >
            <Check className="w-12 h-12" style={{ color: "hsl(var(--success))" }} />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Gmail מחובר!</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              BillBOT+ יסרוק אוטומטית את תיבת הדואר שלך ויחלץ חשבוניות
            </p>
          </div>

          {/* Celebration particles */}
          <div className="flex justify-center gap-3">
            {["✅", "📧", "🚀", "🎉", "⚡"].map((emoji, i) => (
              <motion.span
                key={i}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: [-8, 0, -4, 0], opacity: 1 }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
                className="text-2xl"
              >
                {emoji}
              </motion.span>
            ))}
          </div>

          <div className="rounded-[14px] border border-border bg-card p-4 space-y-3 text-right" style={{ boxShadow: "var(--shadow-card)" }}>
            {[
              { icon: "✓", text: "שם עסק נשמר בהצלחה", color: "text-success" },
              { icon: "✓", text: "תוכנית נבחרה", color: "text-success" },
              { icon: "✓", text: "Gmail מחובר ומוכן לסריקה", color: "text-success" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12 }}
                className="flex items-center justify-end gap-2 text-sm"
              >
                <span className="text-foreground">{item.text}</span>
                <span className={`font-bold ${item.color}`}>{item.icon}</span>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Connect state ── */
        <div className="space-y-6">
          <div>
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 icon-blue">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">חבר את Gmail שלך</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
              BillBOT+ יסרוק את המיילים שלך ויחלץ חשבוניות אוטומטית — ללא מאמץ
            </p>
          </div>

          {/* Benefits list */}
          <div className="grid gap-2 text-right">
            {[
              { icon: "📥", title: "קבלה אוטומטית", desc: "חשבוניות מהמייל נכנסות ישירות למערכת" },
              { icon: "🤖", title: "AI OCR", desc: "חילוץ נתונים חכם — ספק, סכום, תאריך" },
              { icon: "🔒", title: "אבטחה מלאה", desc: "רק קריאה — לא כותבים ולא מוחקים" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-card">
                <div className="w-9 h-9 rounded-[8px] bg-muted flex items-center justify-center text-lg shrink-0">
                  {item.icon}
                </div>
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
            className="w-full btn-primary justify-center py-3.5 text-[15px]"
          >
            {connecting
              ? <><Loader2 className="w-5 h-5 animate-spin" /> מתחבר...</>
              : <><Mail className="w-5 h-5" /> חבר Gmail עכשיו</>
            }
          </button>

          {/* Skip */}
          <button
            onClick={() => {}}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            דלג — אחבר מאוחר יותר
          </button>
        </div>
      )}
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="h-1 bg-muted overflow-hidden">
      <motion.div
        className="h-full"
        style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--teal)))" }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2" dir="ltr">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === step ? 24 : 6,
            backgroundColor: i <= step ? "#4361ee" : "hsl(var(--border))",
          }}
          transition={{ duration: 0.3 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3;

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]   = useState(0);
  const [dir,  setDir]    = useState(1);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);

  // Step 1 state
  const [bizName, setBizName] = useState("");
  const [phone,   setPhone]   = useState("");

  // Step 2 state
  const [plan, setPlan] = useState<PlanId>("starter");

  // Restore progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as {
          step?: number; bizName?: string; phone?: string; plan?: PlanId;
        };
        if (data.step)    setStep(data.step);
        if (data.bizName) setBizName(data.bizName);
        if (data.phone)   setPhone(data.phone);
        if (data.plan)    setPlan(data.plan);
      }
    } catch { /* ignore */ }
  }, []);

  // Save progress to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, bizName, phone, plan }));
  }, [step, bizName, phone, plan]);

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDir(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDir(-1);
      setStep((s) => s - 1);
    }
  };

  const canNext = () => {
    if (step === 0) return bizName.trim().length > 0;
    if (step === 1) return !!plan;
    return true;
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        // Store that we're mid-onboarding so after OAuth redirect we return here
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 2, bizName, phone, plan, gmailPending: true }));
        window.location.href = data.url;
      } else {
        // If no URL (credentials not configured), mark as skipped and move on
        setGmailConnected(false);
        setConnecting(false);
      }
    } catch {
      setConnecting(false);
    }
  };

  // Check if we returned from Gmail OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/business-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_names: bizName ? [bizName] : [],
          onboarding_completed: true,
          selected_plan: plan,
        }),
      });
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setSaving(false);
      localStorage.removeItem(STORAGE_KEY);
      onComplete();
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;
  const stepLabels = ["פרטי עסק", "בחירת תוכנית", "חיבור Gmail"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" dir="rtl">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0 bg-card" style={{ boxShadow: "var(--shadow-sm)" }}>
        {/* Logo */}
        <span dir="ltr" className="text-[17px] font-black text-primary">BillBOT+</span>

        {/* Step label + dots */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[12px] font-semibold text-foreground">{stepLabels[step]}</span>
          <StepDots step={step} total={TOTAL_STEPS} />
        </div>

        {/* Counter */}
        <span className="text-[12px] text-muted-foreground" dir="ltr">
          {step + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <ProgressBar step={step} total={TOTAL_STEPS} />

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={SLIDE}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {step === 0 && (
                <StepBusinessInfo
                  bizName={bizName}
                  setBizName={setBizName}
                  phone={phone}
                  setPhone={setPhone}
                />
              )}
              {step === 1 && (
                <StepChoosePlan
                  selected={plan}
                  setSelected={setPlan}
                />
              )}
              {step === 2 && (
                <StepConnectGmail
                  gmailConnected={gmailConnected}
                  onConnect={handleConnectGmail}
                  connecting={connecting}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer buttons ── */}
      <div className="shrink-0 border-t border-border bg-card px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          {/* Back */}
          {step > 0 ? (
            <button
              onClick={goBack}
              className="btn-secondary h-11 px-5"
            >
              <ChevronLeft className="w-4 h-4" />
              חזרה
            </button>
          ) : (
            <div />
          )}

          {/* Next / Finish */}
          {isLastStep ? (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn-primary h-11 px-6 flex-1 justify-center"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
                : <><Rocket className="w-4 h-4" /> יאללה, נתחיל!</>
              }
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canNext()}
              className="btn-primary h-11 px-6 flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              הבא
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          )}
        </div>

        {/* Step progress text */}
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          {step < TOTAL_STEPS - 1
            ? `עוד ${TOTAL_STEPS - step - 1} שלבים לסיום ההגדרה`
            : "כמעט סיימנו! לחץ על הכפתור כדי להתחיל"}
        </p>
      </div>
    </div>
  );
}
