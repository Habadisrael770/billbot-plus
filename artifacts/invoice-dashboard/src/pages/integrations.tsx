import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

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
          : "bg-muted text-muted-foreground border border-border"
      }`}
    >
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </span>
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

  const connect = async () => {
    try {
      const res = await fetch(`${API_BASE}/gmail-auth/url`);
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
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
      const res = await fetch(`${API_BASE}/email-connectors/gmail/scan`, { method: "POST" });
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
      icon={<Mail className="w-5 h-5 text-blue-500" />}
      iconBg="bg-blue-500/10"
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
      icon={<Send className="w-5 h-5 text-sky-500" />}
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
      icon={<MessageCircle className="w-5 h-5 text-emerald-500" />}
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
function OutlookCard() {
  const { toast } = useToast();
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

  return (
    <SectionCard
      icon={<Mail className="w-5 h-5 text-blue-700" />}
      iconBg="bg-blue-700/10"
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

        <div className="grid gap-4">
          <GmailCard />
          <AccountantCard />
          <TelegramCard />
          <WhatsAppCard />
          <OutlookCard />
          <ExternalApisCard />
        </div>
      </div>
    </Layout>
  );
}
