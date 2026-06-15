import { useState, useEffect } from "react";

const SIGNUP_URL = "/login";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        left: 0,
        zIndex: 100,
        transition: "all 0.3s ease",
        backgroundColor: scrolled ? "rgba(13,18,36,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(67,97,238,0.15)" : "1px solid transparent",
        padding: "0 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2rem",
        }}
      >
        {/* Logo */}
        <a
          href="#top"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #4361ee, #2dd4bf)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 900,
              color: "white",
              fontFamily: "Heebo, sans-serif",
              boxShadow: "0 0 16px rgba(67,97,238,0.45)",
            }}
          >
            B
          </div>
          <span
            style={{
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: "1.15rem",
              color: "white",
              letterSpacing: "-0.5px",
            }}
          >
            BILLIBOT
            <span style={{ color: "#2dd4bf" }}>+</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            flexGrow: 1,
            justifyContent: "center",
          }}
          className="desktop-nav"
        >
          {[
            { label: "פיצ'רים", id: "features" },
            { label: "איך זה עובד", id: "how-it-works" },
            { label: "מחירים", id: "pricing" },
            { label: "שאלות נפוצות", id: "faq" },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.75)",
                cursor: "pointer",
                fontFamily: "Heebo, sans-serif",
                fontSize: "0.95rem",
                fontWeight: 500,
                padding: "0.25rem 0.5rem",
                borderRadius: 6,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
          <a
            href={SIGNUP_URL}
            style={{
              fontFamily: "Heebo, sans-serif",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              textDecoration: "none",
              padding: "0.45rem 0.9rem",
              borderRadius: 8,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
          >
            התחברות
          </a>
          <a
            href={SIGNUP_URL}
            style={{
              fontFamily: "Heebo, sans-serif",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "white",
              textDecoration: "none",
              padding: "0.5rem 1.2rem",
              borderRadius: 10,
              background: "linear-gradient(135deg, #4361ee, #6474f0)",
              boxShadow: "0 4px 14px rgba(67,97,238,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(67,97,238,0.55)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(67,97,238,0.4)";
            }}
          >
            נסו בחינם
          </a>

          {/* Mobile hamburger */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "0.3rem",
              display: "none",
            }}
            aria-label="תפריט"
          >
            <div style={{ width: 22, height: 2, background: "currentColor", marginBottom: 5, borderRadius: 2, transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <div style={{ width: 22, height: 2, background: "currentColor", marginBottom: 5, borderRadius: 2, opacity: menuOpen ? 0 : 1 }} />
            <div style={{ width: 22, height: 2, background: "currentColor", borderRadius: 2, transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            backgroundColor: "rgba(13,18,36,0.98)",
            borderTop: "1px solid rgba(67,97,238,0.15)",
            padding: "1rem 1.5rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {[
            { label: "פיצ'רים", id: "features" },
            { label: "איך זה עובד", id: "how-it-works" },
            { label: "מחירים", id: "pricing" },
            { label: "שאלות נפוצות", id: "faq" },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontFamily: "Heebo, sans-serif",
                fontSize: "1rem",
                fontWeight: 500,
                padding: "0.6rem 0",
                textAlign: "right",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {label}
            </button>
          ))}
          <a
            href={SIGNUP_URL}
            style={{
              marginTop: "0.5rem",
              fontFamily: "Heebo, sans-serif",
              fontSize: "1rem",
              fontWeight: 700,
              color: "white",
              textDecoration: "none",
              padding: "0.7rem 1.5rem",
              borderRadius: 10,
              background: "linear-gradient(135deg, #4361ee, #6474f0)",
              textAlign: "center",
            }}
          >
            נסו בחינם
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </header>
  );
}
