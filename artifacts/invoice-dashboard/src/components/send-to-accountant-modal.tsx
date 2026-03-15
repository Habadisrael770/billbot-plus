import React, { useState, useEffect } from "react";
import {
  X, FileSpreadsheet, Download, Send, Loader2, CheckCircle2,
  Mail, FileText, Archive, Calendar, Clock, ChevronDown, ChevronUp,
  Zap, Bell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendToAccountantModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceCount: number;
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";
const SCHEDULE_KEY = "bb_export_schedule";

type Format = "xlsx" | "pdf" | "zip";
type Method = "download" | "email" | "telegram";
type Frequency = "monthly" | "quarterly" | "weekly";

interface Schedule {
  enabled: boolean;
  frequency: Frequency;
  dayOfMonth: number;
  format: Format;
  method: Method;
  email: string;
  nextRun?: string;
}

function loadSchedule(): Schedule {
  try {
    const s = localStorage.getItem(SCHEDULE_KEY);
    if (s) return JSON.parse(s) as Schedule;
  } catch { /* ignore */ }
  return { enabled: false, frequency: "monthly", dayOfMonth: 1, format: "xlsx", method: "download", email: "" };
}

function saveSchedule(s: Schedule) {
  const next = calcNextRun(s);
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify({ ...s, nextRun: next }));
}

function calcNextRun(s: Schedule): string {
  const now = new Date();
  let next = new Date();
  if (s.frequency === "weekly") {
    next.setDate(now.getDate() + (7 - now.getDay()));
  } else if (s.frequency === "monthly") {
    next = new Date(now.getFullYear(), now.getMonth() + 1, s.dayOfMonth);
  } else {
    const qMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
    next = new Date(now.getFullYear(), qMonth, s.dayOfMonth);
  }
  return next.toLocaleDateString("he-IL");
}

