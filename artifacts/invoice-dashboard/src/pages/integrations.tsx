import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Send,
  MessageCircle,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  LogOut,
  ScanLine,
  Webhook,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  UserCheck,
  FileSpreadsheet,
  Download,
  Pencil,
  Calendar,
  Check,
  Lock,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { Invoice4UReport } from "@/components/invoice4u-report";

/* ── Brand SVG Icons ─────────────────────────────────────────────────────── */
function GmailIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 40h6V22.5L4 16v21c0 1.657 1.343 3 2 3z" fill="#4285F4" />
      <path d="M36 40h6c.657 0 2-1.343 2-3V16l-8 6.5V40z" fill="#34A853" />
      <path d="M36 10l-12 9L12 10 4 16l20 15L44 16l-8-6z" fill="#EA4335" />
      <path d="M4 16v-3c0-1.657 1.343-3 3-3l17 13 17-13c1.657 0 3 1.343 3 3v3L24 31 4 16z" fill="#FBBC04" />
    </svg>
  );
}

function OutlookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="26" height="32" rx="3" fill="#0078D4" />
      <path d="M28 16l16 8-16 8V16z" fill="#50E6FF" opacity=".8" />
      <path d="M28 16h14c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H28l-8-8 8-8z" fill="#28A8E8" />
      <path d="M28 16v16l16-8-16-8z" fill="#0078D4" />
      <ellipse cx="15" cy="24" rx="7" ry="9" fill="white" />
      <ellipse cx="15" cy="24" rx="5" ry="7" fill="#0078D4" />
    </svg>
  );
}

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#2AABEE" />
      <path d="M10.5 23.5l24-10c1.1-.5 2.2.3 1.8 1.7l-4.1 19.3c-.3 1.3-1.1 1.6-2.2.9l-6-4.5-2.9 2.8c-.3.3-.6.4-1.2.4l.4-6.2 10.9-9.8c.5-.4 0-.7-.7-.3L14.5 27.5l-5.9-1.8c-1.3-.4-1.3-1.3.9-2.2z" fill="white" />
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#25D366" />
      <path d="M24 10c-7.7 0-14 6.3-14 14 0 2.6.7 5 1.9 7.2L10 38l7.1-1.9C19.2 37.3 21.5 38 24 38c7.7 0 14-6.3 14-14S31.7 10 24 10zm7 19.3c-.3.8-1.6 1.5-2.2 1.6-.6.1-1.2.1-3.7-.8-3.2-1.1-5.3-4.3-5.5-4.5-.2-.2-1.5-2-1.5-3.8s1-2.8 1.3-3.1c.3-.4.7-.4.9-.4h.7c.2 0 .5 0 .7.6l1 2.4c.1.2.1.5 0 .7l-.4.6-.3.3c-.2.2-.4.4-.1.8.3.4 1.1 1.7 2.4 2.7 1.6 1.3 3 1.7 3.4 1.9.4.2.6.1.8-.1.3-.3.9-1.1 1.2-1.5.3-.4.5-.3.9-.2l2.3 1.1c.2.1.5.3.5.7.1.4.1 1.2-.2 2z" fill="white" />
    </svg>
  );
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

/* ── Plan tiers ─────────────────────────────────────────────────────────── */
const PLAN_KEY = "bb_plan";
type PlanId = "basic" | "pro" | "business";
const PLANS: { id: PlanId; name: string; emailLimit: number; price: string; color: string; badge?: string }[] = [
  { id: "basic",    name: "בסיס",    emailLimit: 1,  price: "חינם",  color: "from-slate-500 to-slate-600" },
  { id: "pro",      name: "פרו",     emailLimit: 3,  price: "₪79/חו", color: "from-violet-500 to-blue-500", badge: "מומלץ" },
  { id: "business", name: "ביזנס",  emailLimit: 10, price: "₪199/חו", color: "from-amber-500 to-orange-500" },
];
function loadPlan(): PlanId {
  try { return (localStorage.getItem(PLAN_KEY) as PlanId) ?? "basic"; } catch { return "basic"; }
}

