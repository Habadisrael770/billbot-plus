import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, CheckCircle2, XCircle, Loader2, Lock,
  MailPlus, CalendarDays, Scan, AlertCircle, FileText,
  PartyPopper, ArrowLeft, SearchX, KeyRound, Eye, EyeOff, Trash2,
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
  emails: string[];
  credentialsConfigured: boolean;
  redirectUri?: string;
  imapAccounts?: { email: string; host: string; port: number }[];
  imapConnected?: boolean;
}

type DatePreset = "1m" | "3m" | "6m" | "1y" | "all";
type Phase = "idle" | "scanning" | "done";
type ConnectMode = "oauth" | "imap";

const DATE_PRESETS: { key: DatePreset; label: string; months?: number }[] = [
  { key: "1m",  label: "חודש אחרון",  months: 1  },
  { key: "3m",  label: "3 חודשים",    months: 3  },
  { key: "6m",  label: "חצי שנה",     months: 6  },
  { key: "1y",  label: "שנה אחורה",   months: 12 },
  { key: "all", label: "הכל",                    },
];

function isPaidPlan() {
  return true;
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
  onViewInvoices?: () => void;
}

export function GmailScanDialog({ isOpen, onClose, onViewInvoices }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("1m");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [stageMsg, setStageMsg] = useState("מתחבר לתיבת הדואר...");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [connectMode, setConnectMode] = useState<ConnectMode>("oauth");
  const paid = isPaidPlan();

  // IMAP form state
  const [imapEmail, setImapEmail]       = useState("");
  const [imapPass,  setImapPass]        = useState("");
  const [showPass,  setShowPass]        = useState(false);
  const [imapLoading, setImapLoading]   = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/status`);
      const data = await res.json();
      // Also fetch IMAP accounts
      const imapRes = await fetch(`${API_BASE}/imap-auth/accounts`);
      const imapData = await imapRes.json();
      setStatus({ ...data, imapAccounts: imapData.accounts ?? [], imapConnected: (imapData.accounts ?? []).length > 0 });
    } catch {
      setStatus({ connected: false, email: null, emails: [], credentialsConfigured: false, imapAccounts: [], imapConnected: false });
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
      setStageMsg("מתחבר לתיבת הדואר...");
    }
    return () => { abortRef.current?.abort(); };
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

  const openUrlSafely = (url: string, name: string) => {
    const w = 520, h = 640;
    const left = Math.max(0, (window.screen.width  - w) / 2);
    const top  = Math.max(0, (window.screen.height - h) / 2);
    const popup = window.open(url, name, `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
    if (!popup) {
      const a = document.createElement("a");
      a.href = url; a.target = "_top"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    return popup;
  };

  const handleConnectGmail = async () => {
    if (!status?.credentialsConfigured) {
      toast({ title: "דרושה הגדרה", description: "יש לקבוע GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET", variant: "destructive" });
      return;
    }
    setConnectingGmail(true);
    let popup: Window | null = null;
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/url`);
      const { url } = await res.json() as { url?: string };
      if (!url) throw new Error("no url");
      popup = openUrlSafely(url, "gmail-connect");
    } catch {
      toast({ title: "שגיאה", description: "לא ניתן לפתוח חיבור Gmail", variant: "destructive" });
      setConnectingGmail(false);
      return;
    }
    if (!popup) { setConnectingGmail(false); return; }
    const safetyTimer = setTimeout(() => setConnectingGmail(false), 120_000);
    const poll = setInterval(() => {
      if (popup!.closed) {
        clearInterval(poll);
        clearTimeout(safetyTimer);
        setConnectingGmail(false);
        loadStatus();
      }
    }, 600);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "GMAIL_CONNECTED" || e.data?.type === "GMAIL_ERROR") {
        clearInterval(poll);
        clearTimeout(safetyTimer);
        setConnectingGmail(false);
        window.removeEventListener("message", onMsg);
      }
    };
    window.addEventListener("message", onMsg);
  };

  const handleImapConnect = async () => {
    if (!imapEmail || !imapPass) {
      toast({ title: "נדרש מייל וסיסמה", variant: "destructive" });
      return;
    }
    setImapLoading(true);
    try {
      const res = await fetch(`${API_BASE}/imap-auth/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: imapEmail, appPassword: imapPass }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast({ title: "✅ מחובר!", description: `${imapEmail} מחובר בהצלחה` });
      setImapEmail(""); setImapPass("");
      await loadStatus();
    } catch (err) {
      toast({ title: "שגיאת חיבור", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setImapLoading(false);
    }
  };

  const handleImapRemove = async (email: string) => {
    setRemovingEmail(email);
    try {
      await fetch(`${API_BASE}/imap-auth/accounts/${encodeURIComponent(email)}`, { method: "DELETE" });
      toast({ title: "החשבון הוסר", description: email });
      await loadStatus();
    } catch {
      toast({ title: "שגיאה בהסרה", variant: "destructive" });
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleScan = async () => {
    const isConnected = status?.connected || status?.imapConnected || (status?.imapAccounts ?? []).length > 0;
    if (!isConnected) return;
    setPhase("scanning");
    setScanResult(null);
    setProgress(0);
    setStageMsg("מתחבר לתיבת הדואר...");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const preset = DATE_PRESETS.find(p => p.key === datePreset);
      const yearsBack = preset?.months ? Math.ceil(preset.months / 12) || 1 : 4;
      const body: Record<string, unknown> = { yearsBack };
      if (preset?.months && preset.months <= 12) {
        const since = new Date();
        since.setMonth(since.getMonth() - preset.months);
        body.sinceDate = since.toISOString().split("T")[0];
      }

      const res = await fetch(`${API_BASE}/email-connectors/gmail/scan-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("שגיאה בהתחברות לשרת הסריקה");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let gotDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const dataLine = chunk.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }

          if (event.type === "progress") {
            setProgress(Number(event.pct) || 0);
            setStageMsg(String(event.msg || ""));
          } else if (event.type === "done") {
            gotDone = true;
            setProgress(100);
            await new Promise(r => setTimeout(r, 500));
            setScanResult({
              found:     Number(event.found)     || 0,
              processed: Number(event.processed) || 0,
              skipped:   Number(event.skipped)   || 0,
              errors:    (event.errors as string[]) ?? [],
            });
            setPhase("done");
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetInvoiceSummaryQueryKey() });
          } else if (event.type === "error") {
            throw new Error(String(event.error || "שגיאה בסריקה"));
          }
        }
      }

      // Stream closed without a "done" event — guard against infinite spinner
      if (!gotDone) {
        setPhase("idle");
        setProgress(0);
        toast({
          title: "הסריקה הסתיימה ללא תוצאה",
          description: "השרת סגר את החיבור לפני שליחת תוצאה. נסה שוב.",
          variant: "destructive",
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setProgress(0);
      setPhase("idle");
      toast({
        title: "שגיאת סריקה",
        description: err instanceof Error ? err.message : "שגיאה לא ידועה",
        variant: "destructive",
      });
    }
  };

  const isConnected = !!(status?.connected || status?.imapConnected || (status?.imapAccounts ?? []).length > 0);
  const allEmails = [
    ...(status?.emails ?? (status?.email ? [status.email] : [])),
    ...(status?.imapAccounts?.map(a => a.email) ?? []),
  ].filter(Boolean) as string[];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 pb-[60px] sm:p-4 sm:pb-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={phase === "idle" ? onClose : undefined}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "linear-gradient(160deg, #090e24 0%, #060c1e 100%)",
          border: "1.5px solid rgba(67,97,238,0.22)",
          minHeight: 380,
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        dir="rtl"
      >
        {/* Gradient strip */}
        <div className="h-1 w-full shrink-0" style={{ background: "linear-gradient(90deg, #4361ee 0%, #2dd4bf 100%)" }} />

        <AnimatePresence mode="wait">

          {/* ── SCANNING phase ────────────────────────────────────── */}
          {phase === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6"
            >
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
              <div className="text-center">
                <p className="text-[16px] font-bold text-white mb-1">סורק מיילים</p>
                <p className="text-[13px] text-white/50">{stageMsg}</p>
              </div>
              <div className="w-full">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[11px] text-white/35">התקדמות</span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: "#2dd4bf" }}>{progress}%</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>
              <div className="w-full px-4 py-3 rounded-xl text-center text-[12px]" style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.15)" }}>
                <span className="text-white/50">הסריקה עשויה לקחת מספר דקות בהתאם לכמות המיילים.</span>
                <br />
                <span className="text-white/30 text-[11px]">ניתן להשאיר את החלון פתוח</span>
              </div>
            </motion.div>
          )}

          {/* ── DONE phase ────────────────────────────────────────── */}
          {phase === "done" && scanResult && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4"
            >
              <button onClick={onClose} className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>

              {scanResult.processed > 0 ? (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
                    className="relative"
                  >
                    <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0.04) 70%)", boxShadow: "0 0 48px rgba(45,212,191,0.28)" }}>
                      <CheckCircle2 className="w-12 h-12" style={{ color: "#2dd4bf" }} />
                    </div>
                    <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }} className="absolute -top-1 -right-1">
                      <PartyPopper className="w-7 h-7 text-yellow-400" />
                    </motion.div>
                  </motion.div>
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-[13px] text-white/50">הסריקה הושלמה בהצלחה</motion.p>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="flex flex-col items-center gap-1">
                    <span className="text-[68px] font-black leading-none" style={{ color: "#2dd4bf", textShadow: "0 0 40px rgba(45,212,191,0.5)" }}>{scanResult.processed}</span>
                    <p className="text-[20px] font-bold text-white">חשבוניות נמצאו</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-3">
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
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.05 }} className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)", boxShadow: "0 0 32px rgba(251,191,36,0.15)" }}>
                    <SearchX className="w-12 h-12 text-amber-400" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="text-center">
                    <p className="text-[18px] font-bold text-white mb-1">לא נמצאו חשבוניות חדשות</p>
                    <p className="text-[13px] text-white/45">
                      {scanResult.found > 0 ? `נסרקו ${scanResult.found} מיילים — לא נמצאו חשבוניות` : "לא נמצאו מיילים עם קבצים בטווח הזמן הנבחר"}
                    </p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-start gap-2 px-4 py-3 rounded-xl text-[12px] text-amber-300/70" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)" }}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>נסה לבחור טווח תאריכים רחב יותר, או ודא שקיימים מיילים עם חשבוניות PDF בתיבה</span>
                  </motion.div>
                </>
              )}

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="flex gap-3 w-full mt-2">
                <button onClick={() => { setScanResult(null); setPhase("idle"); setProgress(0); }} className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-white/60 border border-white/12 hover:bg-white/8 transition-all">
                  סרוק שוב
                </button>
                <button
                  onClick={() => {
                    if (scanResult.processed > 0 && onViewInvoices) {
                      onViewInvoices();
                    } else {
                      onClose();
                    }
                  }}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold text-white transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {scanResult.processed > 0 ? "צפה בחשבוניות" : "סגור"}
                </button>
              </motion.div>

            </motion.div>
          )}

          {/* ── IDLE phase ────────────────────────────────────────── */}
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #4361ee33, #2dd4bf22)" }}>
                    <Mail className="w-5 h-5" style={{ color: "#2dd4bf" }} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white">סרוק מייל</h2>
                    <p className="text-xs text-white/50">ייבוא חשבוניות מ-Gmail</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 flex flex-col gap-4">

                {/* ── Connection method tabs ── */}
                <div className="flex rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    onClick={() => setConnectMode("oauth")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-all"
                    style={connectMode === "oauth" ? { background: "linear-gradient(90deg, #4361ee44, #2dd4bf33)", color: "#fff", borderBottom: "2px solid #4361ee" } : { color: "rgba(255,255,255,0.4)" }}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Google OAuth
                  </button>
                  <button
                    onClick={() => setConnectMode("imap")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-all"
                    style={connectMode === "imap" ? { background: "linear-gradient(90deg, #4361ee44, #2dd4bf33)", color: "#fff", borderBottom: "2px solid #2dd4bf" } : { color: "rgba(255,255,255,0.4)" }}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    סיסמת אפליקציה
                  </button>
                </div>

                {/* ── OAuth mode ── */}
                {connectMode === "oauth" && (
                  <>
                    {/* Status */}
                    <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
                            <p className="text-sm font-medium text-white">Gmail OAuth מחובר</p>
                            <p className="text-[11px] text-white/50 truncate">{status.email}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-red-400">
                              {status?.credentialsConfigured === false ? "Google OAuth לא מוגדר" : "Gmail לא מחובר"}
                            </p>
                            <p className="text-[11px] text-white/40">
                              {status?.credentialsConfigured === false ? "נדרש GOOGLE_CLIENT_ID ו-SECRET" : "לחץ 'חבר' כדי להתחבר"}
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

                    {/* 403 hint */}
                    {!loadingStatus && !status?.connected && status?.credentialsConfigured && (
                      <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12px] text-amber-300 font-semibold">קיבלת שגיאה 403?</p>
                          <p className="text-[11px] text-white/50 mt-0.5">
                            הוסף את המייל שלך כ-Test User ב-Google Cloud Console, או עבור לכרטיסיית "סיסמת אפליקציה" לחיבור מהיר ללא OAuth.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Redirect URI */}
                    {!loadingStatus && !status?.connected && status?.credentialsConfigured && status?.redirectUri && (
                      <div className="rounded-xl p-3.5 space-y-2" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
                        <p className="text-[12px] font-semibold text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          נדרש: הוסף Redirect URI ב-Google Cloud Console
                        </p>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <code className="text-[10px] text-teal-300 flex-1 break-all select-all leading-relaxed">{status.redirectUri}</code>
                          <button onClick={() => navigator.clipboard.writeText(status.redirectUri!)} className="shrink-0 text-[10px] px-2 py-1 rounded bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors">העתק</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── IMAP / App Password mode ── */}
                {connectMode === "imap" && (
                  <div className="flex flex-col gap-3">
                    {/* Explainer */}
                    <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{ background: "rgba(67,97,238,0.08)", border: "1px solid rgba(67,97,238,0.2)" }}>
                      <KeyRound className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[12px] text-blue-300 font-semibold">ללא OAuth — ללא 403</p>
                        <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                          חיבור דרך סיסמת אפליקציה (App Password) — עובד מיד, ללא אישור Google.{" "}
                          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" className="text-blue-400 underline">צור סיסמה כאן ←</a>
                        </p>
                      </div>
                    </div>

                    {/* Connected IMAP accounts */}
                    {(status?.imapAccounts ?? []).length > 0 && (
                      <div className="flex flex-col gap-2">
                        {(status?.imapAccounts ?? []).map(acc => (
                          <div key={acc.email} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(45,212,191,0.07)", border: "1px solid rgba(45,212,191,0.18)" }}>
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#2dd4bf" }} />
                            <span className="text-[12px] text-white/80 truncate flex-1">{acc.email}</span>
                            <span className="text-[10px] text-white/30 shrink-0">IMAP</span>
                            <button
                              onClick={() => handleImapRemove(acc.email)}
                              disabled={removingEmail === acc.email}
                              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                              {removingEmail === acc.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new IMAP account form */}
                    <div className="flex flex-col gap-2">
                      <input
                        type="email"
                        value={imapEmail}
                        onChange={e => setImapEmail(e.target.value)}
                        placeholder="your@gmail.com"
                        className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white placeholder-white/30 outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                        dir="ltr"
                      />
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          value={imapPass}
                          onChange={e => setImapPass(e.target.value)}
                          placeholder="סיסמת אפליקציה (16 תווים)"
                          className="w-full px-3 py-2.5 pl-10 rounded-xl text-[13px] text-white placeholder-white/30 outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                          dir="ltr"
                          onKeyDown={e => e.key === "Enter" && handleImapConnect()}
                        />
                        <button onClick={() => setShowPass(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={handleImapConnect}
                        disabled={imapLoading || !imapEmail || !imapPass}
                        className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(90deg, #4361ee, #2dd4bf)" }}
                      >
                        {imapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        בדוק וחבר
                      </button>
                    </div>

                    {/* Instructions */}
                    <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-[11px] font-semibold text-white/50">איך יוצרים סיסמת אפליקציה?</p>
                      {["1. פתח myaccount.google.com", "2. אבטחה ← אימות דו-שלבי (חייב להיות פעיל)", "3. גלול למטה ← סיסמאות אפליקציה", "4. בחר 'דואר' ← יצור ← העתק 16 תווים"].map((step, i) => (
                        <p key={i} className="text-[11px] text-white/35">{step}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Connected accounts divider ── */}
                {allEmails.length > 0 && connectMode === "oauth" && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                      <span className="text-[11px] text-white/30">חשבונות מחוברים</span>
                      <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                    </div>

                    <div className="flex flex-col gap-2">
                      {allEmails.map((em, idx) => (
                        <div key={em} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(45,212,191,0.07)", border: "1px solid rgba(45,212,191,0.18)" }}>
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4361ee] to-[#2dd4bf] flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-white">{em[0].toUpperCase()}</span>
                          </div>
                          <span className="text-[12px] text-white/70 truncate flex-1">{em}</span>
                          {idx === 0 && <span className="text-[10px] text-teal-400/70 shrink-0">ראשי</span>}
                        </div>
                      ))}

                      <div className="relative group">
                        <button
                          disabled={!paid}
                          onClick={() => paid && handleConnectGmail()}
                          className={`w-full flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium transition-all ${paid ? "text-white/70 hover:text-white hover:bg-white/10 border border-white/12 border-dashed" : "text-white/25 border border-dashed border-white/8 cursor-not-allowed"}`}
                        >
                          {paid ? <MailPlus className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                          הוסף חשבון Gmail נוסף
                        </button>
                        {!paid && (
                          <div className="absolute bottom-full right-0 mb-2 w-52 px-3 py-2 rounded-lg text-[11px] text-white bg-[#1a1f3a] border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                            הוספת חשבונות נוספים זמינה בתוכנית Starter ומעלה
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Date range ── */}
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
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${datePreset === p.key ? "text-white" : "text-white/45 hover:text-white/70 border border-white/10"}`}
                        style={datePreset === p.key ? { background: "linear-gradient(90deg, #4361ee44, #2dd4bf33)", border: "1px solid rgba(67,97,238,0.4)" } : {}}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Scan button ── */}
                <button
                  onClick={handleScan}
                  disabled={!isConnected}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-[14px] font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                  style={{
                    background: isConnected ? "linear-gradient(90deg, #4361ee, #2dd4bf)" : "rgba(255,255,255,0.08)",
                    opacity: !isConnected ? 0.4 : 1,
                  }}
                >
                  {!isConnected ? (
                    <><AlertCircle className="w-5 h-5" />יש לחבר תיבת מייל תחילה</>
                  ) : (
                    <><Scan className="w-5 h-5" />סרוק עכשיו</>
                  )}
                </button>

                <p className="text-center text-[11px] text-white/25 pb-1">
                  BILLIBOT+ סורק רק קבצי PDF ותמונות של חשבוניות
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
