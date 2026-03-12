import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Mail, FileText, Eye, HardDrive, MessageCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

interface CheckItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  done: boolean;
  href?: string;
}

export function OptimizeWidget({ invoiceCount = 0 }: { invoiceCount?: number }) {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [driveConnected] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [viewedReceipts] = useState(() => !!localStorage.getItem("bb_viewed_expenses"));
  const [collapsed, setCollapsed] = useState(() => !!localStorage.getItem("bb_optimize_collapsed"));

  useEffect(() => {
    fetch(`${API_BASE}/email-connectors`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.some((c: { status: string }) => c.status === "connected")) {
          setGmailConnected(true);
        }
      })
      .catch(() => {});

    fetch(`${API_BASE}/whatsapp/status`)
      .then((r) => r.json())
      .then((d) => setWhatsappConnected(d?.configured === true))
      .catch(() => {});
  }, []);

  const items: CheckItem[] = [
    {
      id: "mailbox",
      label: "חבר תיבת דואר",
      desc: "חבר Gmail או Outlook לסריקה אוטומטית",
      icon: <Mail className="w-4 h-4" />,
      done: gmailConnected,
      href: "/settings",
    },
    {
      id: "docs",
      label: "הוסף מסמכים",
      desc: "העלה חשבונית ראשונה למערכת",
      icon: <FileText className="w-4 h-4" />,
      done: invoiceCount > 0,
    },
    {
      id: "view",
      label: "צפה בקבלות",
      desc: "כנס לעמוד ההוצאות וצפה ברשומות",
      icon: <Eye className="w-4 h-4" />,
      done: viewedReceipts,
      href: "/expenses",
    },
    {
      id: "drive",
      label: "חבר Google Drive",
      desc: "שמור קבלות אוטומטית ב-Drive",
      icon: <HardDrive className="w-4 h-4" />,
      done: driveConnected,
      href: "/settings",
    },
    {
      id: "whatsapp",
      label: "שילוב WhatsApp",
      desc: "סרוק קבלות דרך WhatsApp",
      icon: <MessageCircle className="w-4 h-4" />,
      done: whatsappConnected,
      href: "/settings",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  if (pct === 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel rounded-2xl overflow-hidden"
      dir="rtl"
    >
      {/* Header */}
      <button
        onClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          if (next) localStorage.setItem("bb_optimize_collapsed", "1");
          else localStorage.removeItem("bb_optimize_collapsed");
        }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">אופטמיז את החשבון שלך</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doneCount} מתוך {items.length} צעדים הושלמו — {pct}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="hidden sm:block w-32 h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
            />
          </div>
          <span className="text-xs font-bold text-primary w-8 text-left">{pct}%</span>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Checklist */}
      {!collapsed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-white/8"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 p-4">
            {items.map((item, idx) => (
              <motion.a
                key={item.id}
                href={item.href ?? "#"}
                onClick={item.id === "view" ? () => localStorage.setItem("bb_viewed_expenses", "1") : undefined}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all group cursor-pointer ${
                  item.done
                    ? "bg-emerald-500/8 border-emerald-500/20 opacity-60"
                    : "bg-white/4 border-white/10 hover:bg-white/8 hover:border-primary/30"
                }`}
              >
                {/* Icon + checkmark */}
                <div
                  className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors ${
                    item.done
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/8 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                  }`}
                >
                  {item.done ? <Check className="w-4 h-4" /> : item.icon}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold leading-snug ${
                      item.done ? "text-emerald-400 line-through" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
