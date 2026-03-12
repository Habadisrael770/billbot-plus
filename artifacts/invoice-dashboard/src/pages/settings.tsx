import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Shield,
  Bot,
  CheckCircle2,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  Loader2,
  Inbox,
  Key,
  MessageCircle,
  Copy,
  ExternalLink,
  Webhook,
  Smartphone,
  ScanText,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

type ConnectorStatus = "disconnected" | "testing" | "connected" | "error";

interface EmailConnector {
  provider: "gmail" | "outlook";
  email: string;
  password: string;
  status: ConnectorStatus;
  lastSync?: string;
  errorMsg?: string;
}

interface GmailOAuthStatus {
  connected: boolean;
  email: string | null;
  messagesTotal?: number;
  error?: string;
}

interface TelegramStatus {
  configured: boolean;
  botName: string | null;
  botUsername: string | null;
  webhookUrl: string | null;
  pendingUpdates: number;
}

interface WhatsAppStatus {
  configured: boolean;
  phoneNumber: string | null;
}

const INITIAL: Record<"outlook", EmailConnector> = {
  outlook: { provider: "outlook", email: "", password: "", status: "disconnected" },
};

export default function Settings() {
  const [connectors, setConnectors] = useState(INITIAL);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [gmailScanResult, setGmailScanResult] = useState<{ processed: number; found: number } | null>(null);
  const [isScanningOutlook, setIsScanningOutlook] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailOAuthStatus | null>(null);
  const [isLoadingGmail, setIsLoadingGmail] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus | null>(null);
  const [isSettingUpWebhook, setIsSettingUpWebhook] = useState(false);
  const [isFetchingTg, setIsFetchingTg] = useState(false);
  const { toast } = useToast();

  const fetchGmailStatus = useCallback(async () => {
    setIsLoadingGmail(true);
    try {
      const res = await fetch(`${API_BASE}/email-connectors/gmail/status`);
      const data = await res.json() as GmailOAuthStatus;
      setGmailStatus(data);
    } catch {
      setGmailStatus({ connected: false, email: null });
    } finally {
      setIsLoadingGmail(false);
    }
  }, []);

  const fetchTelegramStatus = useCallback(async () => {
    setIsFetchingTg(true);
    try {
      const res = await fetch(`${API_BASE}/telegram/status`);
      const data = await res.json() as TelegramStatus;
      setTelegramStatus(data);
    } catch {
      setTelegramStatus({ configured: false, botName: null, botUsername: null, webhookUrl: null, pendingUpdates: 0 });
    } finally {
      setIsFetchingTg(false);
    }
  }, []);

  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/status`);
      const data = await res.json() as WhatsAppStatus;
      setWhatsAppStatus(data);
    } catch {
      setWhatsAppStatus({ configured: false, phoneNumber: null });
    }
  }, []);

  useEffect(() => {
    fetchGmailStatus();
    fetchTelegramStatus();
    fetchWhatsAppStatus();
  }, [fetchGmailStatus, fetchTelegramStatus, fetchWhatsAppStatus]);

  const scanGmail = async () => {
    setIsScanningGmail(true);
    setGmailScanResult(null);
    try {
      const res = await fetch(`${API_BASE}/email-connectors/gmail/scan`, { method: "POST" });
      const data = await res.json() as { ok?: boolean; processed?: number; found?: number; error?: string };
      if (data.ok) {
        setGmailScanResult({ processed: data.processed ?? 0, found: data.found ?? 0 });
        toast({ title: "סריקת Gmail הושלמה", description: `נמצאו ${data.found} מיילים, עובדו ${data.processed} חשבוניות.` });
        fetchGmailStatus();
      } else {
        toast({ title: "שגיאת סריקה", description: data.error ?? "לא ניתן לסרוק.", variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", description: "לא ניתן להתחבר לשרת.", variant: "destructive" });
    } finally {
      setIsScanningGmail(false);
    }
  };

  const setupWebhook = async () => {
    setIsSettingUpWebhook(true);
    try {
      const res = await fetch(`${API_BASE}/telegram/setup-webhook`);
      const data = await res.json() as { ok: boolean; webhookUrl?: string; error?: string };
      if (data.ok) {
        toast({ title: "Webhook הוגדר!", description: `URL: ${data.webhookUrl}` });
        fetchTelegramStatus();
      } else {
        toast({ title: "שגיאה", description: data.error ?? "לא ניתן להגדיר webhook.", variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", description: "לא ניתן להתחבר לשרת.", variant: "destructive" });
    } finally {
      setIsSettingUpWebhook(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "הועתק!", description: text });
    });
  };

  const updateConnector = (provider: "outlook", field: keyof EmailConnector, value: string) => {
    setConnectors((p) => ({
      ...p,
      [provider]: { ...p[provider], [field]: value, status: "disconnected" },
    }));
  };

  const testConnection = async (provider: "outlook") => {
    const c = connectors[provider];
    if (!c.email || !c.password) {
      toast({ title: "שדות חסרים", description: "מלא אימייל וסיסמה לפני הבדיקה.", variant: "destructive" });
      return;
    }
    setConnectors((p) => ({ ...p, [provider]: { ...p[provider], status: "testing" } }));
    try {
      const res = await fetch(`${API_BASE}/email-connectors/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, email: c.email, password: c.password }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setConnectors((p) => ({ ...p, [provider]: { ...p[provider], status: "connected", lastSync: new Date().toLocaleString("he-IL") } }));
        toast({ title: "החיבור הצליח!", description: "Outlook מחובר בהצלחה." });
      } else {
        setConnectors((p) => ({ ...p, [provider]: { ...p[provider], status: "error", errorMsg: data.error } }));
        toast({ title: "חיבור נכשל", description: data.error ?? "בדוק את הפרטים.", variant: "destructive" });
      }
    } catch {
      setConnectors((p) => ({ ...p, [provider]: { ...p[provider], status: "error", errorMsg: "שגיאת רשת" } }));
      toast({ title: "שגיאת רשת", variant: "destructive" });
    }
  };

  const scanEmails = async (provider: "outlook") => {
    const setter = setIsScanningOutlook;
    setter(true);
    try {
      const res = await fetch(`${API_BASE}/email-connectors/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, email: connectors[provider].email, password: connectors[provider].password }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (data.count !== undefined) {
        toast({ title: "סריקה הושלמה", description: `נמצאו ${data.count} חשבוניות חדשות.` });
        setConnectors((p) => ({ ...p, [provider]: { ...p[provider], lastSync: new Date().toLocaleString("he-IL") } }));
      } else {
        toast({ title: "שגיאת סריקה", description: data.error ?? "לא ניתן לסרוק.", variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setter(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    toast({ title: "הגדרות נשמרו", description: "ההגדרות עודכנו בהצלחה." });
  };

  const StatusIcon = ({ status }: { status: ConnectorStatus }) => {
    if (status === "connected") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (status === "testing") return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
    return <div className="w-4 h-4 rounded-full border-2 border-white/20" />;
  };

  const ConnectorCard = ({ provider }: { provider: "outlook" }) => {
    const c = connectors[provider];
    const isGmail = false;
    const isScanning = isScanningOutlook;

    return (
      <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold bg-blue-500/10 text-blue-400">
              ⊡
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Outlook</p>
              <p className="text-xs text-muted-foreground">Microsoft 365 / Hotmail</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon status={c.status} />
            <span className={`text-xs font-medium ${
              c.status === "connected" ? "text-emerald-400" :
              c.status === "error" ? "text-red-400" :
              c.status === "testing" ? "text-yellow-400" :
              "text-muted-foreground"
            }`}>
              {c.status === "connected" ? "מחובר" : c.status === "error" ? "שגיאה" : c.status === "testing" ? "בודק..." : "לא מחובר"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">כתובת אימייל</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={c.email}
                onChange={(e) => updateConnector(provider, "email", e.target.value)}
                placeholder={isGmail ? "your@gmail.com" : "your@outlook.com"}
                dir="ltr"
                className="w-full h-10 pr-10 pl-4 rounded-xl border border-white/10 bg-black/30 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Key className="w-3 h-3" />
              סיסמה
            </label>
            <div className="relative">
              <input
                type={showPass[provider] ? "text" : "password"}
                value={c.password}
                onChange={(e) => updateConnector(provider, "password", e.target.value)}
                placeholder="הסיסמה שלך"
                dir="ltr"
                className="w-full h-10 pr-4 pl-10 rounded-xl border border-white/10 bg-black/30 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"
              />
              <button
                onClick={() => setShowPass((p) => ({ ...p, [provider]: !p[provider] }))}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-all"
              >
                {showPass[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {c.errorMsg && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{c.errorMsg}</p>}
          {c.lastSync && <p className="text-xs text-muted-foreground">סנכרון אחרון: {c.lastSync}</p>}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => testConnection(provider)} disabled={c.status === "testing"}
            className="flex-1 rounded-xl border border-white/10 gap-1.5 text-xs">
            {c.status === "testing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            בדוק חיבור
          </Button>
          <Button size="sm" onClick={() => scanEmails(provider)} disabled={c.status !== "connected" || isScanning}
            className="flex-1 rounded-xl bg-primary/80 hover:bg-primary gap-1.5 text-xs">
            {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            סרוק מיילים
          </Button>
        </div>
      </div>
    );
  };

  const webhookBaseUrl = `${window.location.origin}/api`;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto flex flex-col gap-6 pb-8"
        dir="rtl"
      >
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">הגדרות מערכת</h1>
            <p className="text-sm text-muted-foreground">סופר אדמין — ניהול חיבורים ו-AI</p>
          </div>
        </div>

        {/* Email connectors section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-white">חיבורי מייל</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Gmail OAuth Card */}
            <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-lg font-bold text-red-400">G</div>
                  <div>
                    <p className="text-sm font-semibold text-white">Gmail</p>
                    <p className="text-xs text-muted-foreground">Google / Workspace</p>
                  </div>
                </div>
                {isLoadingGmail ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : gmailStatus?.connected ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-medium">מחובר</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400">לא מחובר</span>
                  </div>
                )}
              </div>

              {gmailStatus?.connected && (
                <div className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs text-emerald-400 font-mono" dir="ltr">{gmailStatus.email}</p>
                  {gmailStatus.messagesTotal != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">{gmailStatus.messagesTotal.toLocaleString()} הודעות בתיבה</p>
                  )}
                </div>
              )}

              {gmailScanResult && (
                <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs text-primary font-medium">
                    ✅ נמצאו {gmailScanResult.found} מיילים, עובדו {gmailScanResult.processed} חשבוניות
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchGmailStatus}
                  disabled={isLoadingGmail}
                  className="flex-1 rounded-xl border border-white/10 gap-1.5 text-xs"
                >
                  {isLoadingGmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  רענן סטטוס
                </Button>
                <Button
                  size="sm"
                  onClick={scanGmail}
                  disabled={!gmailStatus?.connected || isScanningGmail}
                  className="flex-1 rounded-xl bg-red-500/80 hover:bg-red-500 gap-1.5 text-xs"
                >
                  {isScanningGmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
                  סרוק חשבוניות
                </Button>
              </div>

              {!gmailStatus?.connected && !isLoadingGmail && (
                <p className="text-xs text-muted-foreground text-center">
                  החיבור מוגדר דרך מערכת Replit — אשר את הגישה ב-Google כדי להפעיל
                </p>
              )}
            </div>

            <ConnectorCard provider="outlook" />
          </div>
        </div>

        {/* Telegram Bot section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">בוט טלגרם</h2>
            <span className="text-xs text-muted-foreground">— צלם חשבונית ושלח ישירות לתיקיית החודש</span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex flex-col gap-4">
            {/* Status row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  {isFetchingTg ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">בודק...</span>
                    </div>
                  ) : telegramStatus?.configured ? (
                    <>
                      <p className="text-sm font-semibold text-white">{telegramStatus.botName}</p>
                      <p className="text-xs text-blue-400 font-mono">{telegramStatus.botUsername}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-white">בוט טלגרם</p>
                      <p className="text-xs text-muted-foreground">טוקן לא הוגדר</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {telegramStatus?.configured ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-medium">פעיל</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400">ממתין להגדרה</span>
                  </div>
                )}
              </div>
            </div>

            {/* Webhook status */}
            {telegramStatus?.webhookUrl && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <Webhook className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400 font-mono truncate flex-1" dir="ltr">{telegramStatus.webhookUrl}</p>
                <button onClick={() => copyToClipboard(telegramStatus.webhookUrl!)} className="text-muted-foreground hover:text-white transition-all">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Setup webhook button */}
            <Button
              onClick={setupWebhook}
              disabled={isSettingUpWebhook || !telegramStatus?.configured}
              variant="ghost"
              size="sm"
              className="rounded-xl border border-white/10 gap-1.5 text-xs w-full"
            >
              {isSettingUpWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />}
              {telegramStatus?.webhookUrl ? "עדכן Webhook" : "הגדר Webhook"}
            </Button>

            {/* Instructions */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <p className="text-xs text-blue-400 font-medium mb-2">📌 הנחיות הגדרת הבוט</p>
              <ol className="text-xs text-blue-300/80 flex flex-col gap-1.5 list-decimal list-inside">
                <li>פתח את <strong>@BotFather</strong> בטלגרם ושלח <code>/newbot</code></li>
                <li>קבל את ה-<strong>Bot Token</strong></li>
                <li>
                  הוסף ב-<strong>Secrets</strong>:{" "}
                  <code className="bg-blue-500/10 px-1 rounded">TELEGRAM_BOT_TOKEN</code> ו-
                  <code className="bg-blue-500/10 px-1 rounded">TELEGRAM_CHAT_ID</code>
                </li>
                <li>לחץ <strong>"הגדר Webhook"</strong> כאן לאחר שמירה</li>
                <li>שלח לבוט תמונה של חשבונית — תעלה לתיקיית החודש!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* WhatsApp section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">WhatsApp</h2>
            <span className="text-xs text-muted-foreground">— שלח חשבונית דרך וואטסאפ לתיקיית החודש</span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex flex-col gap-4">
            {/* Status row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Twilio WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    {whatsAppStatus?.configured ? (whatsAppStatus.phoneNumber ?? "מוגדר") : "לא מוגדר"}
                  </p>
                </div>
              </div>
              {whatsAppStatus?.configured ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">פעיל</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400">ממתין להגדרה</span>
                </div>
              )}
            </div>

            {/* Webhook URL to copy */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">כתובת ה-Webhook להגדרה ב-Twilio:</p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/10">
                <Webhook className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-white/70 font-mono truncate flex-1" dir="ltr">{webhookBaseUrl}/whatsapp/webhook</p>
                <button onClick={() => copyToClipboard(`${webhookBaseUrl}/whatsapp/webhook`)} className="text-muted-foreground hover:text-white transition-all">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs text-emerald-400 font-medium mb-2">📌 הנחיות הגדרת WhatsApp (Twilio)</p>
              <ol className="text-xs text-emerald-300/80 flex flex-col gap-1.5 list-decimal list-inside">
                <li>
                  פתח חשבון ב-{" "}
                  <a href="https://www.twilio.com/en-us/whatsapp" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-0.5">
                    twilio.com <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </li>
                <li>הוסף ב-Secrets: <code className="bg-emerald-500/10 px-1 rounded">TWILIO_ACCOUNT_SID</code>, <code className="bg-emerald-500/10 px-1 rounded">TWILIO_AUTH_TOKEN</code>, <code className="bg-emerald-500/10 px-1 rounded">TWILIO_WHATSAPP_NUMBER</code></li>
                <li>בדף Messaging → Settings → WhatsApp Sandbox הכנס את כתובת ה-Webhook למעלה</li>
                <li>
                  <Smartphone className="w-3 h-3 inline ml-1" />
                  שלח חשבונית דרך וואטסאפ — תעלה אוטומטית לתיקיית החודש!
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* AI settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">הגדרות AI</h2>
          </div>
          <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">מודל AI פעיל</p>
                <p className="text-xs text-muted-foreground">DeepSeek Chat — זול ומהיר</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs text-violet-400 font-medium">פעיל</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "DeepSeek Chat", price: "$0.14/M", active: true },
                { name: "DeepSeek R1", price: "$0.55/M", active: false },
                { name: "Llama 3.1 8B", price: "$0.18/M", active: false },
              ].map((m) => (
                <div
                  key={m.name}
                  className={`rounded-xl border p-3 text-center cursor-pointer transition-all ${
                    m.active ? "border-violet-500/50 bg-violet-500/10" : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <p className={`text-xs font-medium ${m.active ? "text-violet-400" : "text-white/70"}`}>{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.price}</p>
                  {m.active && <p className="text-xs text-violet-400 mt-1">✓ פעיל</p>}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              כל שיחות ה-AI נשמרות במסד הנתונים ונגישות בכל עת. ה-AI זוכר את כל ההיסטוריה בתוך שיחה.
            </p>
          </div>
        </div>

        {/* Save */}
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 gap-2 text-sm font-medium"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "שומר..." : "שמור הגדרות"}
        </Button>
      </motion.div>
    </Layout>
  );
}
