import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, CheckCircle2, XCircle, Loader2, Lock,
  MailPlus, CalendarDays, Scan, AlertCircle, FileText,
  PartyPopper, ArrowLeft,
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
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ processed: number; skipped: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
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
      current += Math.random() * 1.4 + 0.3;
      if (current >= 94) { current = 94; clearTimer(); }
      setProgress(Math.round(current));
    }, 300);
  };

  const finishProgress = () => {
    clearTimer();
    setProgress(100);
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
      setResult(null);
      setShowResult(false);
      setScanning(false);
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
    setScanning(true);
    setResult(null);
    setShowResult(false);
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

      finishProgress();
      await new Promise(r => setTimeout(r, 500));

      const scanResult = { processed: data.processed ?? 0, skipped: data.skipped ?? 0 };
      setResult(scanResult);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInvoiceSummaryQueryKey() });
    } catch (err) {
      clearTimer();
      setProgress(0);
      toast({
        title: "שגיאת סריקה",
        description: err instanceof Error ? err.message : "שגיאה לא ידועה",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!scanning ? onClose : undefined} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "linear-gradient(160deg, #090e24 0%, #060c1e 100%)",
          border: "1.5px solid rgba(67,97,238,0.22)",
        }}
        dir="rtl"
      >
        {/* Gradient strip */}
        <div
          className="h-1 w-full shrink-0"
          style={{ background: "linear-gradient(90deg, #4361ee 0%, #2dd4bf 100%)" }}
        />

        {/* ── Result Overlay ─────────────────────────────────────── */}
        <AnimatePresence>
          {showResult && result && (
            <motion.div
              key="result-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6"
              style={{ background: "linear-gradient(160deg, #090e24 0%, #060c1e 100%)" }}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon burst */}
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                className="mb-5 relative"
              >
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle, rgba(45,212,191,0.25) 0%, rgba(45,212,191,0.05) 70%)",
                    boxShadow: "0 0 48px rgba(45,212,191,0.3)",
                  }}
                >
                  <CheckCircle2 className="w-12 h-12" style={{ color: "#2dd4bf" }} />
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute -top-1 -right-1"
                >
                  <PartyPopper className="w-7 h-7 text-yellow-400" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[13px] text-white/50 mb-1"
              >
                הסריקה הושלמה בהצלחה
              </motion.p>

              {/* Big count */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="flex items-end gap-2 mb-2"
              >
                <span
                  className="text-[64px] font-black leading-none"
                  style={{ color: "#2dd4bf", textShadow: "0 0 32px rgba(45,212,191,0.5)" }}
                >
                  {result.processed}
                </span>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34 }}
                className="text-[20px] font-bold text-white mb-4"
              >
                חשבוניות נמצאו
              </motion.p>

              {/* Skipped note */}
              {result.skipped > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full mb-5"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <FileText className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[12px] text-white/45">{result.skipped} מיילים דולגו (ללא חשבונית)</span>
                </motion.div>
              )}

              {/* CTA button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={onClose}
                className="w-full max-w-[260px] h-12 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold text-white transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                צפה בחשבוניות
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Scanning Overlay ───────────────────────────────────── */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="scan-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 gap-5"
              style={{ background: "linear-gradient(160deg, #090e24 0%, #060c1e 100%)" }}
            >
              {/* Pulsing mail icon */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.55, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-24 h-24 rounded-full"
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
                <p className="text-[15px] font-bold text-white mb-1">סורק מיילים</p>
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
                  className="w-full h-2.5 rounded-full overflow-hidden"
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

              {/* Steps */}
              <div className="w-full space-y-2">
                {SCAN_STAGES.map((s, i) => {
                  const done = progress >= s.to;
                  const active = progress >= s.from && progress < s.to;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        done ? "" : active ? "border-2" : "border border-white/15"
                      }`}
                        style={done
                          ? { background: "linear-gradient(135deg, #4361ee, #2dd4bf)" }
                          : active
                          ? { borderColor: "#2dd4bf", background: "rgba(45,212,191,0.15)" }
                          : {}
                        }
                      >
                        {done ? (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        ) : active ? (
                          <motion.div
                            animate={{ scale: [0.6, 1, 0.6] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "#2dd4bf" }}
                          />
                        ) : null}
                      </div>
                      <span className={`text-[12px] transition-colors duration-300 ${
                        done ? "text-white/40 line-through" : active ? "text-white font-medium" : "text-white/25"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            onClick={!scanning ? onClose : undefined}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-30"
            disabled={scanning}
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
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all active:scale-95 active:brightness-90"
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
              <p className="text-[11px] text-white/50 leading-relaxed">
                כדי לחבר Gmail, יש להוסיף את הכתובת הבאה ב-
                <strong className="text-white/70"> Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs</strong>:
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

          {/* Accounts */}
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
            disabled={!status?.connected || scanning}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-[14px] font-bold text-white transition-all active:scale-[0.98] active:brightness-90 disabled:cursor-not-allowed"
            style={{
              background: status?.connected
                ? "linear-gradient(90deg, #4361ee, #2dd4bf)"
                : "rgba(255,255,255,0.08)",
              opacity: scanning ? 0.6 : !status?.connected ? 0.4 : 1,
            }}
          >
            {scanning ? (
              <><Loader2 className="w-5 h-5 animate-spin" />סורק מיילים...</>
            ) : !status?.connected ? (
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
    </div>
  );
}
