import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Check, ChevronLeft, ChevronRight,
  Building2, Tag, Settings2, Rocket, Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_CATEGORIES = [
  "משרד", "נסיעות", "טלפון", "חשמל", "אינטרנט",
  "ביטוח", "אחזקה", "שונות",
];

const BUSINESS_TYPES = [
  "חברה בע\"מ", "עוסק מורשה", "עצמאי / פרילנסר",
  "שותפות", "עמותה / מלכ\"ר", "אחר",
];

const INDUSTRIES = [
  "טכנולוגיה ותוכנה", "בינה מלאכותית", "ייעוץ ושירותים מקצועיים",
  "שיווק ופרסום", "בריאות ורפואה", "חינוך והדרכה",
  "נדל\"ן ובנייה", "קמעונאות ומסחר", "תחבורה ולוגיסטיקה",
  "מסעדנות ואירוח", "שירותים פיננסיים", "אחר",
];

const STEPS = [
  { icon: Building2, label: "זיהוי עסקי", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: Tag,       label: "קטגוריות",   color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Settings2, label: "פרופיל",      color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: Rocket,    label: "סיום",        color: "text-emerald-400", bg: "bg-emerald-500/10" },
];

const SLIDE = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  animate: { opacity: 1, x: 0 },
  exit:    (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function TagPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-rose-400 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function TextHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300/80 leading-relaxed" dir="rtl">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
      <span>{children}</span>
    </div>
  );
}

function SliderField({
  label, hint, value, onChange,
}: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-sm font-bold text-primary dir-ltr">{value}%</span>
      </div>
      <input
        type="range" min={0} max={100} step={5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
      />
      <p className="text-[11px] text-muted-foreground/60">{hint}</p>
    </div>
  );
}

// ── Step 1: Business Identification ──────────────────────────────────────────

function Step1({
  taxIds, setTaxIds, bizNames, setBizNames,
}: {
  taxIds: string[]; setTaxIds: (v: string[]) => void;
  bizNames: string[]; setBizNames: (v: string[]) => void;
}) {
  const [taxInput, setTaxInput]   = useState("");
  const [nameInput, setNameInput] = useState("");

  const addTax = () => {
    const v = taxInput.replace(/\D/g, "").slice(0, 9);
    if (v && !taxIds.includes(v)) setTaxIds([...taxIds, v]);
    setTaxInput("");
  };

  const addName = () => {
    const v = nameInput.trim();
    if (v && !bizNames.includes(v)) setBizNames([...bizNames, v]);
    setNameInput("");
  };

  return (
    <div className="space-y-5" dir="rtl">
      <TextHint>
        בואו נזהה את העסק שלך! הוסף את שמות העסק ומספרי הזיהוי בדיוק כפי שמופיעים על המסמכים שלך.
        זה עוזר ל-BillBOT+ להבדיל אוטומטית בין חשבוניות שהוצאת לקבלות שקיבלת.
      </TextHint>

      {/* Tax IDs */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">מספרי זיהוי (ח.פ / ע.מ / ת.ז)</label>
        <div className="flex gap-2">
          <input
            value={taxInput}
            onChange={(e) => setTaxInput(e.target.value.replace(/\D/g, "").slice(0, 9))}
            onKeyDown={(e) => e.key === "Enter" && addTax()}
            placeholder="מספר 9 ספרות..."
            dir="ltr"
            className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-left"
          />
          <button
            onClick={addTax}
            disabled={taxInput.length < 5}
            className="h-10 px-4 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {taxIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {taxIds.map((t) => (
              <TagPill key={t} label={t} onRemove={() => setTaxIds(taxIds.filter((x) => x !== t))} />
            ))}
          </div>
        )}
      </div>

      {/* Business names */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">שם העסק על החשבוניות</label>
        <div className="flex gap-2">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addName()}
            placeholder="שם חברה, מותג, שם עצמאי..."
            dir="rtl"
            className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={addName}
            disabled={!nameInput.trim()}
            className="h-10 px-4 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {bizNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {bizNames.map((n) => (
              <TagPill key={n} label={n} onRemove={() => setBizNames(bizNames.filter((x) => x !== n))} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground/60">ניתן להוסיף מספר שמות אם העסק פועל תחת שמות שונים</p>
      </div>
    </div>
  );
}