/* ── Outlook accounts store ─────────────────────────────────────────────── */
const OUTLOOK_KEY = "bb_outlook_accounts";
interface OutlookAccount { id: string; email: string; connected: boolean; addedAt: string; }
function loadOutlookAccounts(): OutlookAccount[] {
  try { const s = localStorage.getItem(OUTLOOK_KEY); return s ? JSON.parse(s) as OutlookAccount[] : []; } catch { return []; }
}
function saveOutlookAccounts(list: OutlookAccount[]) {
  localStorage.setItem(OUTLOOK_KEY, JSON.stringify(list));
}

interface GmailOAuthStatus {
  connected: boolean;
  email: string | null;
  credentialsConfigured?: boolean;
  messagesTotal?: number;
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
  phoneNumberId?: string | null;
}

interface ApiConnection {
  id: string;
  service: string;
  display_name: string;
  api_key: string;
  api_secret?: string | null;
  base_url?: string | null;
  is_active: boolean;
  last_tested_at?: string | null;
  last_test_ok?: boolean | null;
  last_test_error?: string | null;
}

interface ServiceDef {
  id: string;
  name: string;
  hasBaseUrl: boolean;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
        ok
          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          : "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30"
      }`}
    >
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

/* ── Plan Selector Card ──────────────────────────────────────────────────── */
function PlanCard() {
  const [plan, setPlan] = useState<PlanId>(() => loadPlan());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const activePlan = PLANS.find((p) => p.id === plan) ?? PLANS[0];

  const choosePlan = (id: PlanId) => {
    setSaving(true);
    localStorage.setItem(PLAN_KEY, id);
    setPlan(id);
    setTimeout(() => {
      setSaving(false);
      toast({ title: `עברת לתכנית ${PLANS.find((p) => p.id === id)?.name}`, description: id === "basic" ? "" : "תוכל לחבר יותר חשבונות מייל" });
    }, 400);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-violet-500/10">
          <Zap className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">תכנית מנוי</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${activePlan.color}`}>
              {activePlan.name}
            </span>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">עד {activePlan.emailLimit} חשבונות מייל · {activePlan.price}</p>
        </div>
      </div>
      <div className="border-t border-border px-5 py-4 bg-muted/20">
        <div className="grid grid-cols-3 gap-2">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => choosePlan(p.id)}
              className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                plan === p.id
                  ? "border-primary/50 bg-primary/8"
                  : "border-border hover:border-primary/20 hover:bg-muted/50"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2 right-1/2 translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-violet-500 to-blue-500 whitespace-nowrap">
                  {p.badge}
                </span>
              )}
              <span className={`text-xs font-bold bg-gradient-to-r ${p.color} bg-clip-text text-transparent`}>{p.name}</span>
              <span className="text-[10px] text-muted-foreground">{p.emailLimit === 1 ? "מייל 1" : `עד ${p.emailLimit} מיילים`}</span>
              <span className="text-[10px] font-semibold text-foreground">{p.price}</span>
              {plan === p.id && <Check className="w-3 h-3 text-primary mt-0.5" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  iconBg,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="border-t border-border px-5 py-4 bg-muted/20 space-y-3">
        {children}
      </div>
    </div>
  );
}