// ── PDF print helper ────────────────────────────────────────────────────────
async function printPDF(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  const res = await fetch(`${API_BASE}/invoices?${params.toString()}`);
  const invoices = await res.json() as Array<Record<string, unknown>>;

  const rows = invoices.map((inv, i) => `
    <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#fff"}">
      <td>${i + 1}</td>
      <td>${inv.invoiceNumber ?? ""}</td>
      <td>${inv.invoiceDate ?? ""}</td>
      <td>${inv.canonicalVendorName ?? inv.rawVendorName ?? ""}</td>
      <td style="direction:ltr">₪${Number(inv.total ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</td>
      <td>${inv.finalCategory ?? inv.suggestedCategory ?? ""}</td>
      <td>${inv.status === "approved" ? "✓" : "⏳"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><title>דוח חשבוניות BillBOT+</title>
<style>
  body{font-family:Arial,sans-serif;direction:rtl;margin:20px;color:#111}
  h1{color:#4361ee;font-size:22px;margin-bottom:4px}
  .sub{color:#666;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#4361ee;color:#fff;padding:8px 10px;text-align:right}
  td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
  .footer{margin-top:24px;font-size:11px;color:#999;text-align:center}
  @media print{body{margin:8px}}
</style>
</head>
<body>
  <h1>דוח חשבוניות BillBOT+</h1>
  <div class="sub">הופק: ${new Date().toLocaleDateString("he-IL")} · ${invoices.length} חשבוניות</div>
  <table>
    <thead><tr><th>#</th><th>מס׳ חשבונית</th><th>תאריך</th><th>ספק</th><th>סכום</th><th>קטגוריה</th><th>סטטוס</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">נוצר אוטומטית ע"י BillBOT+ — מערכת ניהול חשבוניות חכמה</div>
  <script>window.onload=()=>window.print()</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

const FORMAT_OPTIONS: { id: Format; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: "xlsx", label: "אקסל", desc: "קובץ XLSX מפורט עם כל נתוני החשבוניות", icon: <FileSpreadsheet className="w-5 h-5" />, color: "text-emerald-500" },
  { id: "pdf", label: "PDF", desc: "דוח PDF מסודר מוכן להדפסה", icon: <FileText className="w-5 h-5" />, color: "text-rose-500" },
  { id: "zip", label: "ZIP", desc: "אקסל + כל קבצי החשבוניות המקוריים", icon: <Archive className="w-5 h-5" />, color: "text-violet-500" },
];

const METHOD_OPTIONS: { id: Method; label: string; icon: React.ReactNode }[] = [
  { id: "download", label: "הורדה", icon: <Download className="w-4 h-4" /> },
  { id: "email", label: "מייל", icon: <Mail className="w-4 h-4" /> },
  { id: "telegram", label: "טלגרם", icon: <Send className="w-4 h-4" /> },
];

export function SendToAccountantModal({ isOpen, onClose, invoiceCount }: SendToAccountantModalProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<Format>("xlsx");
  const [method, setMethod] = useState<Method>("download");
  const [emailTo, setEmailTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>(loadSchedule);

  useEffect(() => { if (!isOpen) { setDone(false); setLoading(false); } }, [isOpen]);

  const handleClose = () => { setDone(false); onClose(); };

  const buildQueryString = () => {
    const p = new URLSearchParams();
    if (dateFrom) p.append("from", dateFrom);
    if (dateTo) p.append("to", dateTo);
    return p.toString() ? `?${p.toString()}` : "";
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      if (method === "download") {
        if (format === "pdf") {
          await printPDF(dateFrom, dateTo);
          toast({ title: "PDF נפתח", description: "השתמש ב-Ctrl+P להדפסה או שמירה כ-PDF." });
        } else {
          const endpoint = format === "zip" ? "export-zip" : "export";
          const res = await fetch(`${API_BASE}/invoices/${endpoint}${buildQueryString()}`);
          if (!res.ok) throw new Error("שגיאה בייצוא");
          const blob = await res.blob();
          const dateTag = new Date().toLocaleDateString("he-IL").replace(/\//g, "-");
          const ext = format === "zip" ? "zip" : "xlsx";
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url;
          a.download = `חשבוניות_${dateTag}.${ext}`; a.click();
          URL.revokeObjectURL(url);
          toast({ title: "הקובץ הורד", description: `קובץ ${format.toUpperCase()} נשמר בהצלחה.` });
        }
        setDone(true);
      } else if (method === "telegram") {
        const res = await fetch(`${API_BASE}/invoices/send-accountant`, { method: "POST" });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "שגיאת טלגרם");
        setDone(true);
        toast({ title: "נשלח בטלגרם", description: "הדוח נשלח לרואה החשבון." });
      } else if (method === "email") {
        if (!emailTo.trim()) { toast({ title: "נא להזין כתובת מייל", variant: "destructive" }); setLoading(false); return; }
        const res = await fetch(`${API_BASE}/invoices/send-accountant-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toEmail: emailTo.trim(), from: dateFrom || undefined, to: dateTo || undefined }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "שגיאת מייל");
        setDone(true);
        toast({ title: "מייל נשלח", description: `הדוח נשלח ל-${emailTo}` });
      }
    } catch (e) {
      toast({ title: "שגיאה", description: e instanceof Error ? e.message : "שגיאה לא ידועה", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveScheduleHandler = () => {
    saveSchedule(schedule);
    toast({ title: schedule.enabled ? "תזמון נשמר" : "תזמון בוטל", description: schedule.enabled ? `הייצוא הבא: ${calcNextRun(schedule)}` : "" });
    setShowSchedule(false);
  };

  const setPreset = (preset: string) => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    let from = "";
    if (preset === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); from = d.toISOString().split("T")[0]; }
    else if (preset === "quarter") { const d = new Date(now); d.setMonth(d.getMonth() - 3); from = d.toISOString().split("T")[0]; }
    else if (preset === "year") { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); from = d.toISOString().split("T")[0]; }
    setDateFrom(from); setDateTo(to);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">ייצוא לרו"ח</h2>
              <p className="text-xs text-white/40">{invoiceCount} חשבוניות מוכנות לייצוא</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {done ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-400" />
              <p className="text-white font-semibold text-lg">בוצע בהצלחה!</p>
              <p className="text-white/50 text-sm">{method === "download" ? "הקובץ הורד למחשב שלך" : method === "email" ? `נשלח ל-${emailTo}` : "נשלח לטלגרם"}</p>
              <button onClick={handleClose} className="mt-4 h-9 px-6 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">סגור</button>
            </div>
          ) : (
            <>
              {/* Format */}
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">פורמט ייצוא</p>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${format === f.id ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/5 bg-white/3 hover:bg-white/5"}`}
                    >
                      <span className={format === f.id ? f.color : "text-white/40"}>{f.icon}</span>
                      <span className={`text-xs font-semibold ${format === f.id ? "text-white" : "text-white/50"}`}>{f.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/30 mt-1.5 text-center">{FORMAT_OPTIONS.find((f) => f.id === format)?.desc}</p>
              </div>

              {/* Method */}
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">אמצעי שליחה</p>
                <div className="flex gap-2">
                  {METHOD_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-medium transition-all ${method === m.id ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-white/5 bg-white/3 text-white/40 hover:text-white hover:bg-white/5"}`}
                    >
                      {m.icon}{m.label}
                    </button>
                  ))}
                </div>

                {method === "email" && (
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="כתובת מייל של רואה החשבון"
                    className="mt-2 w-full h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
                  />
                )}
              </div>

              {/* Date range */}
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> טווח תאריכים
                </p>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {[{ label: "חודש אחרון", val: "month" }, { label: "רבעון", val: "quarter" }, { label: "שנה", val: "year" }, { label: "הכל", val: "" }].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => p.val ? setPreset(p.val) : (setDateFrom(""), setDateTo(""))}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-white/8 bg-white/3 text-white/50 hover:text-white hover:bg-white/8 transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 block mb-1">מתאריך</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 block mb-1">עד תאריך</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                  </div>
                </div>
              </div>

              {/* Schedule toggle */}
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <button
                  onClick={() => setShowSchedule((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-white font-medium">תזמון אוטומטי</span>
                    {schedule.enabled && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-medium">פעיל · {schedule.nextRun ?? calcNextRun(schedule)}</span>
                    )}
                  </div>
                  {showSchedule ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                </button>

                {showSchedule && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 bg-white/2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">הפעל ייצוא אוטומטי</span>
                      <button
                        onClick={() => setSchedule((s) => ({ ...s, enabled: !s.enabled }))}
                        className={`w-10 h-5 rounded-full transition-all relative ${schedule.enabled ? "bg-amber-500" : "bg-white/10"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${schedule.enabled ? "right-0.5" : "left-0.5"}`} />
                      </button>
                    </div>
                    {schedule.enabled && (
                      <>
                        <div>
                          <label className="text-[10px] text-white/30 block mb-1">תדירות</label>
                          <select
                            value={schedule.frequency}
                            onChange={(e) => setSchedule((s) => ({ ...s, frequency: e.target.value as Frequency }))}
                            className="w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0f0f1a] text-xs text-white focus:outline-none"
                          >
                            <option value="weekly">שבועי</option>
                            <option value="monthly">חודשי</option>
                            <option value="quarterly">רבעוני</option>
                          </select>
                        </div>
                        {schedule.frequency !== "weekly" && (
                          <div>
                            <label className="text-[10px] text-white/30 block mb-1">יום בחודש</label>
                            <input
                              type="number" min={1} max={28} value={schedule.dayOfMonth}
                              onChange={(e) => setSchedule((s) => ({ ...s, dayOfMonth: Number(e.target.value) }))}
                              className="w-full h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-xs text-white focus:outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] text-white/30 block mb-1">מייל לשליחה אוטומטית</label>
                          <input
                            type="email" value={schedule.email}
                            onChange={(e) => setSchedule((s) => ({ ...s, email: e.target.value }))}
                            placeholder="accountant@example.com"
                            className="w-full h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/20 focus:outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ייצוא הבא: {calcNextRun(schedule)}
                        </p>
                      </>
                    )}
                    <button
                      onClick={saveScheduleHandler}
                      className="w-full h-8 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> שמור תזמון
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-5 pb-5 pt-3 border-t border-white/5 shrink-0 flex flex-col gap-2">
            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                method === "download" ? <Download className="w-4 h-4" /> :
                method === "email" ? <Mail className="w-4 h-4" /> :
                <Send className="w-4 h-4" />}
              {loading ? "מכין..." :
                method === "download" ? `הורד ${FORMAT_OPTIONS.find((f) => f.id === format)?.label}` :
                method === "email" ? "שלח במייל" : "שלח לטלגרם"}
            </button>
            <button onClick={handleClose} className="w-full h-9 rounded-xl text-white/30 text-sm hover:text-white/60 transition-colors">ביטול</button>
          </div>
        )}
      </div>
    </div>
  );
}
