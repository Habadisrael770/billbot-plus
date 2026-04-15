import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, CheckCircle2, XCircle, Loader2, Lock,
  MailPlus, CalendarDays, Scan, AlertCircle, FileText,
  PartyPopper, ArrowLeft, SearchX,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListInvoicesQueryKey,
  getGetInvoiceSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

interface GmailStatus {
  connected: boolean;
  email: string | null;
  credentialsConfigured: boolean;
  redirectUri?: string;
}

type DatePreset = "1m" | "3m" | "6m" | "1y" | "all";

type Phase = "idle" | "scanning" | "done";

const DATE_PRESETS: { key: DatePreset; label: string; months?: number }[] = [
  { key: "1m",  label: "חודש אחרון",  months: 1  },
  { key: "3m",  label: "3 חודשים",    months: 3  },
  { key: "6m",  label: "חצי שנה",     months: 6  },
  { key: "1y",  label: "שנה אחורה",   months: 12 },
  { key: "all", label: "הכל",                    },
];

const SCAN_STAGES = [
  { from: 0,  to: 18, label: "מתחבר ל-Gmail..." },
  { from: 18, to: 40, label: "מחפש מיילים עם קבצים..." },
  { from: 40, to: 62, label: "מוריד קבצים..." },
  { from: 62, to: 80, label: "מנתח חשבוניות עם AI..." },
  { from: 80, to: 94, label: "שומר נתונים..." },
];

function getStageLabel(pct: number) {
  for (const s of SCAN_STAGES) {
    if (pct >= s.from && pct < s.to) return s.label;
  }
  return "מסיים...";
}

function isPaidPlan() {
  try {
    const raw = localStorage.getItem("bb_onboarding_progress");
    if (!raw) return false;
    const p = JSON.parse(raw);
    return p.plan && p.plan !== "free";
  } catch { return false; }
}