/* ── Gmail ───────────────────────────────────────────────────────────────── */
function GmailCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<GmailOAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ processed: number; found: number } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/status`);
      setStatus(await res.json());
    } catch {
      setStatus({ connected: false, email: null, credentialsConfigured: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const openUrlSafely = (url: string) => {
    // Try popup; if blocked navigate top frame to escape Replit iframe (avoids 403)
    const w = 520, h = 640;
    const left = Math.max(0, (window.screen.width  - w) / 2);
    const top  = Math.max(0, (window.screen.height - h) / 2);
    const popup = window.open(url, "gmail-oauth", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
    if (!popup) {
      const a = document.createElement("a");
      a.href = url; a.target = "_top"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  const connect = async () => {
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) openUrlSafely(data.url);
      else toast({ title: "שגיאה", description: data.error, variant: "destructive" });
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    }
  };

  const disconnect = async () => {
    try {
      await fetch(`${API_BASE}/gmail-auth/disconnect`, { method: "POST" });
      setStatus((p) => p ? { ...p, connected: false, email: null } : null);
      setScanResult(null);
      toast({ title: "Gmail נותק" });
    } catch {
      toast({ title: "שגיאה", variant: "destructive" });
    }
  };

  const scan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch(`${API_BASE}/email-connectors/gmail/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearsBack: 4 }),
      });
      const data = await res.json() as { ok?: boolean; processed?: number; found?: number; error?: string };
      if (data.ok) {
        setScanResult({ processed: data.processed ?? 0, found: data.found ?? 0 });
        toast({ title: "סריקה הושלמה", description: `נמצאו ${data.found} מיילים, עובדו ${data.processed} חשבוניות.` });
        fetchStatus();
      } else {
        toast({ title: "שגיאת סריקה", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <SectionCard
      icon={<GmailIcon size={22} />}
      iconBg="bg-red-500/10"
      title="Gmail"
      description="סריקת חשבוניות ממיילים נכנסים ב-Gmail"
      badge={
        loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <StatusPill ok={!!status?.connected} label={status?.connected ? "מחובר" : "לא מחובר"} />
        )
      }
    >
      {status?.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-foreground font-medium" dir="ltr">{status.email}</span>
          </div>
          {scanResult && (
            <div className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl px-3 py-2">
              סריקה אחרונה: נמצאו <strong>{scanResult.found}</strong> מיילים, עובדו <strong>{scanResult.processed}</strong> חשבוניות
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={scan}
              disabled={scanning}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
              סרוק עכשיו
            </button>
            <button
              onClick={disconnect}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              נתק
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!status?.credentialsConfigured && (
            <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              נדרש הגדרת GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET בהגדרות
            </p>
          )}
          <button
            onClick={connect}
            disabled={!status?.credentialsConfigured}
            className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            חבר Gmail
          </button>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Telegram ────────────────────────────────────────────────────────────── */
function TelegramCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/telegram/status`);
      setStatus(await res.json());
    } catch {
      setStatus({ configured: false, botName: null, botUsername: null, webhookUrl: null, pendingUpdates: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const setupWebhook = async () => {
    setSettingUp(true);
    try {
      const res = await fetch(`${API_BASE}/telegram/setup-webhook`);
      const data = await res.json() as { ok: boolean; webhookUrl?: string; error?: string };
      if (data.ok) {
        toast({ title: "Webhook הוגדר!", description: data.webhookUrl });
        fetchStatus();
      } else {
        toast({ title: "שגיאה", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setSettingUp(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: "הועתק!" }));
  };

  return (
    <SectionCard
      icon={<TelegramIcon size={22} />}
      iconBg="bg-sky-500/10"
      title="Telegram Bot"
      description="שליחת חשבוניות ישירות לבוט בטלגרם"
      badge={
        loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <StatusPill ok={!!status?.configured} label={status?.configured ? "פעיל" : "לא מוגדר"} />
        )
      }
    >
      {status?.configured ? (
        <div className="space-y-3">
          {status.botUsername && (
            <div className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 text-sky-500 shrink-0" />
              <a
                href={`https://t.me/${status.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
                dir="ltr"
              >
                @{status.botUsername}
              </a>
              {status.botName && (
                <span className="text-muted-foreground text-xs">({status.botName})</span>
              )}
            </div>
          )}
          {status.webhookUrl ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-muted-foreground truncate" dir="ltr">{status.webhookUrl}</span>
              <button onClick={() => copy(status.webhookUrl!)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs text-amber-500">Webhook לא מוגדר</span>
            </div>
          )}
          {status.pendingUpdates > 0 && (
            <p className="text-xs text-muted-foreground">
              הודעות ממתינות: <strong>{status.pendingUpdates}</strong>
            </p>
          )}
          <button
            onClick={setupWebhook}
            disabled={settingUp}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
          >
            {settingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />}
            {status.webhookUrl ? "עדכן Webhook" : "הגדר Webhook"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          נדרש להגדיר את <code className="bg-muted px-1 rounded text-foreground">TELEGRAM_BOT_TOKEN</code> בהגדרות הסביבה.
        </p>
      )}
    </SectionCard>
  );
}

