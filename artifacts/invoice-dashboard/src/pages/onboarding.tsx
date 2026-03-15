import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Phone, Check, ChevronLeft,
  Mail, Rocket, Sparkles, Zap, Shield,
  Loader2, Star, ArrowLeft, FileText, Brain, Lock,
} from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");
const STORAGE_KEY = "bb_onboarding_progress";

const SLIDE = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit:    (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }),
};

const PLANS = [
  {
    id: "free",
    name: "ניסיון חינמי",
    price: "₪0",
    period: "14 יום",
    description: "היכרות מלאה עם המערכת",
    activeColor: "border-primary bg-primary/8",
    borderColor: "border-border hover:border-primary/40",
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
    activeColor: "border-teal bg-teal/8",
    borderColor: "border-border hover:border-teal/40",
    badge: "פופולרי",
    badgeColor: "badge-teal",
    icon: Star,
    iconBg: "icon-teal",
    features: ["חשבוניות ללא הגבלה", "OCR מתקדם + AI", "Gmail & Telegram", 'ייצוא לרו"ח'],
  },
  {
    id: "business",
    name: "Business",
    price: "₪349",
    period: "/ חודש",
    description: "לחברות ורואי חשבון",
    activeColor: "border-purple bg-purple/8",
    borderColor: "border-border hover:border-purple/40",
    badge: "הכי שלם",
    badgeColor: "badge-primary",
    icon: Shield,
    iconBg: "icon-purple",
    features: ["הכל ב-Starter", "ריבוי עסקים", "API מלא", "תמיכה 24/7"],
  },
] as const;

type PlanId = "free" | "starter" | "business";

// ── Side panel content per step ────────────────────────────────────────────
const SIDE_PANELS = [
  {
    headline: "נתחיל בהכרות",
    sub: "BillBOT+ לומד את העסק שלך כדי לסווג חשבוניות בדיוק מירבי",
    bullets: [
      { icon: Brain,    text: "זיהוי ספקים חכם בינה מלאכותית" },
      { icon: FileText, text: "סיווג אוטומטי לקטגוריות מע\"מ" },
      { icon: Lock,     text: "מידע מאובטח ומוצפן לחלוטין" },
    ],
  },
  {
    headline: "בחר תוכנית",
    sub: "התחל בחינם — שדרג בכל עת ללא התחייבות",
    bullets: [
      { icon: Zap,      text: "14 יום ניסיון ללא כרטיס אשראי" },
      { icon: Star,     text: "ביטול בכל עת, ללא קנסות" },
      { icon: Shield,   text: "מחיר קבוע — ללא הפתעות" },
    ],
  },
  {
    headline: "חבר את Gmail",
    sub: "המערכת סורקת את תיבת הדואר שלך ומחלצת חשבוניות אוטומטית",
    bullets: [
      { icon: Mail,     text: "סריקה אוטומטית 24/7" },
      { icon: Brain,    text: "AI מזהה חשבוניות בין מאות מיילים" },
      { icon: Lock,     text: "הרשאת קריאה בלבד — אנחנו לא כותבים" },
    ],
  },
];

// ── Step 1 ─────────────────────────────────────────────────────────────────
function StepBusinessInfo({
  bizName, setBizName, phone, setPhone,
}: { bizName: string; setBizName: (v: string) => void; phone: string; setPhone: (v: string) => void }) {
  return (
    <div className="space-y-5" dir="rtl">
      <div className="space-y-1.5">
        <h2 className="text-[22px] font-black text-foreground">פרטי העסק שלך</h2>
        <p className="text-sm text-muted-foreground">מידע זה עוזר לנו לזהות ולסווג חשבוניות בדיוק</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="input-label">
            <Building2 className="w-3.5 h-3.5 inline ml-1 opacity-70" />
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
          <p className="text-[11px] text-muted-foreground">כפי שמופיע על החשבוניות שלך</p>
        </div>

        <div className="space-y-1.5">
          <label className="input-label">
            <Phone className="w-3.5 h-3.5 inline ml-1 opacity-70" />
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
          <p className="text-[11px] text-muted-foreground">לא חובה — לשימוש פנימי בלבד</p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-[10px] border border-primary/20 bg-primary/6 px-3.5 py-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          BillBOT+ ישתמש בשם העסק כדי להבדיל אוטומטית בין חשבוניות שהוצאת לקבלות שקיבלת
        </p>
      </div>
    </div>
  );
}

