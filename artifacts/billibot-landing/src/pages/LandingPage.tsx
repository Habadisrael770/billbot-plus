import { useState, useEffect, useRef } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const SIGNUP_URL = "/login";

/* ─── helpers ──────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Video Section ─────────────────────────────────────────── */
function VideoSection() {
  const { ref, visible } = useInView(0.1);
  return (
    <section
      ref={ref}
      style={{
        padding: "100px 0 0",
        background: "linear-gradient(180deg, #080e1e 0%, #0d1224 100%)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(67,97,238,0.18), 0 0 160px rgba(45,212,191,0.07)",
          background: "#080e1e",
          aspectRatio: "16/9",
          position: "relative",
        }}
      >
        <iframe
          src="/billbot-video/"
          title="BILLIBOT+ — סרטון הדגמה"
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          allow="autoplay; fullscreen"
        />
      </div>
    </section>
  );
}

/* ─── Hero Section ──────────────────────────────────────────── */
function HeroSection() {
  const { ref, visible } = useInView(0.1);
  return (
    <section
      id="hero"
      ref={ref}
      style={{
        padding: "80px 1.5rem 90px",
        textAlign: "center",
        direction: "rtl",
        background: "linear-gradient(180deg, #0d1224 0%, #0d1224 80%, #0d1224 100%)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* Badge */}
        <div style={{ marginBottom: "1.5rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(67,97,238,0.12)",
              border: "1px solid rgba(67,97,238,0.3)",
              borderRadius: 100,
              padding: "0.35rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#a5b4fc",
              fontFamily: "Heebo, sans-serif",
            }}
          >
            ✨ עוזר AI לחשבוניות עסקיות
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "Heebo, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2rem, 5vw, 3.4rem)",
            lineHeight: 1.25,
            color: "white",
            margin: "0 0 1.25rem",
            letterSpacing: "-1px",
          }}
        >
          מפסיקים לרדוף<br />
          <span
            style={{
              background: "linear-gradient(135deg, #4361ee, #2dd4bf)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            אחרי חשבוניות.
          </span>
          <br />
          מתחילים לעבוד עם<br />
          עוזר AI שעושה את זה בשבילכם.
        </h1>

        {/* Sub */}
        <p
          style={{
            fontFamily: "Heebo, sans-serif",
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.75,
            margin: "0 0 2.5rem",
            maxWidth: 640,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          BILLIBOT אוספת חשבוניות מהמייל והוואטסאפ, מסדרת הכל לפי ספק וקטגוריה,
          ושולחת דוח מוכן לרואה החשבון — ואם משהו לא ברור, פשוט שואלים את העוזר החכם.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2.5rem" }}>
          <a
            href={SIGNUP_URL}
            style={{
              fontFamily: "Heebo, sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "white",
              textDecoration: "none",
              padding: "0.85rem 2rem",
              borderRadius: 12,
              background: "linear-gradient(135deg, #4361ee, #6474f0)",
              boxShadow: "0 8px 24px rgba(67,97,238,0.45)",
              transition: "transform 0.2s, box-shadow 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(67,97,238,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(67,97,238,0.45)";
            }}
          >
            נסו בחינם 14 יום — ללא כרטיס אשראי
          </a>
        </div>

        {/* Trust bar */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            justifyContent: "center",
            flexWrap: "wrap",
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.9rem",
            fontFamily: "Heebo, sans-serif",
          }}
        >
          {[
            { icon: "🏢", text: "500+ עסקים" },
            { icon: "⭐", text: "5.0 דירוג ממוצע" },
            { icon: "⏱️", text: "חיסכון של 7 שעות בחודש" },
          ].map(({ icon, text }) => (
            <span key={text} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>{icon}</span>
              <span style={{ fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{text}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Problem Section ───────────────────────────────────────── */
function ProblemSection() {
  const { ref, visible } = useInView();
  const pains = [
    { icon: "📅", text: "ה-15 מתקרב — וצריך להגיש מע\"מ בלי שכל החשבוניות מסודרות" },
    { icon: "📨", text: "חשבוניות בכל מקום — חלק ב-Gmail, חלק בוואטסאפ, חלק נעלמו" },
    { icon: "📞", text: "רואה החשבון מתקשר — \"תשלח לי את הכל\" ואתם מתחילים לחפש" },
    { icon: "⏱️", text: "שעות שהולכות לאיבוד — על חיפוש מסמכים במקום על העסק" },
  ];
  return (
    <section
      id="problem"
      ref={ref}
      style={{
        padding: "90px 1.5rem",
        direction: "rtl",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2
            style={{
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              color: "white",
              margin: "0 0 1rem",
            }}
          >
            כל חודש אותו דבר מחדש
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.05rem", fontFamily: "Heebo, sans-serif", margin: 0 }}>
            מכירים את התחושה הזו?
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {pains.map(({ icon, text }, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
                background: "#161e36",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "1.25rem 1.5rem",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(20px)",
                transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
              }}
            >
              <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{icon}</span>
              <p style={{ margin: 0, fontFamily: "Heebo, sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                {text}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "2.5rem",
            textAlign: "center",
            padding: "1.5rem",
            background: "rgba(67,97,238,0.08)",
            border: "1px solid rgba(67,97,238,0.2)",
            borderRadius: 16,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "Heebo, sans-serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "#a5b4fc",
            }}
          >
            זה בדיוק מה ש-BILLIBOT פותרת — ועוד הרבה יותר.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Features Section ──────────────────────────────────────── */
function FeaturesSection() {
  const { ref, visible } = useInView();
  const features = [
    {
      icon: "📧",
      title: "סריקה אוטומטית מהמייל",
      desc: "מתחברים ל-Gmail או Outlook בלחיצה אחת — חיבור מאובטח, בלי לשתף סיסמה. AI מזהה חשבוניות ומסדר לפי ספק. אפשר לסרוק היסטוריה של עד 4 שנים אחורה.",
      color: "#4361ee",
    },
    {
      icon: "💬",
      title: "בוט וואטסאפ",
      desc: "מצלמים קבלה או שולחים קובץ לוואטסאפ של המערכת — וזהו. הבוט מעבד, מזהה ספק וסכום, ומעלה הכל אוטומטית. מושלם לבעלי עסק שלא אוהבים אקסלים.",
      color: "#25d366",
    },
    {
      icon: "🤖",
      title: "עוזר AI חכם — שואלים, הוא עונה",
      desc: "שאלו בשפה פשוטה: \"כמה הוצאתי על שיווק ברביע האחרון?\", \"תוציא דוח מספק X\", \"מה הצב\"ר מע\"מ שלי?\" — תשובה תוך שניות, עם זיכרון לטווח ארוך.",
      color: "#2dd4bf",
    },
    {
      icon: "📊",
      title: "דשבורד חכם בזמן אמת",
      desc: "מסך אחד שמראה הכל: מע\"מ לקיזוז, חיסכון חודשי, פילוח הוצאות לפי קטגוריה וספק. אין צורך לחכות לרו\"ח כדי לדעת איפה אתם עומדים.",
      color: "#f59e0b",
    },
    {
      icon: "✉️",
      title: "שליחה אוטומטית לרואה חשבון",
      desc: "מגדירים פעם אחת תאריך ומייל של הרו\"ח — ובכל חודש הוא מקבל דוח מסודר עם כל ההוצאות, כולל Excel מפורט לפי חודשים, קטגוריות וספקים.",
      color: "#a855f7",
    },
    {
      icon: "🔗",
      title: "חיבור לתוכנות הנהלת חשבונות",
      desc: "אינטגרציה ישירה ל-iCount, חשבונית ירוקה ו-Morning — ההוצאות עולות אוטומטית, בלי הזנה כפולה.",
      color: "#ec4899",
    },
    {
      icon: "🔔",
      title: "תזכורות לספקים",
      desc: "המערכת מזהה תשלומים חוזרים וחשבוניות צפויות, ושולחת תזכורת לפני שמשהו מתפספס.",
      color: "#f97316",
    },
  ];

  return (
    <section
      id="features"
      ref={ref}
      style={{
        padding: "90px 1.5rem",
        direction: "rtl",
        background: "linear-gradient(180deg, #0d1224 0%, #0a1020 100%)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              color: "white",
              margin: "0 0 0.75rem",
            }}
          >
            כל מה שצריך, במקום אחד
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.05rem", fontFamily: "Heebo, sans-serif", margin: 0 }}>
            פלטפורמה שלמה לניהול חשבוניות — מהאיסוף ועד שליחה לרו"ח
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {features.map(({ icon, title, desc, color }, i) => (
            <div
              key={i}
              style={{
                background: "#161e36",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18,
                padding: "1.75rem",
                transition: "transform 0.25s, box-shadow 0.25s, border-color 0.25s",
                cursor: "default",
                opacity: visible ? 1 : 0,
                transitionDelay: `${i * 0.06}s`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${color}25`;
                (e.currentTarget as HTMLDivElement).style.borderColor = `${color}50`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  marginBottom: "1rem",
                }}
              >
                {icon}
              </div>
              <h3
                style={{
                  fontFamily: "Heebo, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "white",
                  margin: "0 0 0.6rem",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontFamily: "Heebo, sans-serif",
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ──────────────────────────────────────────── */
function HowItWorksSection() {
  const { ref, visible } = useInView();
  const steps = [
    {
      num: "01",
      title: "מתחברים",
      desc: "מחברים מייל + מספר וואטסאפ ייעודי בלחיצת כפתור — הגדרה של 5 דקות",
      color: "#4361ee",
    },
    {
      num: "02",
      title: "המערכת סורקת",
      desc: "עד 4 שנים אחורה, מזהה חשבוניות, מסווגת ומסדרת — הכל אוטומטי",
      color: "#2dd4bf",
    },
    {
      num: "03",
      title: "הכל מוכן",
      desc: "דשבורד חי, דוח חודשי לרו\"ח, ועוזר AI שעונה על כל שאלה — מרגע ראשון",
      color: "#a855f7",
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={ref}
      style={{
        padding: "90px 1.5rem",
        direction: "rtl",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              color: "white",
              margin: "0 0 0.75rem",
            }}
          >
            איך זה עובד?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.05rem", fontFamily: "Heebo, sans-serif", margin: 0 }}>
            שלושה שלבים ומתחילים לחסוך זמן
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "2rem",
          }}
        >
          {steps.map(({ num, title, desc, color }, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(30px)",
                transition: `opacity 0.6s ease ${i * 0.15}s, transform 0.6s ease ${i * 0.15}s`,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: `${color}18`,
                  border: `2px solid ${color}60`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                  boxShadow: `0 0 30px ${color}25`,
                }}
              >
                <span
                  style={{
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 900,
                    fontSize: "1.4rem",
                    color,
                  }}
                >
                  {num}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: "Heebo, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  color: "white",
                  margin: "0 0 0.75rem",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontFamily: "Heebo, sans-serif",
                  fontSize: "0.95rem",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing Section ───────────────────────────────────────── */
function PricingSection() {
  const { ref, visible } = useInView();
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "בסיסי",
      monthlyPrice: 59,
      annualPrice: 45,
      forWhom: "עסקים קטנים",
      highlight: false,
      features: [
        "עד 65 חשבוניות/חודש",
        "5 משתמשים",
        "10 מספרי וואטסאפ",
        "עוזר AI",
        "מיילים ללא הגבלה",
        "היסטוריה שנה אחורה",
      ],
    },
    {
      name: "פלוס",
      monthlyPrice: 89,
      annualPrice: 67,
      forWhom: "עסק בינוני",
      highlight: false,
      features: [
        "עד 200 חשבוניות/חודש",
        "כל מה שב\"בסיסי\"",
        "אינטגרציה להנה\"ח",
        "תזכורות ספקים",
        "תמיכה בעדיפות",
      ],
    },
    {
      name: "עסקי",
      monthlyPrice: 124,
      annualPrice: 93,
      forWhom: "עסקים בצמיחה",
      highlight: true,
      badge: "הכי פופולרי",
      features: [
        "עד 500 חשבוניות/חודש",
        "כל מה שב\"פלוס\"",
        "AI + דוחות מתקדמים",
        "היסטוריה 4 שנים",
        "תמיכה בעדיפות גבוהה",
      ],
    },
    {
      name: "אנטרפרייז",
      monthlyPrice: null,
      annualPrice: null,
      forWhom: "עסקים גדולים",
      highlight: false,
      features: [
        "ללא הגבלת חשבוניות",
        "כל מה שב\"עסקי\"",
        "ליווי והטמעה מלאה",
        "SLA מותאם אישית",
        "מנהל חשבון ייעודי",
      ],
    },
  ];

  return (
    <section
      id="pricing"
      ref={ref}
      style={{
        padding: "90px 1.5rem",
        direction: "rtl",
        background: "linear-gradient(180deg, #0a1020 0%, #0d1224 100%)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2
            style={{
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              color: "white",
              margin: "0 0 0.75rem",
            }}
          >
            מחירים שקופים, ללא הפתעות
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.05rem", fontFamily: "Heebo, sans-serif", margin: "0 0 2rem" }}>
            14 יום ניסיון חינם בכל המסלולים — ללא כרטיס אשראי
          </p>

          {/* Toggle */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "#161e36",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 100,
              padding: "0.35rem",
              fontFamily: "Heebo, sans-serif",
              fontSize: "0.9rem",
            }}
          >
            <button
              onClick={() => setAnnual(false)}
              style={{
                background: !annual ? "#4361ee" : "transparent",
                color: !annual ? "white" : "rgba(255,255,255,0.6)",
                border: "none",
                borderRadius: 100,
                padding: "0.45rem 1.25rem",
                cursor: "pointer",
                fontFamily: "Heebo, sans-serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              חודשי
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                background: annual ? "#4361ee" : "transparent",
                color: annual ? "white" : "rgba(255,255,255,0.6)",
                border: "none",
                borderRadius: 100,
                padding: "0.45rem 1.25rem",
                cursor: "pointer",
                fontFamily: "Heebo, sans-serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              שנתי
              <span
                style={{
                  background: "#2dd4bf20",
                  color: "#2dd4bf",
                  border: "1px solid #2dd4bf40",
                  borderRadius: 100,
                  padding: "0.1rem 0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                חיסכון 25%
              </span>
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "1.25rem",
            alignItems: "stretch",
          }}
        >
          {plans.map(({ name, monthlyPrice, annualPrice, forWhom, highlight, badge, features }, i) => {
            const price = annual ? annualPrice : monthlyPrice;
            return (
              <div
                key={i}
                style={{
                  background: highlight ? "linear-gradient(160deg, #1e2d5a, #1a2348)" : "#161e36",
                  border: highlight
                    ? "1.5px solid #4361ee80"
                    : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 20,
                  padding: "2rem 1.5rem",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: highlight ? "0 0 40px rgba(67,97,238,0.25)" : "none",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`,
                }}
              >
                {badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      right: "50%",
                      transform: "translateX(50%)",
                      background: "linear-gradient(135deg, #4361ee, #2dd4bf)",
                      color: "white",
                      fontFamily: "Heebo, sans-serif",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      padding: "0.3rem 1rem",
                      borderRadius: 100,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {badge}
                  </div>
                )}

                <div style={{ marginBottom: "1.5rem" }}>
                  <h3
                    style={{
                      fontFamily: "Heebo, sans-serif",
                      fontWeight: 800,
                      fontSize: "1.2rem",
                      color: "white",
                      margin: "0 0 0.3rem",
                    }}
                  >
                    {name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", fontFamily: "Heebo, sans-serif" }}>
                    {forWhom}
                  </p>
                </div>

                <div style={{ marginBottom: "1.75rem" }}>
                  {price !== null ? (
                    <>
                      <span
                        style={{
                          fontFamily: "Heebo, sans-serif",
                          fontWeight: 900,
                          fontSize: "2.4rem",
                          color: "white",
                        }}
                      >
                        ₪{price}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", fontFamily: "Heebo, sans-serif" }}>
                        {" "}/חודש
                      </span>
                      {annual && (
                        <div style={{ fontSize: "0.8rem", color: "#2dd4bf", fontFamily: "Heebo, sans-serif", marginTop: "0.25rem" }}>
                          חיוב שנתי — ₪{price * 12}/שנה
                        </div>
                      )}
                    </>
                  ) : (
                    <span
                      style={{
                        fontFamily: "Heebo, sans-serif",
                        fontWeight: 900,
                        fontSize: "1.7rem",
                        color: "white",
                      }}
                    >
                      הצעת מחיר
                    </span>
                  )}
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    margin: "0 0 2rem",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    flexGrow: 1,
                  }}
                >
                  {features.map((f, fi) => (
                    <li
                      key={fi}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.6rem",
                        fontFamily: "Heebo, sans-serif",
                        fontSize: "0.88rem",
                        color: "rgba(255,255,255,0.75)",
                      }}
                    >
                      <span style={{ color: "#2dd4bf", flexShrink: 0, marginTop: 2, fontWeight: 700 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={SIGNUP_URL}
                  style={{
                    display: "block",
                    textAlign: "center",
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "white",
                    textDecoration: "none",
                    padding: "0.8rem 1.5rem",
                    borderRadius: 12,
                    background: highlight
                      ? "linear-gradient(135deg, #4361ee, #6474f0)"
                      : "rgba(67,97,238,0.15)",
                    border: highlight ? "none" : "1px solid rgba(67,97,238,0.3)",
                    transition: "all 0.2s",
                    boxShadow: highlight ? "0 6px 20px rgba(67,97,238,0.35)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {price !== null ? "התחל ניסיון חינם" : "צור קשר"}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ Section ───────────────────────────────────────────── */
function FaqSection() {
  const { ref, visible } = useInView();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: "איך המערכת סורקת חשבוניות מהמייל?",
      a: "מתחברים ל-Gmail/Outlook בלחיצה אחת — חיבור מאובטח לחלוטין. ה-AI סורק, מזהה ומסווג כל חשבונית אוטומטית, בלי לגעת בהודעות פרטיות.",
    },
    {
      q: "מה העוזר ה-AI יודע לעשות בדיוק?",
      a: "שואלים אותו כל שאלה על ההוצאות — הוא מייצר דוחות, מסכם לפי תקופה/ספק/קטגוריה, ומזכיר דברים שכבר אמרתם לו בעבר, כך שהוא \"מכיר\" את העסק שלכם.",
    },
    {
      q: "איך מתחברים את הוואטסאפ?",
      a: "מחברים מספר פעם אחת. מאז, כל קבלה שמצלמים או קובץ שנשלח — מתעבד אוטומטית ועולה למערכת.",
    },
    {
      q: "איך הדוח מגיע לרואה החשבון?",
      a: "בכל חודש נשלח דוח מסודר למייל של רואה החשבון, עם כל החשבוניות מסווגות, כולל PDF, Excel ו-CSV.",
    },
    {
      q: "עם אילו תוכנות הנהלת חשבונות אתם עובדים?",
      a: "iCount, חשבונית ירוקה, Morning ועוד — הרשימה מתעדכנת כל הזמן.",
    },
    {
      q: "האם יש ניסיון חינם?",
      a: "כן, 14 יום, ללא כרטיס אשראי. ביטול בלחיצה אחת.",
    },
    {
      q: "האם המידע שלי מאובטח?",
      a: "כן — הצפנה מקצה לקצה, תקני אבטחה מחמירים, והמידע לא משותף עם גורם חיצוני.",
    },
    {
      q: "מה קורה אם אני מבטל?",
      a: "הנתונים נשארים זמינים להורדה 90 יום. בלי שיחות שכנוע.",
    },
  ];

  return (
    <section
      id="faq"
      ref={ref}
      style={{
        padding: "90px 1.5rem",
        direction: "rtl",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2
            style={{
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              color: "white",
              margin: "0 0 0.75rem",
            }}
          >
            שאלות נפוצות
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.05rem", fontFamily: "Heebo, sans-serif", margin: 0 }}>
            לא מצאתם תשובה? <a href="mailto:hello@billibot.ai" style={{ color: "#4361ee", textDecoration: "none" }}>כתבו לנו</a>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {faqs.map(({ q, a }, i) => (
            <div
              key={i}
              style={{
                background: "#161e36",
                border: openIdx === i ? "1px solid rgba(67,97,238,0.35)" : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  gap: "1rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "white",
                    textAlign: "right",
                    flex: 1,
                  }}
                >
                  {q}
                </span>
                <span
                  style={{
                    color: openIdx === i ? "#4361ee" : "rgba(255,255,255,0.4)",
                    fontSize: "1.2rem",
                    fontWeight: 300,
                    transition: "transform 0.25s, color 0.2s",
                    display: "inline-block",
                    transform: openIdx === i ? "rotate(45deg)" : "rotate(0deg)",
                    flexShrink: 0,
                  }}
                >
                  +
                </span>
              </button>
              {openIdx === i && (
                <div
                  style={{
                    padding: "0 1.5rem 1.25rem",
                    fontFamily: "Heebo, sans-serif",
                    fontSize: "0.95rem",
                    color: "rgba(255,255,255,0.65)",
                    lineHeight: 1.75,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "1rem",
                    marginTop: 0,
                  }}
                >
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Section ───────────────────────────────────────────── */
function CtaSection() {
  const { ref, visible } = useInView();
  return (
    <section
      ref={ref}
      style={{
        padding: "90px 1.5rem",
        direction: "rtl",
        textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          background: "linear-gradient(160deg, #1a2348 0%, #161e36 100%)",
          border: "1.5px solid rgba(67,97,238,0.25)",
          borderRadius: 24,
          padding: "4rem 2rem",
          boxShadow: "0 0 80px rgba(67,97,238,0.15), 0 0 160px rgba(45,212,191,0.06)",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(67,97,238,0.35) 0%, transparent 70%)",
            margin: "0 auto 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3rem",
          }}
        >
          🤖
        </div>

        <h2
          style={{
            fontFamily: "Heebo, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)",
            color: "white",
            margin: "0 0 1rem",
            lineHeight: 1.3,
          }}
        >
          מוכנים שהעוזר החכם שלכם יתחיל לעבוד?
        </h2>
        <p
          style={{
            fontFamily: "Heebo, sans-serif",
            fontSize: "1.05rem",
            color: "rgba(255,255,255,0.6)",
            margin: "0 0 2.5rem",
            lineHeight: 1.7,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          נסו את BILLIBOT 14 יום בחינם. בלי כרטיס אשראי, ביטול בלחיצה.
        </p>
        <a
          href={SIGNUP_URL}
          style={{
            fontFamily: "Heebo, sans-serif",
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "white",
            textDecoration: "none",
            padding: "1rem 2.5rem",
            borderRadius: 14,
            background: "linear-gradient(135deg, #4361ee, #6474f0)",
            boxShadow: "0 8px 28px rgba(67,97,238,0.5)",
            display: "inline-block",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 12px 36px rgba(67,97,238,0.65)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 28px rgba(67,97,238,0.5)";
          }}
        >
          התחל ניסיון חינם
        </a>
        <p
          style={{
            fontFamily: "Heebo, sans-serif",
            fontSize: "0.83rem",
            color: "rgba(255,255,255,0.35)",
            marginTop: "1rem",
            marginBottom: 0,
          }}
        >
          ללא כרטיס אשראי · ביטול בלחיצה · תמיכה בעברית
        </p>
      </div>
    </section>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div
      id="top"
      style={{
        backgroundColor: "#0d1224",
        minHeight: "100vh",
        direction: "rtl",
        fontFamily: "Heebo, sans-serif",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Grid background — fixed, covers entire page */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(circle, rgba(67,97,238,0.22) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      {/* Ambient blobs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "60vw",
            height: "60vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(67,97,238,0.12) 0%, transparent 70%)",
            top: "-10%",
            right: "-10%",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "50vw",
            height: "50vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(45,212,191,0.07) 0%, transparent 70%)",
            bottom: "20%",
            left: "-10%",
            filter: "blur(80px)",
          }}
        />
      </div>
      {/* All content sits above the grid */}
      <div style={{ position: "relative", zIndex: 1 }}>
      <Header />
      <VideoSection />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <Footer />
      </div>
    </div>
  );
}