interface ScanResult {
  found: number;
  processed: number;
  skipped: number;
  errors: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function GmailScanDialog({ isOpen, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("3m");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const paid = isPaidPlan();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startProgress = () => {
    setProgress(0);
    let current = 0;
    timerRef.current = setInterval(() => {
      if (current < 70) {
        // Fast phase: 0 → 70%
        current += Math.random() * 1.6 + 0.4;
      } else if (current < 90) {
        // Medium phase: 70 → 90%
        current += Math.random() * 0.6 + 0.15;
      } else if (current < 97) {
        // Slow creep: 90 → 97% (never fully stops — just very slow)
        current += Math.random() * 0.08 + 0.02;
      }
      // Hard cap at 97 so there's always a visible jump to 100 on completion
      if (current > 97) current = 97;
      setProgress(Math.round(current * 10) / 10);
    }, 300);
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/status`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, email: null, credentialsConfigured: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setScanResult(null);
      setPhase("idle");
      setProgress(0);
      clearTimer();
    }
    return () => clearTimer();
  }, [isOpen]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "GMAIL_CONNECTED") {
        loadStatus();
        toast({ title: "Gmail מחובר!", description: e.data.email });
      } else if (e.data?.type === "GMAIL_ERROR") {
        toast({ title: "שגיאה בחיבור Gmail", description: e.data.error, variant: "destructive" });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleConnectGmail = async () => {
    if (!status?.credentialsConfigured) {
      toast({ title: "דרושה הגדרה", description: "יש לקבוע GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET", variant: "destructive" });
      return;
    }
    setConnectingGmail(true);
    const authWindow = window.open("", "_blank", "width=520,height=620,left=200,top=100");
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/url`);
      const { url } = await res.json();
      if (url && authWindow) {
        authWindow.location.href = url;
      } else if (!authWindow && url) {
        window.open(url, "_blank");
      }
    } catch {
      authWindow?.close();
      toast({ title: "שגיאה", description: "לא ניתן לפתוח חיבור Gmail", variant: "destructive" });
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleScan = async () => {
    if (!status?.connected) return;
    setPhase("scanning");
    setScanResult(null);
    startProgress();
    try {
      const preset = DATE_PRESETS.find(p => p.key === datePreset);
      const yearsBack = preset?.months ? Math.ceil(preset.months / 12) || 1 : 4;
      const body: Record<string, unknown> = { yearsBack };
      if (preset?.months && preset.months <= 12) {
        const since = new Date();
        since.setMonth(since.getMonth() - preset.months);
        body.sinceDate = since.toISOString().split("T")[0];
      }

      const res = await fetch(`${API_BASE}/email-connectors/gmail/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בסריקה");

      // Animate to 100% then show result
      clearTimer();
      setProgress(100);
      await new Promise(r => setTimeout(r, 600));

      setScanResult({
        found:     data.found     ?? 0,
        processed: data.processed ?? 0,
        skipped:   data.skipped   ?? 0,
        errors:    data.errors    ?? [],
      });
      setPhase("done");

      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInvoiceSummaryQueryKey() });
    } catch (err) {
      clearTimer();
      setProgress(0);
      setPhase("idle");
      toast({
        title: "שגיאת סריקה",
        description: err instanceof Error ? err.message : "שגיאה לא ידועה",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={phase === "idle" ? onClose : undefined}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "linear-gradient(160deg, #090e24 0%, #060c1e 100%)",
          border: "1.5px solid rgba(67,97,238,0.22)",
          minHeight: 420,
        }}
        dir="rtl"
      >
        {/* Gradient strip */}
        <div
          className="h-1 w-full shrink-0"
          style={{ background: "linear-gradient(90deg, #4361ee 0%, #2dd4bf 100%)" }}
        />

        <AnimatePresence mode="wait">

          {/* ── SCANNING phase ─────────────────────────────────── */}
          {phase === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6"
            >
              {/* Pulsing mail icon */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.14, 1], opacity: [0.3, 0.55, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-28 h-28 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(67,97,238,0.4) 0%, transparent 70%)" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.07, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #4361ee44, #2dd4bf22)",
                    border: "1.5px solid rgba(67,97,238,0.4)",
                  }}
                >
                  <Mail className="w-8 h-8" style={{ color: "#2dd4bf" }} />
                </motion.div>
              </div>

              {/* Stage label */}
              <div className="text-center">
                <p className="text-[16px] font-bold text-white mb-1">סורק מיילים</p>
                <p className="text-[13px] text-white/50">{getStageLabel(progress)}</p>
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[11px] text-white/35">התקדמות</span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: "#2dd4bf" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Stages checklist */}
              <div className="w-full space-y-2.5">
                {SCAN_STAGES.map((s, i) => {
                  const done   = progress >= s.to;
                  const active = progress >= s.from && progress < s.to;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                          done ? "" : active ? "border-2" : "border border-white/15"
                        }`}
                        style={
                          done   ? { background: "linear-gradient(135deg, #4361ee, #2dd4bf)" }
                        : active ? { borderColor: "#2dd4bf", background: "rgba(45,212,191,0.15)" }
                        : {}
                        }
                      >
                        {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                        {active && (
                          <motion.div
                            animate={{ scale: [0.6, 1, 0.6] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "#2dd4bf" }}
                          />
                        )}
                      </div>
                      <span className={`text-[12px] transition-colors duration-300 ${
                        done   ? "text-white/35 line-through"
                      : active ? "text-white font-medium"
                      : "text-white/25"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── DONE phase ─────────────────────────────────────── */}
          {phase === "done" && scanResult && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4"
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {scanResult.processed > 0 ? (
                <>
                  {/* Success icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
                    className="relative"
                  >
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0.04) 70%)",
                        boxShadow: "0 0 48px rgba(45,212,191,0.28)",
                      }}
                    >
                      <CheckCircle2 className="w-12 h-12" style={{ color: "#2dd4bf" }} />
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 }}
                      className="absolute -top-1 -right-1"
                    >
                      <PartyPopper className="w-7 h-7 text-yellow-400" />
                    </motion.div>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-[13px] text-white/50"
                  >
                    הסריקה הושלמה בהצלחה
                  </motion.p>

                  {/* Big count */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className="text-[68px] font-black leading-none"
                      style={{ color: "#2dd4bf", textShadow: "0 0 40px rgba(45,212,191,0.5)" }}
                    >
                      {scanResult.processed}
                    </span>
                    <p className="text-[20px] font-bold text-white">חשבוניות נמצאו</p>
                  </motion.div>

                  {/* Stats row */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Mail className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[12px] text-white/50">{scanResult.found} מיילים נסרקו</span>
                    </div>
                    {scanResult.skipped > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <FileText className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-[12px] text-white/50">{scanResult.skipped} דולגו</span>
                      </div>
                    )}
                  </motion.div>
                </>
              ) : (
                <>
                  {/* Zero results icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.05 }}
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)",
                      boxShadow: "0 0 32px rgba(251,191,36,0.15)",
                    }}
                  >
                    <SearchX className="w-12 h-12 text-amber-400" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="text-center"
                  >
                    <p className="text-[18px] font-bold text-white mb-1">לא נמצאו חשבוניות חדשות</p>
                    <p className="text-[13px] text-white/45">
                      {scanResult.found > 0
                        ? `נסרקו ${scanResult.found} מיילים — לא נמצאו חשבוניות`
                        : "לא נמצאו מיילים עם קבצים בטווח הזמן הנבחר"}
                    </p>
                  </motion.div>

                  {/* Try different range hint */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-start gap-2 px-4 py-3 rounded-xl text-[12px] text-amber-300/70"
                    style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)" }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>נסה לבחור טווח תאריכים רחב יותר, או ודא שקיימים מיילים עם חשבוניות PDF בתיבה</span>
                  </motion.div>
                </>
              )}

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 }}
                className="flex gap-3 w-full mt-2"
              >
                <button
                  onClick={() => { setScanResult(null); setPhase("idle"); setProgress(0); }}
                  className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-white/60 border border-white/12 hover:bg-white/8 transition-all"
                >
                  סרוק שוב
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold text-white transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {scanResult.processed > 0 ? "צפה בחשבוניות" : "סגור"}
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── IDLE phase ─────────────────────────────────────── */}
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #4361ee33, #2dd4bf22)" }}
                  >
                    <Mail className="w-5 h-5" style={{ color: "#2dd4bf" }} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white">סרוק מייל</h2>
                    <p className="text-xs text-white/50">ייבוא חשבוניות מ-Gmail</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 flex flex-col gap-4">

                {/* Gmail connection status */}
                <div
                  className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {loadingStatus ? (
                    <Loader2 className="w-5 h-5 text-white/40 animate-spin shrink-0" />
                  ) : status?.connected ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#2dd4bf" }} />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {loadingStatus ? (
                      <p className="text-sm text-white/50">בודק חיבור...</p>
                    ) : status?.connected ? (
                      <>
                        <p className="text-sm font-medium text-white">Gmail מחובר</p>
                        <p className="text-[11px] text-white/50 truncate">{status.email}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-red-400">
                          {status?.credentialsConfigured === false ? "Google OAuth לא מוגדר" : "Gmail לא מחובר"}
                        </p>
                        <p className="text-[11px] text-white/40">
                          {status?.credentialsConfigured === false
                            ? "נדרש GOOGLE_CLIENT_ID ו-SECRET"
                            : "לחץ 'חבר' כדי להתחבר ל-Gmail"}
                        </p>
                      </>
                    )}
                  </div>
                  {!loadingStatus && !status?.connected && status?.credentialsConfigured && (
                    <button
                      onClick={handleConnectGmail}
                      disabled={connectingGmail}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all active:scale-95"
                      style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
                    >
                      {connectingGmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      חבר
                    </button>
                  )}
                </div>

                {/* Redirect URI instructions */}
                {!loadingStatus && !status?.connected && status?.credentialsConfigured && status?.redirectUri && (
                  <div
                    className="rounded-xl p-3.5 space-y-2"
                    style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}
                  >
                    <p className="text-[12px] font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      נדרש: הוסף Redirect URI ב-Google Cloud Console
                    </p>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <code className="text-[10px] text-teal-300 flex-1 break-all select-all leading-relaxed">
                        {status.redirectUri}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(status.redirectUri!)}
                        className="shrink-0 text-[10px] px-2 py-1 rounded bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                      >
                        העתק
                      </button>
                    </div>
                  </div>
                )}

                {/* Accounts divider */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <span className="text-[11px] text-white/30">חשבונות</span>
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                </div>

                <div className="flex items-center gap-2">
                  {status?.connected && status.email && (
                    <div
                      className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)" }}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4361ee] to-[#2dd4bf] flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-white">
                          {status.email[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[12px] text-white/70 truncate">{status.email}</span>
                    </div>
                  )}
                  <div className="relative group">
                    <button
                      disabled={!paid}
                      onClick={() => paid && handleConnectGmail()}
                      className={`flex items-center gap-1.5 h-10 px-3 rounded-xl text-[12px] font-medium transition-all ${
                        paid
                          ? "text-white hover:bg-white/10 border border-white/15"
                          : "text-white/30 border border-white/8 cursor-not-allowed"
                      }`}
                    >
                      {paid ? <MailPlus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                      הוסף חשבון
                    </button>
                    {!paid && (
                      <div className="absolute bottom-full right-0 mb-2 w-48 px-3 py-2 rounded-lg text-[11px] text-white bg-[#1a1f3a] border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        זמין בתוכנית Starter ומעלה
                      </div>
                    )}
                  </div>
                </div>

                {/* Date range selector */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <CalendarDays className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-[12px] text-white/50 font-medium">טווח תאריכים לסריקה</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {DATE_PRESETS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setDatePreset(p.key)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                          datePreset === p.key
                            ? "text-white"
                            : "text-white/45 hover:text-white/70 border border-white/10"
                        }`}
                        style={datePreset === p.key ? {
                          background: "linear-gradient(90deg, #4361ee44, #2dd4bf33)",
                          border: "1px solid rgba(67,97,238,0.4)",
                        } : {}}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scan button */}
                <button
                  onClick={handleScan}
                  disabled={!status?.connected}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-[14px] font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                  style={{
                    background: status?.connected
                      ? "linear-gradient(90deg, #4361ee, #2dd4bf)"
                      : "rgba(255,255,255,0.08)",
                    opacity: !status?.connected ? 0.4 : 1,
                  }}
                >
                  {!status?.connected ? (
                    <><AlertCircle className="w-5 h-5" />יש לחבר Gmail תחילה</>
                  ) : (
                    <><Scan className="w-5 h-5" />סרוק עכשיו</>
                  )}
                </button>

                <p className="text-center text-[11px] text-white/25 pb-1">
                  BillBOT+ סורק רק קבצי PDF ותמונות של חשבוניות
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