// ── Step 2: Expense Categories ────────────────────────────────────────────────

function Step2({
  selected, setSelected,
}: { selected: string[]; setSelected: (v: string[]) => void }) {
  const [customInput, setCustomInput] = useState("");

  const toggle = (cat: string) => {
    setSelected(
      selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]
    );
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (v && !selected.includes(v)) setSelected([...selected, v]);
    setCustomInput("");
  };

  const isCustom = (c: string) => !BASE_CATEGORIES.includes(c);

  return (
    <div className="space-y-5" dir="rtl">
      <TextHint>
        כיצד נסווג את ההוצאות שלך? בחר את הקטגוריות הבסיסיות המתאימות לעסק שלך, או הוסף קטגוריות
        מותאמות אישית. נשתמש בהן לארגון אוטומטי של ההוצאות שלך.
      </TextHint>

      {/* Base categories grid */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">קטגוריות בסיסיות</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BASE_CATEGORIES.map((cat) => {
            const on = selected.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggle(cat)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  on
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-white/3 border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                }`}
              >
                <span>{cat}</span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  on ? "bg-primary border-primary" : "border-white/20"
                }`}>
                  {on && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom categories */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">קטגוריות מותאמות אישית</label>
        <div className="flex gap-2">
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="שם קטגוריה חדשה..."
            dir="rtl"
            className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="h-10 px-4 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {selected.filter(isCustom).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selected.filter(isCustom).map((c) => (
              <TagPill key={c} label={c} onRemove={() => setSelected(selected.filter((x) => x !== c))} />
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        {selected.length} קטגוריות נבחרו
      </p>
    </div>
  );
}

// ── Step 3: Business Profile & Tax Settings ───────────────────────────────────

