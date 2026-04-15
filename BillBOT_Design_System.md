# BillBOT+ Design System — Full Spec for Replit Apps

> Copy-paste this entire document into a new Replit chat to replicate the exact design.
> Stack: React + Vite + Tailwind v4 + Framer Motion + Lucide React + Heebo font

---

## 1. FONT

```css
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
```

- **Primary font:** `Heebo` (Hebrew-first, RTL-friendly)
- **Direction:** `rtl`, `text-align: right`
- **Base size:** 14px body, 13px UI elements, 11px labels/badges

---

## 2. COLOR TOKENS — CSS Custom Properties

### Dark Mode (default `:root`)

```css
:root {
  /* Backgrounds */
  --background:  225 44% 11%;   /* #0d1224 — deep navy page bg */
  --card:        226 38% 15%;   /* #161e36 — card surface */
  --elevated:    225 38% 18%;   /* #1a2340 — hover / dropdown bg */
  --sidebar:     228 52% 13%;   /* #0f1533 — sidebar bg */

  /* Foregrounds */
  --foreground:       210 40% 97%;  /* near white */
  --card-foreground:  210 40% 97%;
  --muted-foreground: 215 20% 60%;  /* subdued text */

  /* Borders */
  --border:     226 30% 22%;
  --card-border: 226 30% 22%;

  /* Brand Colors */
  --primary:    228 82% 60%;   /* #4361ee — electric blue */
  --teal:       174 64% 50%;   /* #2dd4bf — teal accent */

  /* Semantic */
  --destructive: 4 86% 58%;    /* red */
  --success:     160 84% 39%;  /* green */
  --warning:     38 92% 50%;   /* amber */
  --info:        213 94% 68%;  /* sky blue */
  --purple:      262 83% 58%;  /* violet */

  /* Charts */
  --chart-1: 228 82% 60%;   /* blue */
  --chart-2: 174 64% 50%;   /* teal */
  --chart-3: 38 92% 50%;    /* amber */
  --chart-4: 4 86% 58%;     /* red */
  --chart-5: 262 83% 58%;   /* purple */

  /* Shadows */
  --shadow-card:     0 2px 16px rgb(0 0 0 / 0.35);
  --shadow-btn:      0 4px 12px rgb(67 97 238 / 0.30);
  --shadow-dropdown: 0 8px 24px rgb(0 0 0 / 0.35);
  --shadow-sm:       0 2px 12px rgb(0 0 0 / 0.35);
  --shadow-lg:       0 8px 16px rgb(0 0 0 / 0.40), 0 4px 6px -1px rgb(0 0 0 / 0.30);

  /* Border Radius */
  --radius: 0.875rem;           /* base = 14px */
  --radius-card:  14px;
  --radius-btn:   10px;
  --radius-input: 8px;
  --radius-badge: 20px;
}
```

### Light Mode (`html.light`)

```css
html.light {
  --background:  225 25% 95%;  /* #f0f2f8 — soft blue-white */
  --card:        0 0% 100%;    /* pure white cards */
  --elevated:    217 100% 99%; /* #f8faff */
  --sidebar:     225 25% 95%;  /* same as page bg */

  --foreground:       227 37% 16%;
  --card-foreground:  227 37% 16%;
  --muted-foreground: 220 9% 54%;

  --border:     232 22% 91%;
  --card-border: 232 22% 91%;

  --primary:    228 82% 60%;   /* same brand blue */
  --teal:       174 64% 44%;   /* slightly darker for contrast */

  --shadow-card:     0 2px 12px rgb(0 0 0 / 0.07);
  --shadow-btn:      0 4px 12px rgb(67 97 238 / 0.30);
  --shadow-dropdown: 0 8px 24px rgb(0 0 0 / 0.12);
  --shadow-sm:       0 2px 12px rgb(0 0 0 / 0.07);
}
```

---

## 3. HEX REFERENCE (quick lookup)

| Token       | Hex       | Use                        |
|-------------|-----------|----------------------------|
| Primary     | `#4361ee` | Buttons, active nav, rings |
| Teal        | `#2dd4bf` | Secondary accent, success  |
| Background  | `#0d1224` | Page background (dark)     |
| Card        | `#161e36` | Card surfaces (dark)       |
| Elevated    | `#1a2340` | Hover states, dropdowns    |
| Sidebar     | `#0f1533` | Sidebar background         |
| Destructive | `#ef4444` | Errors, delete             |
| Success     | `#10b981` | Confirmed, approved        |
| Warning     | `#f59e0b` | Pending, alerts            |
| Purple      | `#8b5cf6` | Upgrade CTA, premium       |

