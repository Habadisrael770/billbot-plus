import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  Calculator,
  Search,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = "gmail" | "historical" | "finish";

const STEPS: Step[] = ["gmail", "historical", "finish"];

const SLIDE = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 },
  transition: { duration: 0.3 },
};

// ── Gmail Step ────────────────────────────────────────────────────────────────
function GmailStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      onNext();
    }, 1800);
  }

  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto px-4">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
        חיבור Gmail לזיהוי אוטומטי
      </h1>
      <p className="text-muted-foreground text-base mb-10">
        המערכת תסרוק את המייל ותזהה חשבוניות באופן אוטומטי
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
        {/* Why connect card */}
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-right space-y-4">
          <div className="flex items-center justify-end gap-2 text-foreground font-semibold">
            <span>?למה לחבר Gmail</span>
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <ul className="space-y-3">
            {[
              { bold: "אפס מאמץ:", text: "החשבוניות נכנסות למערכת לבד" },
              { bold: "זמן אמת:", text: "ברגע שהמייל מגיע, החשבונית אצלנו" },
              { bold: "סדר מלא:", text: "לא מפספסים אף הוצאה לדיווח" },
            ].map((item, i) => (
              <li key={i} className="flex items-start justify-end gap-2 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">{item.bold}</strong> {item.text}
                </span>
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              </li>
            ))}
          </ul>
        </div>

        {/* Connect card */}
        <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center justify-center gap-4">
          {/* Gmail M logo */}
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-md">
            <svg viewBox="0 0 48 48" className="w-10 h-10">
              <path fill="#EA4335" d="M24 20.89L6 8H42L24 20.89Z" />
              <path fill="#4285F4" d="M42 8v32L30 28 42 8Z" />
              <path fill="#34A853" d="M6 40V8L18 28 6 40Z" />
              <path fill="#FBBC04" d="M6 40l18-12 18 12H6Z" />
              <path fill="#C5221F" d="M24 20.89L6 8h36L24 20.89Z" opacity=".5" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground mb-1">חיבור חשבון Gmail</p>
            <p className="text-sm text-muted-foreground">
              חיבור בטוח באמצעות Google OAuth. אנחנו קוראים רק מיילים רלוונטיים לחשבוניות.
            </p>
          </div>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl h-11"
          >
            {connecting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> מתחבר...</>
            ) : (
              "חבר את ה-Gmail שלי"
            )}
          </Button>
        </div>
      </div>

      <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground underline transition-colors">
        דלג לעת עתה
      </button>
      <p className="text-xs text-muted-foreground mt-2">
        * חיבור יותר ממחשבון אחד דורש מנוי לחשבונות
      </p>
    </div>
  );
}

