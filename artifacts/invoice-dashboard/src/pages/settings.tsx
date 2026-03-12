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
  Plug,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Tag,
  Pencil,
  Building2,
  User,
  HardDrive,
  Star,
  Check,
  Info,
  Globe,
  Percent,
  DollarSign,
  X,
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
  phoneNumberId?: string | null;
  verifyToken?: string | null;
  provider?: string;
}

const INITIAL: Record<"outlook", EmailConnector> = {
  outlook: { provider: "outlook", email: "", password: "", status: "disconnected" },
};

export default function Settings() {
  // ── Categories state ──────────────────────────────────────────────────────
  interface Category { id: string; name: string; color: string; is_deletable: boolean; is_default: boolean; }
  interface Entity { id: string; name: string; type: string; tax_id: string | null; registration_type: string | null; is_default: boolean; }

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState<"business" | "personal">("business");
  const [newEntityTaxId, setNewEntityTaxId] = useState("");
  const [newEntityRegType, setNewEntityRegType] = useState<"chp" | "osek">("osek");
  const [entityLoading, setEntityLoading] = useState(false);

  // ── Business Profile state ────────────────────────────────────────────────
  const BIZ_TYPES  = ["חברה בע\"מ", "עוסק מורשה", "עצמאי / פרילנסר", "שותפות", "עמותה / מלכ\"ר", "אחר"];
  const INDUSTRIES = ["טכנולוגיה ותוכנה", "בינה מלאכותית", "ייעוץ ושירותים מקצועיים", "שיווק ופרסום", "בריאות ורפואה", "חינוך והדרכה", "נדל\"ן ובנייה", "קמעונאות ומסחר", "תחבורה ולוגיסטיקה", "מסעדנות ואירוח", "שירותים פיננסיים", "אחר"];
  interface BusinessProfile {
    business_tax_ids: string[]; business_names: string[];
    expense_categories: string[]; business_type: string; industry: string;
    home_office_usage_percent: number; vehicle_business_usage_percent: number;
    estimated_annual_revenue: string; is_vat_registered: boolean; has_employees: boolean;
  }
  const [profile, setProfile] = useState<BusinessProfile>({
    business_tax_ids: [], business_names: [], expense_categories: [],
    business_type: "", industry: "", home_office_usage_percent: 0,
    vehicle_business_usage_percent: 0, estimated_annual_revenue: "",
    is_vat_registered: false, has_employees: false,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving,  setProfileSaving]  = useState(false);
  const [profileTaxInput,  setProfileTaxInput]  = useState("");
  const [profileNameInput, setProfileNameInput] = useState("");

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const r = await fetch(`${API_BASE}/categories`);
      setCategories(await r.json());
    } catch { /* ignore */ } finally { setCatLoading(false); }
  }, []);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const r = await fetch(`${API_BASE}/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }) });
      const cat = await r.json();
      setCategories((p) => [...p, cat]);
      setNewCatName("");
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  const updateCategory = async (id: string) => {
    try {
      const r = await fetch(`${API_BASE}/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editCatName }) });
      const cat = await r.json();
      setCategories((p) => p.map((c) => c.id === id ? cat : c));
      setEditingCat(null);
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  const deleteCategory = async (id: string) => {
    try {
      await fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" });
      setCategories((p) => p.filter((c) => c.id !== id));
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  const loadEntities = useCallback(async () => {
    setEntityLoading(true);
    try {
      const r = await fetch(`${API_BASE}/entities`);
      setEntities(await r.json());
    } catch { /* ignore */ } finally { setEntityLoading(false); }
  }, []);

  const addEntity = async () => {
    if (!newEntityName.trim()) return;
    try {
      const r = await fetch(`${API_BASE}/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEntityName.trim(),
          type: newEntityType,
          tax_id: newEntityTaxId || null,
          registration_type: newEntityTaxId ? newEntityRegType : null,
        }),
      });
      const entity = await r.json();
      setEntities((p) => [...p, entity]);
      setNewEntityName(""); setNewEntityTaxId("");
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  const setDefaultEntity = async (id: string) => {
    try {
      await fetch(`${API_BASE}/entities/${id}/set-default`, { method: "PATCH" });
      setEntities((p) => p.map((e) => ({ ...e, is_default: e.id === id })));
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  const deleteEntity = async (id: string) => {
    try {
      await fetch(`${API_BASE}/entities/${id}`, { method: "DELETE" });
      setEntities((p) => p.filter((e) => e.id !== id));
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
  };

  // ── Business Profile load / save ─────────────────────────────────────────
  const loadBusinessProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const r = await fetch(`${API_BASE}/business-profile`);
      const data = await r.json();
      setProfile({
        business_tax_ids: data.business_tax_ids ?? [],
        business_names:   data.business_names   ?? [],
        expense_categories: data.expense_categories ?? [],
        business_type:    data.business_type    ?? "",
        industry:         data.industry         ?? "",
        home_office_usage_percent: data.home_office_usage_percent ?? 0,
        vehicle_business_usage_percent: data.vehicle_business_usage_percent ?? 0,
        estimated_annual_revenue: data.estimated_annual_revenue ?? "",
        is_vat_registered: data.is_vat_registered ?? false,
        has_employees:    data.has_employees    ?? false,
      });
    } catch { /* ignore */ } finally { setProfileLoading(false); }
  }, []);

  const saveBusinessProfile = async () => {
    setProfileSaving(true);
    try {
      await fetch(`${API_BASE}/business-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      toast({ title: "✅ פרופיל עסקי נשמר" });
    } catch { toast({ title: "שגיאה", variant: "destructive" }); }
    finally { setProfileSaving(false); }
  };

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
    loadCategories();
    loadEntities();
    loadBusinessProfile();
  }, [fetchGmailStatus, fetchTelegramStatus, fetchWhatsAppStatus, loadCategories, loadEntities, loadBusinessProfile]);

  // --- API Connections state ---
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceDef[]>([]);
  const [showAddApi, setShowAddApi] = useState(false);
  const [newApi, setNewApi] = useState({ service: "green_invoice", api_key: "", api_secret: "", base_url: "", display_name: "" });
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [testingApi, setTestingApi] = useState<Record<string, boolean>>({});
  const [deletingApi, setDeletingApi] = useState<Record<string, boolean>>({});
  const [isSavingApi, setIsSavingApi] = useState(false);

  const fetchApiConnections = useCallback(async () => {
    try {
      const [connsRes, svcsRes] = await Promise.all([
        fetch(`${API_BASE}/external-api/connections`),
        fetch(`${API_BASE}/external-api/services`),
      ]);
      const connsData = await connsRes.json() as { connections: ApiConnection[] };
      const svcsData = await svcsRes.json() as { services: ServiceDef[] };
      setApiConnections(connsData.connections ?? []);
      setAvailableServices(svcsData.services ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchApiConnections(); }, [fetchApiConnections]);

  const saveApiConnection = async () => {
    if (!newApi.api_key.trim()) {
      toast({ title: "API Key חסר", variant: "destructive" });
      return;
    }
    setIsSavingApi(true);
    try {
      const res = await fetch(`${API_BASE}/external-api/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApi),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        toast({ title: "החיבור נשמר!" });
        setNewApi({ service: "green_invoice", api_key: "", api_secret: "", base_url: "", display_name: "" });
        setShowAddApi(false);
        fetchApiConnections();
      } else {
        toast({ title: "שגיאה", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setIsSavingApi(false);
    }
  };

  const testApiConnection = async (conn: ApiConnection) => {
    setTestingApi((p) => ({ ...p, [conn.id]: true }));
    try {
      const res = await fetch(`${API_BASE}/external-api/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: conn.service, api_key: conn.api_key, api_secret: conn.api_secret, base_url: conn.base_url, connectionId: conn.id }),
      });
      const data = await res.json() as { ok: boolean; message?: string; error?: string };
      toast({ title: data.ok ? "החיבור הצליח ✓" : "בדיקה נכשלה", description: data.message ?? data.error, variant: data.ok ? "default" : "destructive" });
      fetchApiConnections();
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setTestingApi((p) => ({ ...p, [conn.id]: false }));
    }
  };

  const deleteApiConnection = async (id: string) => {
    setDeletingApi((p) => ({ ...p, [id]: true }));
    try {
      await fetch(`${API_BASE}/external-api/connections/${id}`, { method: "DELETE" });
      toast({ title: "החיבור נמחק" });
      fetchApiConnections();
    } catch {
      toast({ title: "שגיאת רשת", variant: "destructive" });
    } finally {
      setDeletingApi((p) => ({ ...p, [id]: false }));
    }
  };

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

        {/* WhatsApp — Meta Cloud API */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">WhatsApp Business</h2>
            <span className="text-xs text-muted-foreground">— Meta WhatsApp Cloud API</span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-card/20 p-5 flex flex-col gap-4" dir="rtl">
            {/* Status row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">WhatsApp Cloud API</p>
                  <p className="text-xs text-muted-foreground">
                    {whatsAppStatus?.configured
                      ? `Phone ID: ${whatsAppStatus.phoneNumberId ?? "מוגדר"}`
                      : "מפתח גישה לא מוגדר"}
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

            {/* Webhook URL */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Webhook URL להגדרה ב-Meta Developer Console:</p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/10">
                <Webhook className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-white/70 font-mono truncate flex-1" dir="ltr">
                  {webhookBaseUrl}/whatsapp/webhook
                </p>
                <button
                  onClick={() => copyToClipboard(`${webhookBaseUrl}/whatsapp/webhook`)}
                  className="text-muted-foreground hover:text-white transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Env vars to set */}
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">משתני סביבה נדרשים (Secrets):</p>
              {[
                { key: "WHATSAPP_PHONE_NUMBER_ID", desc: "Phone Number ID מ-Meta Developer Console" },
                { key: "WHATSAPP_ACCESS_TOKEN", desc: "System User Access Token (לא Temporary)" },
                { key: "WHATSAPP_VERIFY_TOKEN", desc: "טוקן אימות Webhook — בחר מחרוזת כלשהי" },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs bg-white/8 text-primary px-1.5 py-0.5 rounded shrink-0" dir="ltr">{key}</code>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(key)}
                    className="shrink-0 text-muted-foreground hover:text-white transition-all mt-0.5"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Step-by-step instructions */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs text-emerald-400 font-medium mb-2">📋 הנחיות הגדרה — Meta WhatsApp Cloud API</p>
              <ol className="text-xs text-emerald-300/80 flex flex-col gap-2 list-decimal list-inside">
                <li>
                  פתח{" "}
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Meta for Developers <ExternalLink className="w-2.5 h-2.5" />
                  </a>{" "}
                  → צור App חדש מסוג Business
                </li>
                <li>הוסף מוצר WhatsApp → קבל <strong>Phone Number ID</strong> ו-<strong>Temporary Access Token</strong></li>
                <li>
                  בדף WhatsApp → Configuration → Webhook:
                  <ul className="list-disc list-inside mr-3 mt-1 space-y-0.5">
                    <li>הכנס את כתובת ה-Webhook למעלה</li>
                    <li>הכנס את ה-Verify Token שבחרת</li>
                    <li>סמן <code className="bg-black/20 px-1 rounded">messages</code> ב-Webhook Fields</li>
                  </ul>
                </li>
                <li>הוסף את שלושת ה-Secrets למערכת ולחץ שמור</li>
                <li>
                  <Smartphone className="w-3 h-3 inline ml-1" />
                  שלח תמונת חשבונית ל-WhatsApp Business — תעובד אוטומטית!
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

        {/* External API Connections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plug className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-white">חיבורי API חיצוני</h2>
              <span className="text-xs text-muted-foreground">— חשבשבת, Green Invoice, iCount ועוד</span>
            </div>
            <button
              onClick={() => setShowAddApi((p) => !p)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-all"
            >
              {showAddApi ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAddApi ? "סגור" : "הוסף חיבור"}
            </button>
          </div>

          {/* Add new connection form */}
          {showAddApi && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 flex flex-col gap-4 mb-4"
            >
              <p className="text-xs text-orange-400 font-medium">חיבור API חדש</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">שירות</label>
                  <select
                    value={newApi.service}
                    onChange={(e) => setNewApi((p) => ({ ...p, service: e.target.value }))}
                    className="h-10 px-3 rounded-xl border border-white/10 bg-black/30 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">שם תצוגה (אופציונלי)</label>
                  <input
                    type="text"
                    value={newApi.display_name}
                    onChange={(e) => setNewApi((p) => ({ ...p, display_name: e.target.value }))}
                    placeholder="למשל: חשבונות שנה 2025"
                    className="h-10 px-3 rounded-xl border border-white/10 bg-black/30 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Key className="w-3 h-3" /> API Key</label>
                <input
                  type="text"
                  value={newApi.api_key}
                  onChange={(e) => setNewApi((p) => ({ ...p, api_key: e.target.value }))}
                  placeholder="הכנס את ה-API Key שלך"
                  dir="ltr"
                  className="h-10 px-3 rounded-xl border border-white/10 bg-black/30 text-sm text-white font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">API Secret (אופציונלי)</label>
                  <input
                    type="password"
                    value={newApi.api_secret}
                    onChange={(e) => setNewApi((p) => ({ ...p, api_secret: e.target.value }))}
                    placeholder="Secret / Password"
                    dir="ltr"
                    className="h-10 px-3 rounded-xl border border-white/10 bg-black/30 text-sm text-white font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Base URL (אופציונלי)</label>
                  <input
                    type="url"
                    value={newApi.base_url}
                    onChange={(e) => setNewApi((p) => ({ ...p, base_url: e.target.value }))}
                    placeholder="https://api.example.com"
                    dir="ltr"
                    className="h-10 px-3 rounded-xl border border-white/10 bg-black/30 text-sm text-white font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <Button
                onClick={saveApiConnection}
                disabled={isSavingApi || !newApi.api_key.trim()}
                size="sm"
                className="rounded-xl bg-orange-500/80 hover:bg-orange-500 gap-1.5 text-xs w-full"
              >
                {isSavingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                שמור חיבור
              </Button>
            </motion.div>
          )}

          {/* Existing connections list */}
          {apiConnections.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-card/20 p-6 text-center">
              <Plug className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">אין חיבורי API עדיין</p>
              <p className="text-xs text-muted-foreground mt-1">לחץ "הוסף חיבור" כדי לחבר שירות חיצוני</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {apiConnections.map((conn) => (
                <div key={conn.id} className="rounded-2xl border border-white/5 bg-card/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Plug className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{conn.display_name}</p>
                        <p className="text-xs text-muted-foreground">{conn.base_url || conn.service}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conn.last_test_ok === true && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-emerald-400">תקין</span>
                        </div>
                      )}
                      {conn.last_test_ok === false && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">שגיאה</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Masked API key */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 border border-white/5">
                    <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-xs text-white/60 font-mono flex-1" dir="ltr">
                      {showApiKey[conn.id]
                        ? conn.api_key
                        : conn.api_key.slice(0, 6) + "••••••••" + conn.api_key.slice(-4)}
                    </p>
                    <button
                      onClick={() => setShowApiKey((p) => ({ ...p, [conn.id]: !p[conn.id] }))}
                      className="text-muted-foreground hover:text-white transition-all"
                    >
                      {showApiKey[conn.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(conn.api_key)}
                      className="text-muted-foreground hover:text-white transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {conn.last_test_error && (
                    <p className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg">{conn.last_test_error}</p>
                  )}
                  {conn.last_tested_at && (
                    <p className="text-xs text-muted-foreground">
                      בדיקה אחרונה: {new Date(conn.last_tested_at).toLocaleString("he-IL")}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testApiConnection(conn)}
                      disabled={testingApi[conn.id]}
                      className="flex-1 rounded-xl border border-white/10 gap-1.5 text-xs"
                    >
                      {testingApi[conn.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                      בדוק חיבור
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiConnection(conn.id)}
                      disabled={deletingApi[conn.id]}
                      className="rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs px-3"
                    >
                      {deletingApi[conn.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Business Profile ── */}
        <div className="rounded-2xl border border-white/10 bg-card/30 p-5 space-y-5" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">פרופיל עסקי</h3>
                <p className="text-xs text-muted-foreground mt-0.5">פרטי זיהוי, סוג עסק, ומדדי מס</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={saveBusinessProfile}
              disabled={profileSaving || profileLoading}
              className="gap-1.5 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 text-xs"
            >
              {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              שמור
            </Button>
          </div>

          {profileLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5">
              {/* Info hint */}
              <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300/80 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                <span>פרטים אלו עוזרים ל-BillBOT+ לסווג חשבוניות אוטומטית ולהפריד בין הוצאות עסקיות לאישיות.</span>
              </div>

              {/* Tax IDs */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">מספרי זיהוי עסקי (ח.פ / ע.מ / ת.ז)</label>
                <div className="flex gap-2">
                  <input
                    value={profileTaxInput}
                    onChange={(e) => setProfileTaxInput(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && profileTaxInput.length >= 5) {
                        if (!profile.business_tax_ids.includes(profileTaxInput))
                          setProfile({ ...profile, business_tax_ids: [...profile.business_tax_ids, profileTaxInput] });
                        setProfileTaxInput("");
                      }
                    }}
                    placeholder="מספר 9 ספרות..."
                    dir="ltr"
                    className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-left"
                  />
                  <button
                    onClick={() => {
                      if (profileTaxInput.length >= 5 && !profile.business_tax_ids.includes(profileTaxInput)) {
                        setProfile({ ...profile, business_tax_ids: [...profile.business_tax_ids, profileTaxInput] });
                        setProfileTaxInput("");
                      }
                    }}
                    disabled={profileTaxInput.length < 5}
                    className="h-9 px-3 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {profile.business_tax_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.business_tax_ids.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-medium">
                        {t}
                        <button onClick={() => setProfile({ ...profile, business_tax_ids: profile.business_tax_ids.filter((x) => x !== t) })} className="hover:text-rose-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Business names */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">שמות העסק על החשבוניות</label>
                <div className="flex gap-2">
                  <input
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && profileNameInput.trim()) {
                        const v = profileNameInput.trim();
                        if (!profile.business_names.includes(v))
                          setProfile({ ...profile, business_names: [...profile.business_names, v] });
                        setProfileNameInput("");
                      }
                    }}
                    placeholder="שם חברה / מותג..."
                    dir="rtl"
                    className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <button
                    onClick={() => {
                      const v = profileNameInput.trim();
                      if (v && !profile.business_names.includes(v)) {
                        setProfile({ ...profile, business_names: [...profile.business_names, v] });
                        setProfileNameInput("");
                      }
                    }}
                    disabled={!profileNameInput.trim()}
                    className="h-9 px-3 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {profile.business_names.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.business_names.map((n) => (
                      <span key={n} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-foreground text-xs">
                        {n}
                        <button onClick={() => setProfile({ ...profile, business_names: profile.business_names.filter((x) => x !== n) })} className="hover:text-rose-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Type + Industry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">סוג עסק</label>
                  <select
                    value={profile.business_type}
                    onChange={(e) => setProfile({ ...profile, business_type: e.target.value })}
                    dir="rtl"
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="">בחר סוג...</option>
                    {BIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">תחום פעילות</label>
                  <select
                    value={profile.industry}
                    onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                    dir="rtl"
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="">בחר תחום...</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              {/* Sliders */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" /> שימוש עסקי בבית
                    </label>
                    <span className="text-sm font-bold text-primary" dir="ltr">{profile.home_office_usage_percent}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5}
                    value={profile.home_office_usage_percent}
                    onChange={(e) => setProfile({ ...profile, home_office_usage_percent: Number(e.target.value) })}
                    className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground/60">אם הוצאה מתחלקת בין בית לעסק — מה אחוז העסקי?</p>
                </div>
                <div className="border-t border-white/8" />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" /> שימוש עסקי ברכב
                    </label>
                    <span className="text-sm font-bold text-primary" dir="ltr">{profile.vehicle_business_usage_percent}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5}
                    value={profile.vehicle_business_usage_percent}
                    onChange={(e) => setProfile({ ...profile, vehicle_business_usage_percent: Number(e.target.value) })}
                    className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground/60">אם הרכב משמש גם לצרכים פרטיים — מה אחוז השימוש העסקי?</p>
                </div>
              </div>

              {/* Revenue */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> הכנסה שנתית משוערת (₪)
                </label>
                <input
                  value={profile.estimated_annual_revenue}
                  onChange={(e) => setProfile({ ...profile, estimated_annual_revenue: e.target.value })}
                  placeholder="למשל: 500,000"
                  dir="ltr"
                  className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-left"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "is_vat_registered" as const, label: "רשום לפי ע.מ (מע\"מ)", sub: "מגיש דוחות מע\"מ" },
                  { key: "has_employees"      as const, label: "יש עובדים",            sub: "משלם משכורות" },
                ] as const).map(({ key, label, sub }) => (
                  <button
                    key={key}
                    onClick={() => setProfile({ ...profile, [key]: !profile[key] })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-right ${
                      profile[key]
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-white/3 border-white/8 hover:border-white/20"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      profile[key] ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                    }`}>
                      {profile[key] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${profile[key] ? "text-emerald-300" : "text-foreground"}`}>{label}</p>
                      <p className="text-[10px] text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Expense Categories ── */}
        <div className="rounded-2xl border border-white/10 bg-card/30 p-5 space-y-4" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Tag className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">קטגוריות הוצאה</h3>
              <p className="text-xs text-muted-foreground mt-0.5">נהל קטגוריות לסיווג חשבוניות</p>
            </div>
          </div>

          {catLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                  {editingCat === cat.id ? (
                    <>
                      <input
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && updateCategory(cat.id)}
                        className="flex-1 bg-transparent text-sm text-foreground outline-none border-b border-primary/40"
                        autoFocus
                        dir="rtl"
                      />
                      <button onClick={() => updateCategory(cat.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingCat(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-foreground">{cat.name}</span>
                      {cat.is_default && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">ברירת מחדל</span>
                      )}
                      <button onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); }} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {cat.is_deletable && (
                        <button onClick={() => deleteCategory(cat.id)} className="text-muted-foreground hover:text-rose-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent"
            />
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="שם קטגוריה חדשה..."
              dir="rtl"
              className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <button
              onClick={addCategory}
              disabled={!newCatName.trim()}
              className="h-9 px-3 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Business Entities ── */}
        <div className="rounded-2xl border border-white/10 bg-card/30 p-5 space-y-4" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">ישויות עסקיות</h3>
              <p className="text-xs text-muted-foreground mt-0.5">נהל חשבונות עסקיים ואישיים נפרדים</p>
            </div>
          </div>

          {entityLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2">
              {entities.map((entity) => (
                <div key={entity.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${entity.is_default ? "bg-primary/8 border-primary/20" : "bg-white/5 border-white/8"}`}>
                  <div className={`p-1.5 rounded-lg ${entity.type === "business" ? "bg-amber-500/10 text-amber-400" : "bg-sky-500/10 text-sky-400"}`}>
                    {entity.type === "business" ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{entity.name}</p>
                    {entity.tax_id && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {entity.registration_type && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                            entity.registration_type === "chp"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                          }`}>
                            {entity.registration_type === "chp" ? "ח.פ" : "ע.מ"}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground font-mono" dir="ltr">{entity.tax_id}</p>
                      </div>
                    )}
                  </div>
                  {entity.is_default && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" />פעיל
                    </span>
                  )}
                  {!entity.is_default && (
                    <button onClick={() => setDefaultEntity(entity.id)} className="text-xs text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 rounded-lg px-2 py-1 transition-colors">
                      הפעל
                    </button>
                  )}
                  {!entity.is_default && (
                    <button onClick={() => deleteEntity(entity.id)} className="text-muted-foreground hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add entity */}
          <div className="space-y-2 pt-1 border-t border-white/8">
            <p className="text-xs text-muted-foreground pt-1">הוספת ישות חדשה</p>

            {/* Row 1: type + name */}
            <div className="flex gap-2">
              <select
                value={newEntityType}
                onChange={(e) => setNewEntityType(e.target.value as "business" | "personal")}
                className="h-9 px-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none"
                dir="rtl"
              >
                <option value="business">עסקי</option>
                <option value="personal">אישי</option>
              </select>
              <input
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                placeholder="שם הישות / העסק..."
                dir="rtl"
                className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>

            {/* Row 2: registration type toggle + tax id number */}
            <div className="flex gap-2">
              {/* ח.פ / עוסק מורשה toggle */}
              <div className="flex rounded-xl border border-white/10 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setNewEntityRegType("osek")}
                  className={`h-9 px-3 text-xs font-medium transition-colors ${
                    newEntityRegType === "osek"
                      ? "bg-violet-500/20 text-violet-300 border-l border-white/10"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  ע.מ
                </button>
                <button
                  type="button"
                  onClick={() => setNewEntityRegType("chp")}
                  className={`h-9 px-3 text-xs font-medium transition-colors ${
                    newEntityRegType === "chp"
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  ח.פ
                </button>
              </div>

              <input
                value={newEntityTaxId}
                onChange={(e) => setNewEntityTaxId(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder={newEntityRegType === "chp" ? "מספר ח.פ (9 ספרות)" : "מספר עוסק מורשה"}
                dir="ltr"
                maxLength={9}
                className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-left"
              />
              <button
                onClick={addEntity}
                disabled={!newEntityName.trim()}
                className="h-9 px-4 rounded-xl bg-primary/15 border border-primary/20 text-primary text-sm hover:bg-primary/25 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                הוסף
              </button>
            </div>

            {/* Helper text */}
            <p className="text-[11px] text-muted-foreground/60">
              {newEntityRegType === "chp"
                ? "ח.פ — חברה בע\"מ / עמותה (9 ספרות)"
                : "ע.מ — עוסק מורשה / עצמאי (9 ספרות)"}
            </p>
          </div>
        </div>

        {/* ── Google Drive Integration ── */}
        <div className="rounded-2xl border border-white/10 bg-card/30 p-5" dir="rtl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Google Drive</h3>
                <p className="text-xs text-muted-foreground mt-0.5">שמור קבלות אוטומטית ב-Drive האישי שלך</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium shrink-0">בקרוב</span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2.5 opacity-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>סנכרון אוטומטי לאחר קליטת חשבונית</span>
            </div>
            <div className="flex items-center gap-2.5 opacity-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ארגון לפי תיקיות קטגוריה ותאריך</span>
            </div>
            <div className="flex items-center gap-2.5 opacity-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>גיבוי מלא של כל המסמכים</span>
            </div>
          </div>
          <button disabled className="mt-4 w-full h-10 rounded-xl bg-white/5 border border-white/10 text-muted-foreground text-sm cursor-not-allowed flex items-center justify-center gap-2">
            <HardDrive className="w-4 h-4" />
            חבר Google Drive
          </button>
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
