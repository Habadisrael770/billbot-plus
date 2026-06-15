export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: "#080e1e",
        borderTop: "1px solid rgba(67,97,238,0.12)",
        padding: "3rem 1.5rem 2rem",
        fontFamily: "Heebo, sans-serif",
        direction: "rtl",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "3rem",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
          }}
        >
          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #4361ee, #2dd4bf)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 17,
                  color: "white",
                }}
              >
                B
              </div>
              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "white" }}>
                BILLIBOT<span style={{ color: "#2dd4bf" }}>+</span>
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>
              אוטומציה חכמה לחשבוניות עסקיות — אוספת, מסדרת ושולחת לרואה חשבון. בלי הפתעות, בלי ניירת.
            </p>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap" }}>
            <div>
              <h4 style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.9rem", margin: "0 0 0.9rem" }}>
                מוצר
              </h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  { label: "פיצ\'רים", href: "#features" },
                  { label: "מחירים", href: "#pricing" },
                  { label: "שאלות נפוצות", href: "#faq" },
                  { label: "נסו בחינם", href: "/login" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#2dd4bf")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.9rem", margin: "0 0 0.9rem" }}>
                חברה
              </h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  { label: "צור קשר", href: "mailto:hello@billibot.ai" },
                  { label: "פרטיות", href: "#" },
                  { label: "תנאי שימוש", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#2dd4bf")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", margin: 0 }}>
            © {year} BILLIBOT+ — כל הזכויות שמורות
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", margin: 0 }}>
            מיוצר עם ❤️ לעסקים קטנים ובינוניים בישראל
          </p>
        </div>
      </div>
    </footer>
  );
}
