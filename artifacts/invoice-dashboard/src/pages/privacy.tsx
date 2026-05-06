import { useLocation } from "wouter";
import { ArrowRight, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לאפליקציה
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">מדיניות פרטיות</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">מדיניות פרטיות</h1>
          <p className="text-muted-foreground text-sm">
            Privacy Policy — BillBOT+ | עדכון אחרון: מאי 2026
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
            <Shield className="w-3 h-3" />
            אנו מחויבים לשמירה על פרטיותך
          </div>
        </div>

        {/* Hebrew Section */}
        <div className="space-y-8">
          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              1. מה השירות עושה
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              BillBOT+ ("האפליקציה", "השירות", "אנחנו") היא מערכת אוטומטית לניהול וסיווג חשבוניות
              עסקיות. האפליקציה מאפשרת קליטת חשבוניות ממקורות שונים — העלאה ישירה, סריקת מייל, 
              העברת מייל אוטומטית, WhatsApp, וטלגרם — ומפעילה עיבוד AI לחילוץ נתונים ולסיווג.
            </p>
          </section>

          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              2. מידע שאנו אוספים
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <div>
                <p className="text-white font-medium mb-1">פרטי חשבון:</p>
                <p>כתובת אימייל, שם מלא (אופציונלי), סיסמה מוצפנת, ומזהה Google אם התחברת עם Google.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">מסמכי חשבוניות:</p>
                <p>
                  קבצי PDF ותמונות של חשבוניות שהועלו ישירות, נשלחו דרך WhatsApp/טלגרם,
                  או שהגיעו דרך העברת מייל. מסמכים אלה נשמרים בשרתינו לצורך עיבוד ותצוגה.
                </p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">נתוני חשבוניות מחולצים:</p>
                <p>שם ספק, מספר עוסק מורשה, תאריך, סכום, מע"מ, מספר חשבונית, קטגוריה.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">נתוני חיבורי מייל:</p>
                <p>
                  לצורך סריקת Gmail: טוקן OAuth המאפשר גישת קריאה בלבד למיילים המכילים חשבוניות.
                  לחיבור IMAP: סיסמת האפליקציה שלך מוצפנת ב-AES-256 ואינה נשמרת בטקסט גלוי.
                  לחיבור העברת מייל: כתובת ייעודית ייחודית לחשבונך בלבד.
                </p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">נתוני שיחת AI:</p>
                <p>שיחות עם עוזר ה-AI (DeepSeek) נשמרות לטובת הזיכרון הרציף של ה-AI.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">נתוני WhatsApp:</p>
                <p>
                  אם תרשום מספר WhatsApp — אנו שומרים אותו (לאחר נירמול) כדי לשייך הודעות 
                  נכנסות לחשבונך. אין גישה לשאר ההיסטוריה של WhatsApp שלך.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              3. כיצד אנו משתמשים במידע
            </h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
              <li>עיבוד וחילוץ נתונים מחשבוניות בעזרת AI (Gemini Flash, DeepSeek דרך OpenRouter)</li>
              <li>סיווג אוטומטי של הוצאות לקטגוריות</li>
              <li>זיהוי ספקים חוזרים ומניעת כפילויות</li>
              <li>תמיכה בייצוא נתונים לצרכי ראיית חשבון</li>
              <li>שיפור הדיוק של מנגנוני הסיווג (ללא שיתוף עם צדדים שלישיים)</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              <strong className="text-white">אין:</strong> מכירה של נתונים לצדדים שלישיים, 
              שימוש בנתונים לפרסום, או שיתוף נתונים עם גורמים מסחריים כלשהם.
            </p>
          </section>

          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              4. העברת נתונים לשירותי AI
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              לצורך חילוץ נתונים מחשבוניות, תוכן קבצים (תמונות ו-PDF) נשלח לשירותי AI חיצוניים:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">OpenRouter:</strong> ספק API המנתב בקשות ל-
                Google Gemini Flash (OCR) ו-DeepSeek. מדיניות פרטיות: openrouter.ai/privacy
              </li>
              <li>
                <strong className="text-white">Google Gemini:</strong> שימוש ב-OCR לסריקת PDF.
                מדיניות: ai.google.dev/privacy
              </li>
            </ul>
            <p className="text-sm text-amber-400/80">
              ⚠️ הנתונים המועברים לשירותי AI כוללים תוכן החשבונית אך לא פרטים מזהים אישיים נוספים.
            </p>
          </section>

          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              5. Gmail ו-Google OAuth
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              כאשר משתמשים מחברים את Gmail דרך OAuth, האפליקציה מקבלת גישה ל-
              <strong className="text-white"> gmail.readonly</strong> בלבד — 
              קריאת מיילים לצורך מציאת חשבוניות, ללא יכולת שליחה, מחיקה, או שינוי.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>הגישה מוגבלת למיילים עם קבצים מצורפים בלבד</li>
              <li>מיילים שאינם מכילים חשבוניות אינם נשמרים</li>
              <li>ניתן לנתק את Google בכל עת דרך myaccount.google.com</li>
              <li>שימושנו ב-Gmail API עומד בדרישות Google API Services User Data Policy</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              6. אבטחת מידע
            </h2>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>סיסמאות מוצפנות בעזרת PBKDF2 עם 310,000 איטרציות</li>
              <li>סיסמאות אפליקציה IMAP מוצפנות AES-256</li>
              <li>כל התקשורת מוצפנת בTLS/HTTPS</li>
              <li>העברת מייל: לכל משתמש כתובת ייחודית — אי אפשר לגשת לחשבונות אחרים</li>
              <li>הנתונים מאוחסנים בשרת PostgreSQL מאובטח</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              7. זכויות המשתמש
            </h2>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>הזכות לעיין בנתונים שנאספו על חשבונך</li>
              <li>הזכות לתיקון נתונים שגויים</li>
              <li>הזכות למחיקת חשבונך וכל הנתונים הקשורים אליו</li>
              <li>הזכות לנייד את הנתונים (ייצוא CSV/Excel)</li>
              <li>הזכות לבטל גישת Gmail בכל עת</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              לבקשות נתונים פנה ל: <a href="mailto:privacy@billbot.co.il" className="text-primary hover:underline">privacy@billbot.co.il</a>
            </p>
          </section>

          <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
              8. שמירת נתונים
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              נתוני חשבוניות נשמרים לאורך חיי החשבון. עם ביטול החשבון, נתונים נמחקים תוך 30 יום.
              יש לנו גיבויים אוטומטיים ל-30 ימי אחסון. מיילים שנסרקו אינם נשמרים — רק הנתונים 
              המחולצים מהם.
            </p>
          </section>
        </div>

        {/* English Section */}
        <div className="border-t border-white/10 pt-10 space-y-6" dir="ltr">
          <h2 className="text-xl font-bold text-white text-center">Privacy Policy — English</h2>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">1. Service Description</h3>
              <p>
                BillBOT+ is an automated invoice management and categorization system for small
                businesses and freelancers. It processes invoices received via direct upload, Gmail
                scanning, email forwarding, WhatsApp, and Telegram using AI-powered extraction.
              </p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">2. Information We Collect</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-white">Account data:</strong> email address, name (optional), encrypted password, Google ID if using Google Sign-In.</li>
                <li><strong className="text-white">Invoice documents:</strong> PDF and image files uploaded or received through connected channels, stored for processing and display.</li>
                <li><strong className="text-white">Extracted invoice data:</strong> vendor name, tax ID, date, amount, VAT, invoice number, category.</li>
                <li><strong className="text-white">Gmail connection:</strong> OAuth token with gmail.readonly scope only — read-only access to find invoice emails.</li>
                <li><strong className="text-white">IMAP connection:</strong> App password stored encrypted with AES-256 — never stored in plaintext.</li>
                <li><strong className="text-white">Email forwarding:</strong> A unique per-user forwarding address to route emails to your account.</li>
                <li><strong className="text-white">WhatsApp:</strong> Phone number (normalized) to link incoming invoice messages to your account.</li>
                <li><strong className="text-white">AI chat:</strong> Conversation history with our AI assistant for persistent context.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">3. How We Use Data</h3>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Extracting and categorizing invoice data using AI</li>
                <li>Vendor recognition and duplicate detection</li>
                <li>Generating financial reports and exports</li>
                <li>Improving categorization accuracy within your account</li>
              </ul>
              <p><strong className="text-white">We do not</strong> sell data to third parties, use data for advertising, or share data with any commercial entity.</p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">4. Third-Party AI Services</h3>
              <p>Invoice content is sent to external AI services for processing:</p>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong className="text-white">OpenRouter</strong> (openrouter.ai) — routes to Google Gemini Flash for OCR and DeepSeek for text extraction</li>
                <li><strong className="text-white">Google Gemini Flash</strong> — scanned PDF OCR</li>
              </ul>
              <p>Only invoice content is transmitted — no additional personal identifiers.</p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">5. Gmail API Compliance</h3>
              <p>
                Our use of the Gmail API is limited to <code className="bg-white/10 px-1 rounded">gmail.readonly</code> scope.
                We access only emails containing attachments, never store full email bodies, and
                comply with the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-primary hover:underline" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>.
                Users can revoke access at any time via myaccount.google.com.
              </p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">6. Security</h3>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Passwords hashed with PBKDF2 (310,000 iterations, SHA-256)</li>
                <li>IMAP passwords encrypted with AES-256</li>
                <li>All traffic encrypted via TLS/HTTPS</li>
                <li>Unique per-user forwarding addresses prevent cross-account access</li>
                <li>Database access restricted to application servers only</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">7. Your Rights</h3>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Right to access your data</li>
                <li>Right to correct inaccurate data</li>
                <li>Right to delete your account and all associated data</li>
                <li>Right to data portability (CSV/Excel export)</li>
                <li>Right to revoke Gmail access at any time</li>
              </ul>
              <p>Contact: <a href="mailto:privacy@billbot.co.il" className="text-primary hover:underline">privacy@billbot.co.il</a></p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-card/30 p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">8. Data Retention</h3>
              <p>
                Invoice data is retained for the lifetime of your account. Upon account deletion,
                all data is purged within 30 days. Scanned email content is not stored — only
                the extracted invoice data is retained. Automated backups are kept for 30 days.
              </p>
            </section>

            <p className="text-xs text-muted-foreground text-center pt-4">
              Last updated: May 2026 · BillBOT+ · Contact: privacy@billbot.co.il
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