/* ── WhatsApp ────────────────────────────────────────────────────────────── */
function WhatsAppCard() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/whatsapp/status`)
      .then((r) => r.json())
      .then((d) => setStatus(d as WhatsAppStatus))
      .catch(() => setStatus({ configured: false, phoneNumber: null }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SectionCard
      icon={<WhatsAppIcon size={22} />}
      iconBg="bg-emerald-500/10"
      title="WhatsApp Business"
      description="קבלת חשבוניות דרך WhatsApp Business API"
      badge={
        loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <StatusPill ok={!!status?.configured} label={status?.configured ? "פעיל" : "לא מוגדר"} />
        )
      }
    >
      {status?.configured ? (
        <div className="space-y-2">
          {status.phoneNumber && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-foreground font-medium" dir="ltr">{status.phoneNumber}</span>
            </div>
          )}
          {status.phoneNumberId && (
            <p className="text-xs text-muted-foreground" dir="ltr">Phone Number ID: {status.phoneNumberId}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          נדרש להגדיר{" "}
          <code className="bg-muted px-1 rounded text-foreground">WHATSAPP_PHONE_NUMBER_ID</code>{" "}
          ו-<code className="bg-muted px-1 rounded text-foreground">WHATSAPP_ACCESS_TOKEN</code> בהגדרות.
        </p>
      )}
    </SectionCard>
  );
}

/* ── External APIs ───────────────────────────────────────────────────────── */
function ExternalApisCard() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [services, setServices] = useState<ServiceDef[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [newConn, setNewConn] = useState({ service: "green_invoice", api_key: "", api_secret: "", base_url: "", display_name: "" });

  const fetch_ = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        fetch(`${API_BASE}/external-api/connections`).then((r) => r.json()) as Promise<{ connections: ApiConnection[] }>,
        fetch(`${API_BASE}/external-api/services`).then((r) => r.json()) as Promise<{ services: ServiceDef[] }>,
      ]);
      setConnections(c.connections ?? []);
      setServices(s.services ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const save = async () => {
    if (!newConn.api_key.trim()) {
      toast({ title: "API Key חסר", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/external-api/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConn),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        toast({ title: "החיבור נשמר!" });
        setNewConn({ service: "green_invoice", api_key: "", api_secret: "", base_url: "", display_name: "" });
        setShowAdd(false);
        fetch_();
      } else {
        toast({ title: "שגיאה", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const test = async (conn: ApiConnection) => {
    setTesting((p) => ({ ...p, [conn.id]: true }));
    try {
      const res = await fetch(`${API_BASE}/external-api/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: conn.service, api_key: conn.api_key, api_secret: conn.api_secret, base_url: conn.base_url, connectionId: conn.id }),
      });
      const data = await res.json() as { ok: boolean; message?: string; error?: string };
      toast({ title: data.ok ? "החיבור הצליח ✓" : "בדיקה נכשלה", description: data.message ?? data.error, variant: data.ok ? "default" : "destructive" });
      fetch_();
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setTesting((p) => ({ ...p, [conn.id]: false }));
    }
  };

  const del = async (id: string) => {
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      await fetch(`${API_BASE}/external-api/connections/${id}`, { method: "DELETE" });
      toast({ title: "החיבור נמחק" });
      fetch_();
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setDeleting((p) => ({ ...p, [id]: false }));
    }
  };

  const selectedSvc = services.find((s) => s.id === newConn.service);

  return (
    <SectionCard
      icon={<Zap className="w-5 h-5 text-amber-500" />}
      iconBg="bg-amber-500/10"
      title="חיבורי API חיצוניים"
      description="חשבוניות ירוקות, מערכות ERP ושירותים נוספים"
      badge={
        connections.length > 0 ? (
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
            {connections.length} מחוברים
          </span>
        ) : undefined
      }
    >
      {/* Existing connections */}
      {connections.length > 0 && (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{conn.display_name || conn.service}</p>
                  {conn.last_test_ok === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {conn.last_test_ok === false && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {showKeys[conn.id] ? conn.api_key : conn.api_key.slice(0, 8) + "••••••••"}
                  </span>
                  <button onClick={() => setShowKeys((p) => ({ ...p, [conn.id]: !p[conn.id] }))} className="text-muted-foreground hover:text-foreground transition-colors">
                    {showKeys[conn.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => test(conn)}
                  disabled={testing[conn.id]}
                  title="בדוק חיבור"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                >
                  {testing[conn.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => del(conn.id)}
                  disabled={deleting[conn.id]}
                  title="מחק"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                >
                  {deleting[conn.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new connection */}
      {showAdd ? (
        <div className="space-y-3 p-4 bg-card border border-border rounded-xl">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">שירות</label>
              <select
                value={newConn.service}
                onChange={(e) => setNewConn((p) => ({ ...p, service: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">שם תצוגה (אופציונלי)</label>
              <input
                type="text"
                value={newConn.display_name}
                onChange={(e) => setNewConn((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="שם מותאם"
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">API Key *</label>
            <input
              type="password"
              value={newConn.api_key}
              onChange={(e) => setNewConn((p) => ({ ...p, api_key: e.target.value }))}
              placeholder="הכנס API Key..."
              dir="ltr"
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          {selectedSvc?.hasBaseUrl && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Base URL (אופציונלי)</label>
              <input
                type="text"
                value={newConn.base_url}
                onChange={(e) => setNewConn((p) => ({ ...p, base_url: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              שמור חיבור
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="h-8 px-4 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          הוסף חיבור API
        </button>
      )}
    </SectionCard>
  );
}

/* ── Outlook ─────────────────────────────────────────────────────────────── */
function usePlanLimit(): number {
  const [limit, setLimit] = useState(() => PLANS.find((p) => p.id === loadPlan())?.emailLimit ?? 1);
  useEffect(() => {
    const handler = () => setLimit(PLANS.find((p) => p.id === loadPlan())?.emailLimit ?? 1);
    window.addEventListener("storage", handler);
    const poll = setInterval(handler, 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(poll); };
  }, []);
  return limit;
}

function OutlookCard() {
  const { toast } = useToast();
  const emailLimit = usePlanLimit();
  const isLocked = emailLimit < 2;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);

  const test = async () => {
    if (!email || !password) {
      toast({ title: "נא מלא אימייל וסיסמה", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`${API_BASE}/email-connectors/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "outlook", email, password }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setConnected(true);
        toast({ title: "Outlook חובר בהצלחה!" });
      } else {
        toast({ title: "חיבור נכשל", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const scan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/email-connectors/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "outlook", email, password }),
      });
      const data = await res.json() as { ok?: boolean; processed?: number; found?: number; error?: string };
      if (data.ok) {
        toast({ title: "סריקה הושלמה", description: `נמצאו ${data.found} מיילים, עובדו ${data.processed} חשבוניות.` });
      } else {
        toast({ title: "שגיאת סריקה", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  if (isLocked) {
    return (
      <SectionCard
        icon={<OutlookIcon size={22} />}
        iconBg="bg-blue-600/10"
        title="Outlook / Microsoft 365"
        description="סריקת חשבוניות ממיילים ב-Outlook"
        badge={<span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><Lock className="w-3 h-3" /> פרו+</span>}
      >
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            חיבור Outlook דורש תכנית <strong>פרו</strong> או <strong>ביזנס</strong> (עד 3 / 10 חשבונות מייל).
          </p>
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            שדרג תכנית
          </button>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<OutlookIcon size={22} />}
      iconBg="bg-blue-600/10"
      title="Outlook / Microsoft 365"
      description="סריקת חשבוניות ממיילים ב-Outlook"
      badge={<StatusPill ok={connected} label={connected ? "מחובר" : "לא מחובר"} />}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? "הסתר הגדרות" : "הגדר חיבור"}
      </button>
      {open && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">כתובת אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@outlook.com"
              dir="ltr"
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">סיסמה</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full h-9 px-3 pl-9 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={test}
              disabled={testing}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
              בדוק חיבור
            </button>
            {connected && (
              <button
                onClick={scan}
                disabled={scanning}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
              >
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                סרוק
              </button>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Accountant ──────────────────────────────────────────────────────────── */
const ACCOUNTANT_KEY = "bb_accountant_config";
const FREQ_OPTIONS = [
  { value: "manual",    label: "שליחה ידנית בלבד" },
  { value: "monthly",   label: "אחת לחודש" },
  { value: "quarterly", label: "אחת לרבעון" },
];

interface AccountantConfig {
  name: string;
  email: string;
  frequency: string;
  notes: string;
}

function AccountantCard() {
  const { toast } = useToast();
  const [config, setConfig]   = useState<AccountantConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState<AccountantConfig>({ name: "", email: "", frequency: "manual", notes: "" });
  const [emailErr, setEmailErr] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTANT_KEY);
      if (saved) { const c = JSON.parse(saved) as AccountantConfig; setConfig(c); setForm(c); }
    } catch { /* ignore */ }
  }, []);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const save = () => {
    if (!form.name.trim()) { toast({ title: "נא להכניס שם", variant: "destructive" }); return; }
    if (!validateEmail(form.email)) { setEmailErr("כתובת מייל לא תקינה"); return; }
    setEmailErr("");
    const c = { ...form, name: form.name.trim(), email: form.email.trim() };
    localStorage.setItem(ACCOUNTANT_KEY, JSON.stringify(c));
    setConfig(c);
    setEditing(false);
    toast({ title: "פרטי רואה החשבון נשמרו" });
  };

  const disconnect = () => {
    localStorage.removeItem(ACCOUNTANT_KEY);
    setConfig(null);
    setForm({ name: "", email: "", frequency: "manual", notes: "" });
    setEditing(false);
    toast({ title: "רואה החשבון נותק" });
  };

  const sendReport = async () => {
    if (!config?.email) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/invoices/send-accountant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: config.email, name: config.name }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        toast({ title: "הדוח נשלח!", description: `נשלח אל ${config.email}` });
      } else {
        toast({ title: "שגיאה בשליחה", description: data.error ?? "בדוק שהטלגרם מחובר", variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/invoices/export`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `חשבוניות_${new Date().toLocaleDateString("he-IL").replace(/\//g, "-")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "הקובץ הורד" });
    } catch {
      toast({ title: "שגיאת ייצוא", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const freqLabel = FREQ_OPTIONS.find((f) => f.value === (config?.frequency ?? "manual"))?.label ?? "";

  return (
    <SectionCard
      icon={<UserCheck className="w-5 h-5 text-violet-500" />}
      iconBg="bg-violet-500/10"
      title='רואה חשבון'
      description="שליחת דוחות חשבוניות לרואה החשבון שלך בלחיצה אחת"
      badge={
        config
          ? <StatusPill ok={true} label="מוגדר" />
          : <StatusPill ok={false} label="לא מוגדר" />
      }
    >
      {config && !editing ? (
        /* ── Connected state ── */
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-[11px] text-muted-foreground mb-0.5">שם</p>
              <p className="text-sm font-medium text-foreground">{config.name}</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-[11px] text-muted-foreground mb-0.5">מייל</p>
              <p className="text-sm font-medium text-foreground" dir="ltr">{config.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {freqLabel}
          </div>
          {config.notes && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">{config.notes}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              ייצא Excel
            </button>
            <button
              onClick={sendReport}
              disabled={sending}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              שלח דוח
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              ערוך
            </button>
            <button
              onClick={disconnect}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              הסר
            </button>
          </div>
        </div>
      ) : (
        /* ── Form state ── */
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">שם רואה החשבון *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder='לדוגמא: משה לוי'
                dir="rtl"
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">כתובת מייל *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setEmailErr(""); }}
                placeholder="cpa@example.com"
                dir="ltr"
                className={`w-full h-9 px-3 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${emailErr ? "border-destructive" : "border-border"}`}
              />
              {emailErr && <p className="text-[11px] text-destructive mt-1">{emailErr}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">תדירות שליחת דוח</label>
            <select
              value={form.frequency}
              onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              dir="rtl"
            >
              {FREQ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">הערות (אופציונלי)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="הוראות מיוחדות, מספר לקוח, וכו'"
              dir="rtl"
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              שמור
            </button>
            {config && (
              <button
                onClick={() => { setEditing(false); setForm(config); setEmailErr(""); }}
                className="h-8 px-4 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ביטול
              </button>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Invoice4U ───────────────────────────────────────────────────────────── */
function Invoice4UCard() {
  const [status,  setStatus]  = useState<{
    connected: boolean;
    apiActive?: boolean;
    orgName?: string;
    email?: string;
    branches?: { ID: number; Name: string }[];
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  const refresh = () => {
    setLoading(true);
    fetch(`${API_BASE}/invoice4u/status`)
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus({ connected: false, error: "שגיאת רשת" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const fullyActive = status?.connected && status?.apiActive;

  return (
    <SectionCard
      icon={
        <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#1A56DB" />
          <path d="M8 28L16 12l8 12 4-6 4 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      iconBg="bg-blue-600/10"
      title="Invoice4U"
      description="ייבוא דוחות הכנסות והוצאות חודשיים מחשבונית 4U"
      badge={
        loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : fullyActive ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" /> פעיל
          </span>
        ) : status?.connected ? (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
            <XCircle className="w-3 h-3" /> API לא מופעל
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">
            <XCircle className="w-3 h-3" /> לא מוגדר
          </span>
        )
      }
    >
      {loading ? null : !status?.connected ? (
        status?.error === "API_KEY_INVALID" ? (
          /* ── API key expired / rejected ── */
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-red-400">ה-API key פג תוקף או לא תקין — יש לעדכן אותו</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>היכנס ל-Invoice4U → <strong className="text-foreground">הגדרות → חשבון → API</strong></li>
              <li>וודא שגישת API <strong className="text-foreground">מופעלת</strong></li>
              <li><strong className="text-foreground">העתק את ה-API key</strong> המעודכן</li>
              <li>עדכן את ה-Secret <code className="bg-muted px-1 py-0.5 rounded text-[10px]">INVOICE4U</code> בלוח ה-Secrets</li>
            </ol>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://private.invoice4u.co.il/newsite/he/settings/account"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                פתח הגדרות Invoice4U
              </a>
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
              >
                <Loader2 className="w-3 h-3" />
                בדוק שוב
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {status?.error ?? "הוסף את מפתח ה-API של Invoice4U כ-Secret בשם INVOICE4U"}
          </p>
        )
      ) : !status.apiActive ? (
        /* ── API key valid but ApiActive=false ── */
        <div className="space-y-3">
          {/* Account info */}
          {status.orgName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>מחובר לחשבון: <span className="font-medium text-foreground">{status.orgName}</span>{status.email ? ` (${status.email})` : ""}</span>
            </div>
          )}

          {/* Warning box */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-500">נדרשת הפעלת גישת API ב-Invoice4U</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>היכנס ל-Invoice4U → <strong className="text-foreground">הגדרות → חשבון → API</strong></li>
              <li>אפשר את האפשרות <strong className="text-foreground">"הפעל גישת API"</strong> / <strong className="text-foreground">"Enable API"</strong></li>
              <li>לחץ <strong className="text-foreground">שמור</strong></li>
              <li>העתק מחדש את ה-API key מאותו עמוד</li>
              <li>עדכן את ה-Secret בשם <code className="bg-muted px-1 py-0.5 rounded text-[10px]">INVOICE4U</code></li>
            </ol>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://private.invoice4u.co.il/newsite/he/settings/account"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                פתח הגדרות Invoice4U
              </a>
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
              >
                <Loader2 className="w-3 h-3" />
                בדוק שוב
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Fully active ── */
        <div className="space-y-3">
          {status.orgName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{status.orgName}{status.email ? ` · ${status.email}` : ""}</span>
            </div>
          )}
          {status.branches && status.branches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {status.branches.map(b => (
                <span key={b.ID} className="text-xs bg-muted border border-border rounded-lg px-2 py-0.5 text-muted-foreground">{b.Name}</span>
              ))}
            </div>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {open ? "סגור דוח" : "הצג דוח הכנסות/הוצאות"}
          </button>
          {open && (
            <div className="mt-2 rounded-2xl border border-border bg-background p-4">
              <Invoice4UReport />
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">אינטגרציות</h1>
          <p className="text-sm text-muted-foreground mt-1">
            חבר שירותי מייל, בוטים ומערכות חיצוניות לקבלת חשבוניות אוטומטית
          </p>
        </div>

        <div className="space-y-4">
          {/* Plan selector — full width */}
          <PlanCard />

          {/* Email providers — side by side */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> חשבונות מייל
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GmailCard />
              <OutlookCard />
            </div>
          </div>

          {/* Messaging — side by side */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> מסרים
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TelegramCard />
              <WhatsAppCard />
            </div>
          </div>

          {/* Accountant — full width */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> רואה חשבון
            </p>
            <AccountantCard />
          </div>

          {/* Invoice4U — full width */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> מערכות חשבונאות
            </p>
            <Invoice4UCard />
          </div>

          {/* External APIs — full width */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> חיבורי API
            </p>
            <ExternalApisCard />
          </div>
        </div>
      </div>
    </Layout>
  );
}