// ── Historical Scan Step ──────────────────────────────────────────────────────
function HistoricalStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState("2025-12-12");
  const [emailMe, setEmailMe] = useState(true);

  function handleScan() {
    setShowModal(false);
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onNext();
    }, 3000);
  }

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto px-4">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
        נשלוף חשבוניות מהעבר?
      </h1>
      <p className="text-muted-foreground text-base mb-10">
        בואו נסרוק את המייל שלכם לאחור ונאסוף את כל ההוצאות שכבר קיבלתם
      </p>

      <div className="w-full rounded-2xl border border-dashed border-border bg-card/40 p-10 flex flex-col items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground mb-2">סריקה היסטורית מהירה</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            אנחנו נחפש חשבוניות מהחודשים האחרונים כדי למלא את המערכת במידע באופן אוטומטי
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          disabled={scanning}
          className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl h-11 px-8 gap-2"
        >
          {scanning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> סורק...</>
          ) : (
            <><Clock className="w-4 h-4" /> התחל סריקה היסטורית</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          במסגרת תקופת הניסיון ניתן לסרוק עד 3 חודשים אחורה. למנוי{" "}
          <button className="text-primary underline font-medium">Premium</button>{" "}
          ניתן לסרוק עד 4 שנים!
        </p>
      </div>

      <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground underline transition-colors">
        בוא נמשיך, אעשה זאת אחר כך
      </button>

      {/* Scan Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl text-right"
            >
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-foreground text-lg">סריקה היסטורית של מיילים</h3>
                  <p className="text-sm text-muted-foreground">סרוק את תיבת הדואר שלך לאחור כדי למצוא חשבוניות ישנות</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-right">
                  <label className="text-sm font-medium text-foreground block mb-1">סרוק החל מתאריך</label>
                  <div className="flex items-center justify-end gap-2 p-3 rounded-xl border border-border bg-background">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-foreground text-sm focus:outline-none"
                    />
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-left">
                    ניתן לסרוק עד 3 חודשים אחורה •{" "}
                    <button className="text-primary underline">שדרג לסריקה מורחבת</button>
                  </p>
                </div>

                <label className="flex items-center justify-end gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer">
                  <span className="text-sm text-foreground">שלח לי מייל כשהסריקה תסתיים</span>
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="checkbox"
                    checked={emailMe}
                    onChange={(e) => setEmailMe(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                </label>

                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-right space-y-2">
                  <p className="text-sm font-medium text-primary flex items-center justify-end gap-2">
                    <span>:טיפ</span>
                    <span>💡</span>
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>הסריקה מתבצעת ברקע — ניתן לסגור את החלון ולהמשיך לעבוד</li>
                    <li>יעובדו רק מיילים עם קבצים מצורפים או מילות מפתח רלוונטיות</li>
                    <li>חשבוניות כפולות יזוהו אוטומטית ולא יוכפלו</li>
                  </ul>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button onClick={() => setShowModal(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    ביטול
                  </button>
                  <Button
                    onClick={handleScan}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl h-11 gap-2"
                  >
                    <Search className="w-4 h-4" /> התחל סריקה
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning overlay */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-2xl text-right"
            >
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setScanning(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-foreground text-lg">סריקה היסטורית של מיילים</h3>
                  <p className="text-sm text-muted-foreground">מחפש מיילים רלוונטיים...</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground">מחפש מיילים עם חשבוניות...</p>
              </div>
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ביטול
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Finish Step ───────────────────────────────────────────────────────────────
function FinishStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto px-4">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
        עוד רגע מסיימים...
      </h1>
      <p className="text-muted-foreground text-base mb-10">
        הגדרות אחרונות כדי שהכל יהיה באוטומציה מלאה
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10">
        {/* Accounting software */}
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-right flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
            <Calculator className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">תוכנות הנהלת חשבונות</p>
            <p className="text-sm text-muted-foreground">
              סנכרון מלא עם Sumit, Morning, Rivhit, Dokka ועוד...
            </p>
          </div>
          <button
            onClick={() => {}}
            className="w-full py-2 px-4 rounded-xl border border-border text-sm text-foreground hover:bg-white/5 transition-colors"
          >
            ראה אינטגרציות
          </button>
        </div>

        {/* Accountant */}
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-right flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">חיבור רואה חשבון</p>
            <p className="text-sm text-muted-foreground">
              המערכת תשלח לרואה החשבון שלך את כל הדוחות והחשבוניות בכל חודש.
            </p>
          </div>
          <button
            onClick={() => {}}
            className="w-full py-2 px-4 rounded-xl border border-border text-sm text-foreground hover:bg-white/5 transition-colors"
          >
            הגדר אימייל
          </button>
        </div>
      </div>

      <Button
        onClick={onDone}
        size="lg"
        className="w-full max-w-xs bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl h-12 gap-2 text-base"
      >
        <ArrowLeft className="w-5 h-5" />
        סיום והמשך למערכת
      </Button>
    </div>
  );
}

// ── Main Onboarding Wizard ───────────────────────────────────────────────────
export default function Onboarding({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<Step>("gmail");

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function complete() {
    onComplete?.();
  }

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
    else complete();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <button
          onClick={stepIndex > 0 ? () => setStep(STEPS[stepIndex - 1]) : undefined}
          className={`flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ${stepIndex === 0 ? "invisible" : ""}`}
        >
          חזרה לשלב הקודם
          <ArrowRight className="w-4 h-4" />
        </button>
        <span className="text-xl font-black bg-gradient-to-br from-primary to-emerald-400 bg-clip-text text-transparent">
          VATrix
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} {...SLIDE} className="w-full">
            {step === "gmail" && (
              <GmailStep onNext={goNext} onSkip={goNext} />
            )}
            {step === "historical" && (
              <HistoricalStep onNext={goNext} onSkip={goNext} />
            )}
            {step === "finish" && (
              <FinishStep onDone={complete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 pb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`rounded-full transition-all duration-300 ${
              i === stepIndex
                ? "w-6 h-2 bg-primary"
                : i < stepIndex
                ? "w-2 h-2 bg-primary/50"
                : "w-2 h-2 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
