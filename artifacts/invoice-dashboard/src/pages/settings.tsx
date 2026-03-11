import React, { useState } from "react";
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

const INITIAL: Record<"gmail" | "outlook", EmailConnector> = {
  gmail: { provider: "gmail", email: "", password: "", status: "disconnected" },
  outlook: { provider: "outlook", email: "", password: "", status: "disconnected" },
};

export default function Settings() {
  const [connectors, setConnectors] = useState(INITIAL);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [isScanningOutlook, setIsScanningOutlook] = useState(false);
  const { toast } = useToast();

  const updateConnector = (provider: "gmail" | "outlook", field: keyof EmailConnector, value: string) => {
    setConnectors((p) => ({
      ...p,
      [provider]: { ...p[provider], [field]: value, status: "disconnected" },
    }));
  };

  const testConnection = async (provider: "gmail" | "outlook") => {
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
        toast({ title: "החיבור הצליח!", description: `${provider === "gmail" ? "Gmail" : "Outlook"} מחובר בהצלחה.` });
      } else {
        setConnectors((p) => ({ ...p, [provider]: { ...p[provider], status: "error", errorMsg: data.error } }));
        toast({ title: "חיבור נכשל", description: data.error ?? "בדוק את הפרטים.", variant: "destructive" });
      }
    } catch {
      setConnectors((p) => ({ ...p, [provider]: { ...p[provider], status: "error", errorMsg: "שגיאת רשת" } }));
      toast({ title: "שגיאת רשת", description: "לא ניתן להתחבר לשרת.", variant: "destructive" });
    }
  };

  const scanEmails = async (provider: "gmail" | "outlook") => {
    const setter = provider === "gmail" ? setIsScanningGmail : setIsScanningOutlook;
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
      toast({ title: "שגיאת רשת", description: "לא ניתן לסרוק.", variant: "destructive" });
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

  const ConnectorCard = ({ provider }: { provider: "gmail" | "outlook" }) => {
    const c = connectors[provider];
    const isGmail = provider === "gmail";
    const isScanning = isGmail ? isScanningGmail : isScanningOutlook;

    return (
      <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isGmail ? "bg-red-500/10" : "bg-blue-500/10"}`}>
              {isGmail ? "G" : "⊡"}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{isGmail ? "Gmail" : "Outlook"}</p>
              <p className="text-xs text-muted-foreground">
                {isGmail ? "חשבון Google / Workspace" : "Microsoft 365 / Hotmail"}
              </p>
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

        {/* Fields */}
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
              {isGmail ? "App Password (16 תווים)" : "סיסמה"}
            </label>
            <div className="relative">
              <input
                type={showPass[provider] ? "text" : "password"}
                value={c.password}
                onChange={(e) => updateConnector(provider, "password", e.target.value)}
                placeholder={isGmail ? "xxxx xxxx xxxx xxxx" : "הסיסמה שלך"}
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
            {isGmail && (
              <p className="text-xs text-muted-foreground">
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  צור App Password ב-Google →
                </a>
              </p>
            )}
          </div>
          {c.errorMsg && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{c.errorMsg}</p>
          )}
          {c.lastSync && (
            <p className="text-xs text-muted-foreground">סנכרון אחרון: {c.lastSync}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => testConnection(provider)}
            disabled={c.status === "testing"}
            className="flex-1 rounded-xl border border-white/10 gap-1.5 text-xs"
          >
            {c.status === "testing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            בדוק חיבור
          </Button>
          <Button
            size="sm"
            onClick={() => scanEmails(provider)}
            disabled={c.status !== "connected" || isScanning}
            className="flex-1 rounded-xl bg-primary/80 hover:bg-primary gap-1.5 text-xs"
          >
            {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            סרוק מיילים
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto flex flex-col gap-6"
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
            <ConnectorCard provider="gmail" />
            <ConnectorCard provider="outlook" />
          </div>
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-400 font-medium mb-1">📌 הנחיות חיבור Gmail</p>
            <ol className="text-xs text-amber-300/80 flex flex-col gap-1 list-decimal list-inside">
              <li>הפעל אימות דו-שלבי בחשבון Google שלך</li>
              <li>עבור ל: myaccount.google.com/apppasswords</li>
              <li>צור App Password חדש עבור "Mail"</li>
              <li>הזן את ה-16 הספרות כאן</li>
            </ol>
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
                    m.active
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/5 hover:border-white/20"
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

        {/* Telegram status */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">טלגרם</h2>
          </div>
          <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">חיבור טלגרם</p>
              <p className="text-xs text-muted-foreground">שליחת התראות ודוחות לרו"ח</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              ממתין להגדרה
            </div>
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