// ── Step 2 ─────────────────────────────────────────────────────────────────
function StepChoosePlan({
  selected, setSelected,
}: { selected: PlanId; setSelected: (v: PlanId) => void }) {
  return (
    <div className="space-y-5" dir="rtl">
      <div className="space-y-1.5">
        <h2 className="text-[22px] font-black text-foreground">בחר תוכנית</h2>
        <p className="text-sm text-muted-foreground">ניתן לשנות בכל עת — ללא התחייבות</p>
      </div>

      <div className="space-y-2.5">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isActive = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative flex items-center gap-3.5 p-3.5 rounded-[12px] border-2 text-right transition-all duration-200 w-full ${
                isActive ? plan.activeColor : plan.borderColor + " bg-card"
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${plan.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-[14px]">{plan.name}</span>
                  {plan.badge && <span className={plan.badgeColor}>{plan.badge}</span>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{plan.description}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {plan.features.map((f) => (
                    <span key={f} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="text-left shrink-0 ml-1">
                <span className="text-[18px] font-black text-foreground" dir="ltr">{plan.price}</span>
                <p className="text-[10px] text-muted-foreground">{plan.period}</p>
              </div>

              {/* Radio */}
              <div className={`absolute top-3 left-3 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                isActive ? "border-primary bg-primary" : "border-border"
              }`}>
                {isActive && <Check className="w-2.5 h-2.5 text-white" />}
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

// ── Step 3 ─────────────────────────────────────────────────────────────────
function StepConnectGmail({
  gmailConnected, onConnect, connecting,
}: { gmailConnected: boolean; onConnect: () => void; connecting: boolean }) {
  if (gmailConnected) {
    return (
      <div className="space-y-5 text-center" dir="rtl">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="w-20 h-20 rounded-[24px] mx-auto flex items-center justify-center"
          style={{ background: "rgb(16 185 129 / 0.12)", border: "2px solid rgb(16 185 129 / 0.35)" }}
        >
          <Check className="w-10 h-10" style={{ color: "hsl(var(--success))" }} />
        </motion.div>

        <div>
          <h2 className="text-[22px] font-black text-foreground">Gmail מחובר!</h2>
          <p className="text-sm text-muted-foreground mt-1">BillBOT+ יסרוק אוטומטית את תיבת הדואר שלך</p>
        </div>

        <div className="flex justify-center gap-2 py-1">
          {["✅", "📧", "🚀", "🎉", "⚡"].map((emoji, i) => (
            <motion.span
              key={i}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="text-xl"
            >
              {emoji}
            </motion.span>
          ))}
        </div>

        <div className="rounded-[12px] border border-border bg-elevated p-4 space-y-2.5 text-right">
          {[
            { text: "שם עסק נשמר בהצלחה" },
            { text: "תוכנית נבחרה" },
            { text: "Gmail מחובר ומוכן לסריקה" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center justify-end gap-2 text-sm"
            >
              <span className="text-foreground">{item.text}</span>
              <span className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                <Check className="w-3 h-3 text-success" />
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="space-y-1.5">
        <h2 className="text-[22px] font-black text-foreground">חבר את Gmail שלך</h2>
        <p className="text-sm text-muted-foreground">BillBOT+ יסרוק מיילים ויחלץ חשבוניות אוטומטית</p>
      </div>

      <div className="space-y-2">
        {[
          { icon: "📥", title: "קבלה אוטומטית", desc: "חשבוניות מהמייל נכנסות ישירות למערכת" },
          { icon: "🤖", title: "AI OCR",         desc: "חילוץ נתונים חכם — ספק, סכום, תאריך" },
          { icon: "🔒", title: "אבטחה מלאה",     desc: "רק קריאה — לא כותבים ולא מוחקים" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-elevated">
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

      <button
        onClick={onConnect}
        disabled={connecting}
        className="w-full btn-primary justify-center py-3 text-[15px]"
      >
        {connecting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> מתחבר...</>
          : <><Mail className="w-4 h-4" /> חבר Gmail עכשיו</>
        }
      </button>

      <div className="text-center">
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
          דלג — אחבר מאוחר יותר
        </button>
      </div>
    </div>
  );
}

// ── Left Branding Panel ────────────────────────────────────────────────────
function BrandPanel({ step }: { step: number }) {
  const panel = SIDE_PANELS[step];
  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full p-8 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--teal) / 0.08) 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-24 -right-12 w-64 h-64 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--teal)) 0%, transparent 70%)" }}
      />

      {/* Logo */}
      <div>
        <span dir="ltr" className="text-[22px] font-black text-primary">BillBOT+</span>
        <p className="text-[12px] text-muted-foreground mt-1">ניהול חשבוניות חכם בעזרת AI</p>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <h3 className="text-[28px] font-black text-foreground leading-tight">{panel.headline}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{panel.sub}</p>
          </div>

          <div className="space-y-3">
            {panel.bullets.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-[8px] icon-blue flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-foreground">{b.text}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Step pills */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              width: i === step ? 28 : 8,
              backgroundColor: i <= step ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}
            transition={{ duration: 0.3 }}
            className="h-2 rounded-full"
          />
        ))}
        <span className="text-[11px] text-muted-foreground mr-2">שלב {step + 1} מתוך 3</span>
      </div>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3;
const STEP_LABELS = ["פרטי עסק", "בחירת תוכנית", "חיבור Gmail"];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]     = useState(0);
  const [dir, setDir]       = useState(1);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [bizName, setBizName] = useState("");
  const [phone, setPhone]     = useState("");
  const [plan, setPlan]       = useState<PlanId>("starter");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved) as { step?: number; bizName?: string; phone?: string; plan?: PlanId };
        if (d.step)    setStep(d.step);
        if (d.bizName) setBizName(d.bizName);
        if (d.phone)   setPhone(d.phone);
        if (d.plan)    setPlan(d.plan);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, bizName, phone, plan }));
  }, [step, bizName, phone, plan]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const goNext = () => { setDir(1); setStep((s) => s + 1); };
  const goBack = () => { setDir(-1); setStep((s) => s - 1); };
  const canNext = () => step === 0 ? bizName.trim().length > 0 : true;
  const isLast  = step === TOTAL_STEPS - 1;

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string };
      if (data.url) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 2, bizName, phone, plan, gmailPending: true }));
        window.location.href = data.url;
      } else {
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
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setSaving(false);
      localStorage.removeItem(STORAGE_KEY);
      onComplete();
    }
  };

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex bg-background" dir="rtl">
      {/* ── Left branding panel (desktop) ── */}
      <div className="lg:w-[42%] xl:w-[38%] border-l border-border shrink-0">
        <BrandPanel step={step} />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
          {/* Mobile logo */}
          <span dir="ltr" className="text-[16px] font-black text-primary lg:hidden">BillBOT+</span>
          {/* Step label */}
          <div className="flex items-center gap-2 mx-auto lg:mx-0">
            <span className="text-[12px] font-semibold text-foreground">{STEP_LABELS[step]}</span>
            <span className="text-[11px] text-muted-foreground" dir="ltr">({step + 1}/{TOTAL_STEPS})</span>
          </div>
          {/* Skip hint on desktop */}
          <div className="hidden lg:block w-20" />
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-muted shrink-0">
          <motion.div
            className="h-full"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--teal)))" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-6 py-8">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={SLIDE} initial="initial" animate="animate" exit="exit">
                {step === 0 && <StepBusinessInfo bizName={bizName} setBizName={setBizName} phone={phone} setPhone={setPhone} />}
                {step === 1 && <StepChoosePlan selected={plan} setSelected={setPlan} />}
                {step === 2 && <StepConnectGmail gmailConnected={gmailConnected} onConnect={handleConnectGmail} connecting={connecting} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card px-6 py-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            {step > 0 ? (
              <button onClick={goBack} className="btn-secondary h-11 px-5 gap-1.5">
                <ArrowLeft className="w-4 h-4 rotate-180" />
                חזרה
              </button>
            ) : (
              <div className="h-11" />
            )}

            {isLast ? (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="btn-primary h-11 flex-1 justify-center"
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
                className="btn-primary h-11 flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                הבא
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-2.5">
            {step < TOTAL_STEPS - 1
              ? `עוד ${TOTAL_STEPS - step - 1} שלבים לסיום ההגדרה`
              : "כמעט סיימנו! לחץ להתחיל"}
          </p>
        </div>
      </div>
    </div>
  );
}
