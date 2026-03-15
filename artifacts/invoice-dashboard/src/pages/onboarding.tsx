import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Phone, Check, ChevronLeft,
  Sparkles, Loader2,
  CheckCircle2, AlertCircle,
} from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");
const STORAGE_KEY = "bb_onboarding_progress";

const IL_PHONE_RE = /^(\+972|0)(5[0-9]|[234679])[0-9]{7}$/;
function validatePhone(v: string) {
  const clean = v.replace(/[\s\-]/g, "");
  return IL_PHONE_RE.test(clean) ? null : "מספר טלפון לא תקין";
}

const PLANS = [
  {
    id: "free",
    name: "חינם",
    trial: "12 יום",
    price: null,
    badge: null,
    features: ["גישה מלאה", "ללא כרטיס אשראי", "ביטול בכל עת"],
    highlighted: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "₪149",
    priceSub: "/ חודש",
    badge: "הכי פופולרי",
    features: ["כל התכונות", "תמיכה 24/7", "AI יועץ + דוחות"],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "₪349",
    priceSub: "/ חודש",
    badge: null,
    features: ["כל Starter", "API גישה", "מנהל הצלחה"],
    highlighted: false,
  },
] as const;
type PlanId = "free" | "starter" | "business";

const SLIDE_VARIANTS = {
  initial: (d: number) => ({ opacity: 0, x: d > 0 ? 32 : -32 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as number[] } },
  exit:    (d: number) => ({ opacity: 0, x: d > 0 ? -32 : 32, transition: { duration: 0.2 } }),
};