---

## 4. TAILWIND v4 THEME SETUP

```css
/* In index.css */
@import "tailwindcss";

@theme inline {
  --color-background:   hsl(var(--background));
  --color-foreground:   hsl(var(--foreground));
  --color-card:         hsl(var(--card));
  --color-border:       hsl(var(--border));
  --color-primary:      hsl(var(--primary));
  --color-teal:         hsl(var(--teal));
  --color-muted:        hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-elevated:     hsl(var(--elevated));
  --color-sidebar:      hsl(var(--sidebar));
  --color-destructive:  hsl(var(--destructive));
  --color-success:      hsl(var(--success));
  --color-warning:      hsl(var(--warning));
  --color-purple:       hsl(var(--purple));

  --font-sans: 'Heebo', sans-serif;

  --radius-card:  14px;
  --radius-btn:   10px;
  --radius-input: 8px;
  --radius-badge: 20px;
}
```

---

## 5. SIDEBAR — Full Structure & Design

### Nav Items (Primary)

```tsx
const PRIMARY_NAV = [
  {
    href: "/",
    icon: LayoutDashboard,
    label: "דשבורד",
    desc: "סקירה כללית ותזרים",
    color: "text-primary",            // blue icon
    bg: "rgba(75,126,245,0.08)",
    border: "rgba(75,126,245,0.25)",
  },
  {
    href: "/expenses",
    icon: Receipt,
    label: "הוצאות",
    desc: "חשבוניות ותשלומים",
    color: "text-teal",               // teal icon
    bg: "rgba(45,212,191,0.08)",
    border: "rgba(45,212,191,0.25)",
  },
  {
    href: "/suppliers",
    icon: Building2,
    label: "ספקים",
    desc: "ניהול ספקים וקשרים",
    color: "text-amber-400",          // amber icon
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.25)",
  },
  {
    href: "/export",
    icon: SendHorizonal,
    label: 'ייצוא לרו"ח',
    desc: "שליחת דוחות לרואה חשבון",
    color: "text-violet-400",         // purple icon
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.25)",
  },
  {
    href: "/integrations",
    icon: Zap,
    label: "אינטגרציות",
    desc: "Gmail, Telegram, API",
    color: "text-rose-400",           // rose icon
    bg: "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.25)",
  },
];

const SECONDARY_NAV = [
  {
    href: "/settings",
    icon: Settings,
    label: "הגדרות",
    desc: "העדפות ופרטי חשבון",
    color: "text-slate-400",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.25)",
  },
  {
    href: "/help",
    icon: HelpCircle,
    label: "עזרה",
    desc: "תמיכה ומדריכים",
    color: "text-sky-400",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
  },
];
```

### Desktop Sidebar Dimensions

| Property       | Value            |
|----------------|------------------|
| Width (full)   | `256px` (w-64)   |
| Width (compact)| `64px` (w-16)    |
| Logo height    | `56px` (h-14)    |
| Item height    | `~44px` (py-2.5) |
| Item padding   | `px-3 py-2.5`    |
| Item radius    | `10px`           |
| Item gap       | `gap-3`          |
| Icon size      | `w-5 h-5`        |

### Desktop Nav Item CSS Classes

```css
/* index.css — @layer components */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 200ms ease;
}
.nav-item:hover {
  background-color: hsl(var(--elevated));
  color: hsl(var(--foreground));
}

.nav-item-active {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--primary));
  background-color: rgb(67 97 238 / 0.10);
  cursor: pointer;
  transition: all 200ms ease;
}
```

### Mobile Sidebar (Bottom Sheet / Drawer)

**Trigger:** hamburger icon `Menu` (w-5 h-5) in top navbar  
**Animation:** slides in from left, backdrop blur `bg-black/60 backdrop-blur-sm`

```tsx
// Mobile nav item card — each route gets a full card
<Link
  href={item.href}
  className="flex items-center gap-[14px] rounded-[14px] transition-all active:scale-[0.97] w-full"
  style={{
    padding: "14px 16px",
    background: active
      ? `${item.bg}` // tinted with route color
      : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${active ? item.border : "rgba(255,255,255,0.10)"}`,
    boxShadow: active
      ? `0 0 0 2px ${item.border.replace("0.25", "0.26")}, 0 1px 4px rgba(0,0,0,0.06)`
      : "none",
  }}