function Step3({ form, setForm }: {
  form: {
    business_type: string; industry: string;
    home_office_usage_percent: number; vehicle_business_usage_percent: number;
    estimated_annual_revenue: string; is_vat_registered: boolean; has_employees: boolean;
  };
  setForm: (f: typeof form) => void;
}) {
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <div className="space-y-5" dir="rtl">
      <TextHint>
        ספר לנו קצת על העסק שלך. מידע זה עוזר לנו להבין טוב יותר את הפעילות שלך ולשפר את
        הסיווג האוטומטי של ההוצאות וחישובי המס.
      </TextHint>

      {/* Business type + Industry */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">סוג עסק</label>
          <select
            value={form.business_type}
            onChange={(e) => set("business_type", e.target.value)}
            dir="rtl"
            className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="">בחר סוג...</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">תחום פעילות</label>
          <select
            value={form.industry}
            onChange={(e) => set("industry", e.target.value)}
            dir="rtl"
            className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="">בחר תחום...</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* Sliders */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
        <SliderField
          label="% שימוש עסקי בבית"
          hint="אם הוצאה מתחלקת בין בית לעסק — מה אחוז העסקי? (למשל: ארנונה, חשמל)"
          value={form.home_office_usage_percent}
          onChange={(v) => set("home_office_usage_percent", v)}
        />
        <div className="border-t border-white/8" />
        <SliderField
          label="% שימוש עסקי ברכב"
          hint="אם הרכב משמש גם לצרכים פרטיים — מה אחוז השימוש העסקי?"
          value={form.vehicle_business_usage_percent}
          onChange={(v) => set("vehicle_business_usage_percent", v)}
        />
      </div>

      {/* Revenue */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">הכנסה שנתית משוערת (₪)</label>
        <input
          value={form.estimated_annual_revenue}
          onChange={(e) => set("estimated_annual_revenue", e.target.value)}
          placeholder="למשל: 500,000"
          dir="ltr"
          className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-left"
        />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "is_vat_registered" as const, label: "רשום לפי ע.מ (מע\"מ)", sub: "מגיש דוחות מע\"מ" },
          { key: "has_employees" as const, label: "יש עובדים", sub: "משלם משכורות" },
        ].map(({ key, label, sub }) => (
          <button
            key={key}
            onClick={() => set(key, !form[key])}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-right ${
              form[key]
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-white/3 border-white/8 hover:border-white/20"
            }`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
              form[key] ? "bg-emerald-500 border-emerald-500" : "border-white/20"
            }`}>
              {form[key] && <Check className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className={`text-xs font-medium ${form[key] ? "text-emerald-300" : "text-foreground"}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Finish ────────────────────────────────────────────────────────────

function Step4({ saving }: { saving: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-4 gap-6" dir="rtl">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="w-24 h-24 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
      >
        <Rocket className="w-12 h-12 text-emerald-400" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">הכל מוכן!</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          BillBOT+ מוגדר עבורך ומוכן לעבוד. תוכל לעדכן את כל הפרטים בכל עת בפרופיל העסקי בהגדרות.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2.5" dir="rtl">
        {[
          "ח.פ ושמות עסק — נשמרו",
          "קטגוריות הוצאה — מוגדרות",
          "פרופיל עסקי ומע\"מ — עודכן",
        ].map((item) => (
          <div key={item} className="flex items-center justify-end gap-2 text-sm text-emerald-300">
            <span>{item}</span>
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
        ))}
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>שומר נתונים...</span>
        </div>
      )}
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]   = useState(0);
  const [dir,  setDir]    = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [taxIds,   setTaxIds]   = useState<string[]>([]);
  const [bizNames, setBizNames] = useState<string[]>([]);

  // Step 2
  const [categories, setCategories] = useState<string[]>([...BASE_CATEGORIES]);

  // Step 3
  const [form, setForm] = useState({
    business_type: "",
    industry: "",
    home_office_usage_percent: 0,
    vehicle_business_usage_percent: 0,
    estimated_annual_revenue: "",
    is_vat_registered: false,
    has_employees: false,
  });

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const canNext = useCallback(() => {
    if (step === 0) return taxIds.length > 0 || bizNames.length > 0;
    if (step === 1) return categories.length > 0;
    return true;
  }, [step, taxIds, bizNames, categories]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/business-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_tax_ids: taxIds,
          business_names: bizNames,
          expense_categories: categories,
          ...form,
          onboarding_completed: true,
        }),
      });
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
        <span className="text-lg font-bold text-foreground" dir="ltr">BillBOT+</span>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  done    ? "bg-emerald-500/20 border border-emerald-500/40" :
                  active  ? `${s.bg} border border-${s.color.replace("text-", "")}/40` :
                  "bg-white/5 border border-white/8"
                }`}>
                  {done
                    ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                    : <Icon className={`w-3.5 h-3.5 ${active ? s.color : "text-muted-foreground"}`} />
                  }
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${i < step ? "bg-emerald-500/40" : "bg-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">שלב {step + 1} מתוך {STEPS.length}</span>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 bg-white/5">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Step header */}
          <div className="mb-6 text-right">
            {(() => {
              const s = STEPS[step];
              const Icon = s.icon;
              return (
                <div className="flex items-center gap-3 mb-1">
                  <div className={`p-2 rounded-xl ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">{s.label}</h1>
                </div>
              );
            })()}
          </div>

          {/* Animated step content */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={SLIDE}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {step === 0 && (
                <Step1
                  taxIds={taxIds} setTaxIds={setTaxIds}
                  bizNames={bizNames} setBizNames={setBizNames}
                />
              )}
              {step === 1 && (
                <Step2 selected={categories} setSelected={setCategories} />
              )}
              {step === 2 && (
                <Step3 form={form} setForm={setForm} />
              )}
              {step === 3 && (
                <Step4 saving={saving} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/8 px-6 py-4 flex items-center justify-between">
        {step > 0 && !isLast ? (
          <Button
            variant="ghost"
            onClick={() => goTo(step - 1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            הקודם
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {/* Skip (steps 1-2 only) */}
          {step < 2 && (
            <button
              onClick={() => goTo(step + 1)}
              className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            >
              דלג
            </button>
          )}

          {!isLast ? (
            <Button
              onClick={() => goTo(step + 1)}
              disabled={!canNext()}
              className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl h-10 px-6 disabled:opacity-50"
            >
              הבא
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold rounded-xl h-10 px-6"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
              ) : (
                <><Rocket className="w-4 h-4" /> שמור ועבור לדשבורד</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