const STEP_LABELS = ["פרטי עסק", "מסלול", "Gmail", "סיום"];
const TOTAL = 4;

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step,  setStep]  = useState(0);
  const [dir,   setDir]   = useState(1);
  const [saving, setSaving] = useState(false);

  const [bizName, setBizName] = useState("");
  const [phone,   setPhone]   = useState("");
  const [plan,    setPlan]    = useState<PlanId | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail,     setGmailEmail]     = useState("");
  const [connecting, setConnecting]         = useState(false);
  const [errors, setErrors] = useState<{ bizName?: string; phone?: string }>({});

  // Restore progress
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

  // Handle Gmail OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      setGmailEmail(params.get("email") ?? "");
      setStep(2);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const validateStep1 = () => {
    const e: typeof errors = {};
    if (bizName.trim().length < 2) e.bizName = "חובה שם עסק (מינימום 2 תווים)";
    if (!phone.trim()) e.phone = "חובה מספר טלפון";
    else { const pe = validatePhone(phone); if (pe) e.phone = pe; }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !plan) return;
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL - 1));
  };

  const back = () => { setDir(-1); setStep((s) => s - 1); };

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const res  = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string };
      if (data.url) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 2, bizName, phone, plan }));
        window.location.href = data.url;
      } else {
        setGmailConnected(true);
        setGmailEmail("demo@billbot.co.il");
        setConnecting(false);
      }
    } catch { setConnecting(false); }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/business-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_names: bizName ? [bizName] : [], onboarding_completed: true }),
      });
    } catch { /* silent */ }
    localStorage.removeItem(STORAGE_KEY);
    setSaving(false);
    onComplete();
  };

  const canNext = () => {
    if (step === 0) return bizName.trim().length >= 2;
    if (step === 1) return !!plan;
    return true;
  };

  const pct = ((step + 1) / TOTAL) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-[520px] max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.45)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span dir="ltr" className="text-[15px] font-black text-primary">BillBOT+</span>
            <span className="text-muted-foreground text-[11px]">— הגדרה ראשונית</span>
          </div>

          {/* Step pills */}
          <div className="hidden sm:flex items-center gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                i === step ? "bg-primary/15 text-primary" : i < step ? "text-success" : "text-muted-foreground"
              }`}>
                {i < step
                  ? <Check className="w-2.5 h-2.5" />
                  : <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px]"
                           style={{ borderColor: i === step ? "hsl(var(--primary))" : "hsl(var(--border))" }}>
                      {i + 1}
                    </span>
                }
                {label}
              </div>
            ))}
          </div>

          <span className="sm:hidden text-[11px] text-muted-foreground">{step + 1}/{TOTAL}</span>
        </div>

        {/* ── Progress bar ── */}
        <div className="h-[2px] bg-muted shrink-0">
          <motion.div
            className="h-full"
            style={{ background: step === TOTAL - 1 ? "hsl(var(--success))" : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--teal)))" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* ── Content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={SLIDE_VARIANTS} initial="initial" animate="animate" exit="exit">

                {/* Step 1: Business info */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[18px] font-bold text-foreground">ברוכים הבאים! בואו נתחיל</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">מידע בסיסי על העסק שלך</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="input-label"><Building2 className="w-3.5 h-3.5 inline ml-1 opacity-60" />שם עסק *</label>
                      <input
                        type="text"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        placeholder='לדוגמא: דני כהן בע"מ'
                        autoFocus
                        className={`input ${errors.bizName ? "border-destructive" : bizName.trim().length >= 2 ? "border-success" : ""}`}
                      />
                      {errors.bizName
                        ? <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.bizName}</p>
                        : bizName.trim().length >= 2 && <p className="text-[11px] text-success flex items-center gap-1"><Check className="w-3 h-3" />נראה טוב!</p>
                      }
                    </div>
                    <div className="space-y-1.5">
                      <label className="input-label"><Phone className="w-3.5 h-3.5 inline ml-1 opacity-60" />טלפון *</label>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1 h-10 px-3 rounded-[10px] border border-border bg-elevated text-sm text-muted-foreground shrink-0">🇮🇱 +972</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^\d+\-\s]/g, ""))}
                          placeholder="050-1234-567"
                          dir="ltr"
                          className={`input flex-1 text-left ${errors.phone ? "border-destructive" : phone && !validatePhone(phone) ? "border-success" : ""}`}
                        />
                      </div>
                      {errors.phone
                        ? <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>
                        : phone && !validatePhone(phone) && <p className="text-[11px] text-success flex items-center gap-1"><Check className="w-3 h-3" />מספר תקין</p>
                      }
                    </div>
                  </div>
                )}

                {/* Step 2: Plan */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-[18px] font-bold text-foreground">בחרו מסלול</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">ניתן לשנות בכל עת מההגדרות</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {PLANS.map((p) => {
                        const active = plan === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPlan(p.id)}
                            className={`relative flex flex-col p-3.5 rounded-[14px] text-right border-2 transition-all ${
                              p.highlighted
                                ? active ? "border-primary bg-primary/10" : "border-primary/50 bg-primary/5 hover:bg-primary/8"
                                : active ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-elevated"
                            } ${p.highlighted ? "scale-[1.02]" : ""}`}
                          >
                            {p.badge && (
                              <span className="absolute -top-2.5 right-1/2 translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-500 border border-teal-500/25 whitespace-nowrap">
                                {p.badge}
                              </span>
                            )}
                            <p className="font-bold text-[13px] text-foreground mt-1">{p.name}</p>
                            {p.price
                              ? <span className="text-[17px] font-black text-foreground" dir="ltr">{p.price}</span>
                              : <span className="text-[12px] font-semibold text-success">חינם לחלוטין</span>
                            }
                            <div className="space-y-1 mt-2">
                              {p.features.map((f) => (
                                <div key={f} className="flex items-center gap-1">
                                  <Check className="w-3 h-3 text-success shrink-0" />
                                  <span className="text-[10px] text-muted-foreground leading-tight">{f}</span>
                                </div>
                              ))}
                            </div>
                            <div className={`w-4 h-4 rounded-full border mx-auto mt-3 flex items-center justify-center transition-all ${active ? "border-primary bg-primary" : "border-border"}`}>
                              {active && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {!plan && <p className="text-center text-[11px] text-muted-foreground">בחרו תוכנית להמשיך</p>}
                  </div>
                )}

                {/* Step 3: Gmail */}
                {step === 2 && (
                  <div className="space-y-4">
                    {gmailConnected ? (
                      <div className="text-center space-y-3 py-2">
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 260, damping: 20 }}
                          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                          style={{ background: "hsl(var(--success)/0.12)", border: "2px solid hsl(var(--success)/0.35)" }}
                        >
                          <CheckCircle2 className="w-8 h-8 text-success" />
                        </motion.div>
                        <div>
                          <p className="font-bold text-foreground">Gmail מחובר!</p>
                          {gmailEmail && <p className="text-sm text-muted-foreground" dir="ltr">{gmailEmail}</p>}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h2 className="text-[18px] font-bold text-foreground">חברו את Gmail</h2>
                          <p className="text-sm text-muted-foreground mt-0.5">נסרוק חשבוניות אוטומטית מהמייל שלך</p>
                        </div>
                        <div className="space-y-2">
                          {[
                            { icon: "📥", text: "קבלת חשבוניות ממיילים נכנסים" },
                            { icon: "🤖", text: "חילוץ נתונים אוטומטי עם AI" },
                            { icon: "🔒", text: "קריאה בלבד — לא כותבים כלום" },
                          ].map((item) => (
                            <div key={item.text} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-elevated border border-border">
                              <span className="text-lg shrink-0">{item.icon}</span>
                              <span className="text-[13px] text-foreground">{item.text}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleConnectGmail}
                          disabled={connecting}
                          className="w-full btn-primary justify-center py-2.5 gap-2"
                        >
                          {connecting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> מתחברים...</>
                            : <><GoogleIcon /> חבור עם Google</>
                          }
                        </button>
                        <button
                          onClick={next}
                          className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
                        >
                          דלג — אחבר מאוחר יותר
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Step 4: Success */}
                {step === 3 && (
                  <div className="text-center space-y-4 py-2">
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 15 }}
                      className="text-5xl mx-auto w-fit"
                    >
                      🎉
                    </motion.div>
                    <div>
                      <h2 className="text-[20px] font-black text-foreground">מזל טוב! הכל מוכן</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">החשבון שלך הוגדר בהצלחה</p>
                    </div>
                    <div className="rounded-xl border border-border bg-elevated p-4 space-y-2.5 text-right">
                      {[
                        { label: "ביזנס מוגדר", detail: bizName, done: !!bizName },
                        { label: "תוכנית נבחרה", detail: plan === "free" ? "ניסיון חינם" : plan === "starter" ? "Starter" : "Business", done: !!plan },
                        { label: "Gmail", detail: gmailConnected ? gmailEmail : "לא חובר (ניתן בהגדרות)", done: gmailConnected },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.1 }}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground text-[12px] truncate ml-2">{item.detail}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-foreground font-medium">{item.label}</span>
                            <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center ${item.done ? "bg-success/15" : "bg-muted"}`}>
                              <Check className={`w-3 h-3 ${item.done ? "text-success" : "text-muted-foreground"}`} />
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <button
                      onClick={finish}
                      disabled={saving}
                      className="w-full btn-primary justify-center py-3 text-[15px]"
                    >
                      {saving
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
                        : <>כניסה לDashboard<Sparkles className="w-4 h-4" /></>
                      }
                    </button>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Footer (nav buttons) — not shown on success step ── */}
        {step < TOTAL - 1 && (
          <div className="shrink-0 border-t border-border bg-card/80 px-5 py-3.5 flex items-center gap-2.5">
            {step > 0
              ? <button onClick={back} className="btn-secondary h-9 px-4 gap-1">
                  <ChevronLeft className="w-3.5 h-3.5 rotate-180" />חזרה
                </button>
              : <div />
            }
            {!(step === 2 && !gmailConnected) && (
              <button
                onClick={next}
                disabled={!canNext()}
                className="btn-primary h-9 flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {step === 2 && gmailConnected ? <><Sparkles className="w-3.5 h-3.5" /> סיום וכניסה</> : <>המשך <ChevronLeft className="w-3.5 h-3.5 rotate-180" /></>}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