>
  {/* Icon container */}
  <div
    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
    style={{
      background: item.bg,
      border: `1.5px solid ${item.border.replace("0.25", "0.33")}`,
    }}
  >
    <item.icon className={`w-[22px] h-[22px] ${item.color}`} />
  </div>

  {/* Text */}
  <div className="flex-1 min-w-0 text-right">
    <p className="text-[15px] font-bold text-white leading-tight mb-[2px]">{item.label}</p>
    <p className="text-[12px] text-white/50 truncate">{item.desc}</p>
  </div>

  {/* Arrow */}
  <ChevronRight className={`w-[18px] h-[18px] shrink-0 rotate-180 ${item.color}`} />
</Link>
```

### Mobile Card Stagger Animation (Framer Motion)

```tsx
// Each card enters with staggered delay
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.06, duration: 0.22 }}
>
  {/* nav card */}
</motion.div>
```

### Mobile Sidebar Header (User Panel)

```tsx
// Dark gradient header behind user info
<div
  style={{
    background: "linear-gradient(135deg, #0d1637 0%, #111c42 50%, #0d1a34 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.09)",
  }}
>
  {/* User avatar — initials */}
  <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-primary/40 to-teal/20 border border-primary/25 flex items-center justify-center">
    <User className="w-7 h-7 text-white" />
  </div>

  {/* Online indicator */}
  <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#1a1d3a]" />

  {/* Name */}
  <p className="text-[24px] font-black text-white truncate leading-tight">{userName}</p>

  {/* Plan badge */}
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white bg-primary/60">
    חינם
  </span>
</div>
```

---

## 6. TOP NAVBAR

```
Height:       h-14 (56px)
Background:   bg-card + border-b border-border
Position:     fixed top-0 left-0 right-0 z-50
Shadow:       var(--shadow-sm)
Padding:      px-6
```

**Left side:** Logo (`BillBOT+` — gradient text `from-violet-500 to-blue-500`, font-black)  
**Center:** Search bar (desktop only)  
**Right side:** Theme toggle + user dropdown avatar

### Logo Style

```tsx
<span className="font-black text-[20px] bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
  BillBOT+
