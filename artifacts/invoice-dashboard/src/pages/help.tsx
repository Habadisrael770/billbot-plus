import { useState } from "react";
import { useLocation } from "wouter";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  Send,
  FileText,
  Upload,
  Zap,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Layout } from "@/components/layout";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "כיצד מעלים חשבונית?",
    a: 'לחץ על כפתור "העלה חשבונית" בכותרת בכל עמוד. ניתן להעלות קובץ PDF, JPG או PNG, לצלם ישירות מהמצלמה, או לשלוח תמונה דרך הבוט של טלגרם.',
  },
  {
    q: "כיצד BillBOT+ מזהה כפילויות?",
    a: "המערכת מחשבת חתימה (hash) ייחודית לכל קובץ וגם בודקת התאמה לפי ספק + סכום + תאריך. חשבונית שמופיעה פעמיים תסומן אוטומטית כ״חשד לכפילות״ ותחכה לאישורך.",
  },
  {
    q: "כיצד מחברים Gmail?",
    a: 'עבור להגדרות ← אינטגרציות ← Gmail. לחץ "חבר חשבון" ואשר את ההרשאות. לאחר החיבור, BillBOT+ יסרוק אוטומטית מיילים חדשים ויחלץ מהם חשבוניות.',
  },
  {
    q: "מה ניתן לשלוח לרואה חשבון?",
    a: 'בעמוד ייצוא לרו"ח בחר תאריכי טווח וייצא קובץ Excel/CSV עם כל נתוני החשבוניות, או שלח ישירות לכתובת מייל של רואה החשבון בלחיצה אחת.',
  },
  {
    q: "האם ניתן להשתמש בבוט טלגרם?",
    a: 'כן. חפש את @Heshbonitbot בטלגרם, שלח לו תמונה של חשבונית או קבלה, והוא יעבד אותה אוטומטית ויוסיף אותה למערכת עם כל הפרטים.',
  },
  {
    q: "כיצד פועלת הקטגוריזציה האוטומטית?",
    a: "המערכת משתמשת בכללים חכמים לפי שם הספק, סוג המסמך וסכום העסקה. ניתן לשנות קטגוריה בכל עת, והמערכת לומדת מהבחירות שלך לאורך זמן.",
  },
  {
    q: "מה קורה אם חשבונית לא זוהתה נכון?",
    a: 'ניתן לערוך כל שדה ידנית — ספק, תאריך, סכום, מספר חשבונית ועוד. לחץ על שורת החשבונית ← ערוך, הכנס את הפרטים הנכונים ושמור.',
  },
  {
    q: "האם המידע שלי מאובטח?",
    a: "כל הנתונים מוצפנים ומאוחסנים בשרתים מאובטחים. לא משתפים מידע עם צדדים שלישיים ללא אישורך המפורש.",
  },
];

const QUICK_LINKS = [
  { icon: Upload, label: "העלאת חשבוניות", color: "text-primary bg-primary/10", href: "/expenses" },
  { icon: Zap, label: "הגדרת אינטגרציות", color: "text-amber-500 bg-amber-500/10", href: "/integrations" },
  { icon: FileText, label: 'ייצוא לרו"ח', color: "text-emerald-500 bg-emerald-500/10", href: "/expenses" },
  { icon: ShieldCheck, label: "אבטחה ופרטיות", color: "text-violet-500 bg-violet-500/10", href: "/settings" },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-right"
          >
            <span className="font-medium text-foreground text-sm">{item.q}</span>
            {open === i ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>
          {open === i && (
            <div className="border-t border-border px-5 py-4 bg-muted/20">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function HelpPage() {
  const [, navigate] = useLocation();
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`${API_BASE}/email-connectors/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `פנייה מ-${contactForm.name}: תמיכה BillBOT+`,
          body: `שם: ${contactForm.name}\nמייל: ${contactForm.email}\n\n${contactForm.message}`,
          from_name: contactForm.name,
          from_email: contactForm.email,
        }),
      });
      if (res.ok) {
        setSent(true);
        setContactForm({ name: "", email: "", message: "" });
        setTimeout(() => setSent(false), 5000);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setSendError(data.error ?? "שגיאה בשליחה, נסה שוב.");
      }
    } catch {
      setSendError("לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט ונסה שוב.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">מרכז עזרה</h1>
          <p className="text-sm text-muted-foreground mt-1">
            תשובות לשאלות נפוצות ופנייה לתמיכה
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            מדריכים מהירים
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl text-center hover:bg-muted/40 hover:border-primary/40 transition-colors group cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${link.color}`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground leading-snug">{link.label}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            שאלות נפוצות
          </h2>
          <FAQAccordion items={FAQ_ITEMS} />
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            צרו קשר
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Contact cards */}
            <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">מייל תמיכה</p>
                <p className="text-xs text-muted-foreground mt-0.5">support@billbot.co.il</p>
                <p className="text-xs text-muted-foreground">זמן מענה: עד 24 שעות</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">צ'אט תמיכה</p>
                <p className="text-xs text-muted-foreground mt-0.5">זמין ימים א–ה</p>
                <p className="text-xs text-muted-foreground">09:00 – 18:00</p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <form onSubmit={handleSend} className="mt-4 bg-card border border-border rounded-2xl p-5 space-y-4">
            <p className="font-semibold text-foreground text-sm">שלח הודעה</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">שם מלא</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="ישראל ישראלי"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">כתובת מייל</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="name@example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">הודעה</label>
              <textarea
                required
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                placeholder="תאר את הבעיה או השאלה שלך..."
              />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {sent && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  ההודעה נשלחה בהצלחה!
                </div>
              )}
              {sendError && (
                <p className="text-sm text-destructive">{sendError}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="mr-auto flex items-center gap-2 h-9 px-5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "שולח..." : "שלח הודעה"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