</span>
```

---

## 7. COMPONENT CLASSES

### Cards

```css
.card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.stat-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 14px 20px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
```

### Buttons

```css
/* Primary */
.btn-primary {
  background: hsl(var(--primary));
  color: white;
  font-weight: 700;
  font-size: 13px;
  padding: 12px 20px;
  border-radius: 10px;
  box-shadow: var(--shadow-btn); /* 0 4px 12px rgb(67 97 238 / 0.30) */
  transition: all 200ms;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:active { transform: scale(0.95); }

/* Secondary */
.btn-secondary {
  background: transparent;
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
  font-size: 13px;
  padding: 12px 20px;
  border-radius: 10px;
  transition: all 200ms;
}
.btn-secondary:hover { background: hsl(var(--elevated)); }

/* Gradient CTA (used in scan button, upgrade, etc.) */
background: linear-gradient(90deg, #4361ee, #2dd4bf);
```

### Badges

```css
/* Base */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

.badge-primary  { background: rgb(67 97 238 / 0.12);  color: #4361ee; }
.badge-teal     { background: rgb(45 212 191 / 0.12); color: #2dd4bf; }
.badge-warning  { background: rgb(245 158 11 / 0.12); color: #f59e0b; }
.badge-error    { background: rgb(239 68 68 / 0.12);  color: #ef4444; }
.badge-success  { background: rgb(16 185 129 / 0.12); color: #10b981; }
.badge-inactive { background: hsl(var(--muted));       color: hsl(var(--muted-foreground)); }
```

### Icon Containers (colored icon badges)

```css
.icon-teal   { background: rgb(45 212 191 / 0.12); color: #2dd4bf; }
.icon-blue   { background: rgb(67 97 238 / 0.12);  color: #4361ee; }
.icon-purple { background: rgb(139 92 246 / 0.12); color: #8b5cf6; }
.icon-yellow { background: rgb(245 158 11 / 0.12); color: #f59e0b; }
.icon-red    { background: rgb(239 68 68 / 0.12);  color: #ef4444; }
.icon-green  { background: rgb(16 185 129 / 0.12); color: #10b981; }

/* Usage: */
<div className="w-10 h-10 rounded-[10px] flex items-center justify-center icon-teal">
  <Receipt className="w-5 h-5" />
</div>
```

### Inputs

```css
.input {
  width: 100%;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  color: hsl(var(--foreground));
  text-align: right;
  transition: all 200ms;
}
.input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px rgb(67 97 238 / 0.15);
}

/* Dark mode search bar — neon glow */
html.dark .search-bar {
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 0 2px 14px rgba(67, 97, 238, 0.18);
}
html.dark .search-bar:focus {
  border-color: rgba(255, 255, 255, 0.34);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.20), 0 4px 22px rgba(67, 97, 238, 0.25);
}
```

### Tabs / Pills

```css
.tab-active {
  background: hsl(var(--primary));
  color: white;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
}
.tab-inactive {
  background: transparent;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
}
.tab-inactive:hover { background: hsl(var(--elevated)); }
```

---

## 8. ANIMATIONS

### Page/Dialog Enter (Framer Motion)

```tsx
// Bottom sheet (mobile modals)
initial={{ opacity: 0, y: 40 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 40 }}
transition={{ duration: 0.22, ease: "easeOut" }}

// Cards / list items stagger
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.06, duration: 0.22 }}

// Scale pop (success icons, modals)
initial={{ scale: 0, rotate: -15 }}
animate={{ scale: 1, rotate: 0 }}
transition={{ type: "spring", stiffness: 260, damping: 18 }}

// Fade in only
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.2 }}
```

### Neon Search Border (dark mode only)

```css
@keyframes search-border-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}

.search-shimmer {
  position: relative;
  border-radius: 12px;
  padding: 1.5px;
  overflow: hidden;
  transition: box-shadow 0.35s ease;
}

/* Rotating conic-gradient border — dark only */
.dark .search-shimmer::before,
.dark .search-shimmer::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 220%;
  aspect-ratio: 1 / 1;
  background: conic-gradient(
    from 0deg,
    #4285F4 0%,
    #9b72cb 33%,
    #d96570 66%,
    #4285F4 100%
  );
  animation: search-border-spin 3s linear infinite;
}
.dark .search-shimmer::after {
  filter: blur(10px);
  opacity: 0.45;
}
.search-shimmer > div { position: relative; z-index: 1; }

/* Hover: faster */
.dark .search-shimmer:hover::before,
.dark .search-shimmer:hover::after { animation-duration: 1.6s; }
.dark .search-shimmer:hover {
  box-shadow: 0 0 14px rgba(66,133,244,0.28), 0 0 32px rgba(155,114,203,0.18);
}

/* Focus: max intensity */
.dark .search-shimmer:focus-within::before,
.dark .search-shimmer:focus-within::after { animation-duration: 1.1s; }
.dark .search-shimmer:focus-within {
  box-shadow:
    0 0 18px rgba(66,133,244,0.45),
    0 0 40px rgba(217,101,112,0.25),
    0 0 60px rgba(155,114,203,0.15);
}
```

### Pulsing Glow (used on scan modal icon)

```tsx
// Outer ring pulse
animate={{ scale: [1, 1.14, 1], opacity: [0.3, 0.55, 0.3] }}
transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}

// Inner icon gentle breathe
animate={{ scale: [1, 1.07, 1] }}
transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
```

---

## 9. SCROLLBAR

```css
::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}
```

---

## 10. DARK PANEL UTILITY

For dark-always panels (dialogs, mobile headers) inside a light-mode page:

```css
.dark-panel {
  --foreground: 0 0% 100%;
  --muted-foreground: 0 0% 80%;
  color-scheme: dark;
}
/* Always shows white text even inside html.light */
```

---

## 11. DARK MODAL / DIALOG BACKGROUND

Used for all dialogs (Gmail scan, preview, etc.):

```css
background: linear-gradient(160deg, #090e24 0%, #060c1e 100%);
border: 1.5px solid rgba(67, 97, 238, 0.22);
```

Top accent strip:
```css
background: linear-gradient(90deg, #4361ee 0%, #2dd4bf 100%);
height: 4px;
```

---

## 12. DEPENDENCIES (package.json)

```json
{
  "dependencies": {
    "framer-motion": "^11.x",
    "lucide-react": "^0.4x",
    "tailwindcss": "^4.x",
    "@tailwindcss/typography": "latest",
    "tw-animate-css": "latest",
    "wouter": "^3.x"
  }
}
```

---

## 13. RTL SETUP

```css
html { direction: rtl; scroll-behavior: smooth; }
body { text-align: right; }
```

For LTR content inside RTL (emails, numbers):
```tsx
<span dir="ltr">{email}</span>
```

---

## 14. THEME TOGGLE IMPLEMENTATION

```tsx
// Two states: dark (default) / light
// Stored in localStorage as "bb_theme"
// Applied as class on <html>: html.dark or html.light

const { theme, setTheme } = useTheme();
// theme === "dark" | "light"

// Toggle button
<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
</button>
```

---

*Generated from BillBOT+ Design System — BillBOT_Design_System.md*
