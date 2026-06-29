import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Bell,
  Key,
  Save,
  Camera,
  CheckCircle2,
  CreditCard,
  Zap,
  MailCheck,
  MessageCircle,
  Ban,
  FileText,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const CARD = "rounded-2xl border border-white/5 bg-card/30 backdrop-blur-xl p-6";
const SECTION_TITLE = "text-base font-semibold text-white mb-4 flex items-center gap-2";

function Field({
  label,
  icon: Icon,
  ...props
}: { label: string; icon?: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <Input
          {...props}
          className={`bg-black/20 border-white/10 focus:border-primary text-white rounded-xl h-10 ${Icon ? "pl-9" : ""}`}
        />
      </div>
    </div>
  );
}

type NotifKey = "duplicateAlerts" | "approvalReminders" | "weeklyReport" | "systemUpdates";

const PLAN_LABELS: Record<string, string> = {
  basic: "בסיס",
  pro: "פרו",
  business: "ביזנס",
};

const PLAN_LIMITS: Record<string, { invoices: number; emails: number; whatsapp: number; whatsappReceipts: number; blockedVendors: number }> = {
  basic:    { invoices: 20,       emails: 1,  whatsapp: 1,  whatsappReceipts: 10,  blockedVendors: 2 },
  pro:      { invoices: 100,      emails: 3,  whatsapp: 3,  whatsappReceipts: 30,  blockedVendors: 10 },
  business: { invoices: 999999,   emails: 10, whatsapp: 10, whatsappReceipts: 100, blockedVendors: 999999 },
};

const _PROFILE_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "") + "/api";

function usePlanStats() {
  const [plan] = useState<string>(() => localStorage.getItem("bb_plan") ?? "business");
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [blockedVendors, setBlockedVendors] = useState(0);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [outlookCount, setOutlookCount] = useState(0);

  useEffect(() => {
    fetch(`${_PROFILE_BASE}/invoices`, { credentials: "include" }).then(r => r.json()).then((data: unknown[]) => {
      if (Array.isArray(data)) setTotalInvoices(data.length);
    }).catch(() => {});

    fetch(`${_PROFILE_BASE}/vendors`, { credentials: "include" }).then(r => r.json()).then((data: unknown[]) => {
      if (Array.isArray(data)) {
        const blocked = (data as { isBlocked?: boolean }[]).filter(v => v.isBlocked).length;
        setBlockedVendors(blocked);
      }
    }).catch(() => {});

    fetch(`${_PROFILE_BASE}/gmail-auth/status`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then((data) => setGmailConnected(data?.connected === true))
      .catch(() => setGmailConnected(false));

    try {
      const outlookRaw = localStorage.getItem("bb_outlook_accounts");
      const outlook = outlookRaw ? JSON.parse(outlookRaw) : [];
      setOutlookCount(Array.isArray(outlook) ? outlook.length : 0);
    } catch { setOutlookCount(0); }
  }, []);

  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.basic;
  const connectedEmails = (gmailConnected ? 1 : 0) + outlookCount;
  const visibleInvoices = Math.min(totalInvoices, limits.invoices);

  return { plan, limits, totalInvoices, visibleInvoices, connectedEmails, blockedVendors };
}

function StatRow({
  icon: Icon,
  label,
  used,
  limit,
  iconColor = "text-blue-400",
}: {
  icon: React.ElementType;
  label: string;
  used: number;
  limit: number;
  iconColor?: string;
}) {
  const isUnlimited = limit >= 999999;
  const isFull = !isUnlimited && used >= limit;
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);

  return (
    <div className="space-y-1.5" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
          <span className="text-[13px] text-muted-foreground">{label}</span>
        </div>
        <span className={`text-[13px] font-semibold tabular-nums ${isFull ? "text-rose-400" : "text-foreground"}`}>
          {isUnlimited ? (
            <span className="text-emerald-400 text-xs">ללא הגבלה</span>
          ) : (
            <>{used}<span className="text-muted-foreground font-normal">/{limit}</span></>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isFull ? "bg-rose-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard() {
  const { plan, limits, totalInvoices, visibleInvoices, connectedEmails, blockedVendors } = usePlanStats();
  const planLabel = PLAN_LABELS[plan] ?? "בסיס";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={CARD}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${SECTION_TITLE} mb-0`}>
          <CreditCard className="w-4 h-4 text-violet-400" />
          תוכנית ומנוי
        </h3>
        <Link href="/integrations">
          <span className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
            ניהול מנוי
          </span>
        </Link>
      </div>

      {/* Plan badge */}
      <div className="flex items-center justify-between mb-5 p-3 rounded-xl bg-white/5 border border-white/5" dir="rtl">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-muted-foreground">תוכנית נוכחית</span>
        </div>
        <span className="text-sm font-bold text-white">{planLabel}</span>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-5">
        <StatRow
          icon={FileText}
          label={`חשבוניות זמינות לצפייה${totalInvoices > limits.invoices ? ` (מתוך ${totalInvoices} סה״כ)` : ""}`}
          used={visibleInvoices}
          limit={limits.invoices}
          iconColor="text-blue-400"
        />
        <StatRow
          icon={MailCheck}
          label="מיילים מחוברים"
          used={connectedEmails}
          limit={limits.emails}
          iconColor="text-emerald-400"
        />
        <StatRow
          icon={MessageCircle}
          label="וואטסאפ מחוברים"
          used={0}
          limit={limits.whatsapp}
          iconColor="text-green-400"
        />
        <StatRow
          icon={MessageCircle}
          label="קבלות וואטסאפ בחודש"
          used={0}
          limit={limits.whatsappReceipts}
          iconColor="text-teal-400"
        />
        <StatRow
          icon={Ban}
          label="ספקים חסומים"
          used={blockedVendors}
          limit={limits.blockedVendors}
          iconColor="text-rose-400"
        />
      </div>

      {/* Upgrade button */}
      {plan !== "business" && (
        <Link href="/integrations">
          <button className="w-full h-10 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: "linear-gradient(90deg, #7c3aed, #2563eb)" }}>
            <Zap className="w-3.5 h-3.5" />
            ראה מסלולים
          </button>
        </Link>
      )}
    </motion.div>
  );
}

function SecurityCard() {
  const { toast } = useToast();
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    fetch(`${_PROFILE_BASE}/gmail-auth/status`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then((data) => setGmailConnected(data?.connected === true))
      .catch(() => setGmailConnected(false));
  }, []);

  const handleExport = async () => {
    const read = async (path: string) => {
      const response = await fetch(`${_PROFILE_BASE}${path}`, { credentials: "include" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };

    try {
      const entries = await Promise.all(
        [
          ["user", "/auth/me"],
          ["invoices", "/invoices"],
          ["vendors", "/vendors"],
          ["categories", "/categories"],
          ["entities", "/entities"],
          ["businessProfile", "/business-profile"],
        ].map(async ([key, path]) => {
          try {
            return [key, await read(path)] as const;
          } catch (error) {
            return [key, { error: error instanceof Error ? error.message : String(error) }] as const;
          }
        }),
      );

      const payload = Object.fromEntries(entries);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), ...payload }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `billbot-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ title: "ייצוא נתונים", description: "קובץ JSON ירד בהצלחה." });
    } catch {
      toast({ title: "שגיאה", description: "לא הצלחנו לייצא את הנתונים.", variant: "destructive" });
    }
  };

  const handleDelete = () => {
    toast({
      title: "מחיקת חשבון",
      description: "מחיקה עצמאית עדיין לא זמינה. יש לפנות לתמיכה כדי לבצע מחיקה מאובטחת.",
      variant: "destructive",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={CARD}
    >
      <h3 className={SECTION_TITLE}>
        <Shield className="w-4 h-4 text-emerald-400" />
        אבטחה ופרטיות
      </h3>
      <div className="space-y-3" dir="rtl">
        {/* Google connection status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-white">
                {gmailConnected ? "מחובר עם Google" : "לא מחובר ל-Google"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {gmailConnected ? "החשבון מאומת" : "חבר את חשבון Gmail שלך"}
              </p>
            </div>
          </div>
          <span className={`w-2 h-2 rounded-full ${gmailConnected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
        </div>

        {/* Export data */}
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group"
        >
          <div className="flex items-center gap-3" dir="rtl">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-white">ייצוא נתונים</p>
              <p className="text-[11px] text-muted-foreground">הורד עותק בפורמט JSON</p>
            </div>
          </div>
          <span className="text-[12px] text-emerald-400 font-medium">הורד</span>
        </button>

        {/* Delete account */}
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-rose-500/5 transition-colors border border-transparent hover:border-rose-500/20 group"
        >
          <div className="flex items-center gap-3" dir="rtl">
            <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-rose-400">מחיקת חשבון</p>
              <p className="text-[11px] text-muted-foreground">מחיקה לצמיתות</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400/60 rotate-180" />
        </button>
      </div>
    </motion.div>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john@company.co.il",
    phone: "+972-50-000-0000",
    company: "חברה לדוגמה בע\"מ",
    role: "Admin",
  });

  const [notifications, setNotifications] = useState<Record<NotifKey, boolean>>({
    duplicateAlerts: true,
    approvalReminders: true,
    weeklyReport: false,
    systemUpdates: true,
  });

  const handleSave = () => {
    setSaved(true);
    toast({ title: "הפרופיל עודכן בהצלחה", description: "השינויים נשמרו." });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Avatar + name banner */}
        <div className={`${CARD} flex flex-col sm:flex-row items-center sm:items-start gap-6`}>
          <div className="relative shrink-0">
            <Avatar className="w-20 h-20 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
              <AvatarFallback className="bg-gradient-to-tr from-primary to-accent text-white text-2xl font-bold">
                JD
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/80 transition-colors">
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">{profile.email}</p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                {profile.role}
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                חשבון פעיל
              </Badge>
            </div>
          </div>
          <div className="sm:ml-auto text-center sm:text-right text-sm text-muted-foreground">
            <p className="font-medium text-white/60 text-xs uppercase tracking-wide">חבר מאז</p>
            <p className="mt-0.5">ינואר 2025</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Personal info + Security */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal details */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={CARD}
            >
              <h3 className={SECTION_TITLE}>
                <User className="w-4 h-4 text-primary" />
                פרטים אישיים
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="שם פרטי"
                  icon={User}
                  value={profile.firstName}
                  onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                />
                <Field
                  label="שם משפחה"
                  value={profile.lastName}
                  onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                />
                <Field
                  label="אימייל"
                  icon={Mail}
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
                <Field
                  label="טלפון"
                  icon={Phone}
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
                <Field
                  label="חברה"
                  icon={Building2}
                  value={profile.company}
                  onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
                  className="sm:col-span-2"
                />
              </div>
            </motion.div>

            {/* Password / 2FA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={CARD}
            >
              <h3 className={SECTION_TITLE}>
                <Lock className="w-4 h-4 text-amber-400" />
                שינוי סיסמה
              </h3>
              <div className="space-y-4">
                <Field label="סיסמה נוכחית" icon={Key} type="password" placeholder="••••••••" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="סיסמה חדשה" type="password" placeholder="••••••••" />
                  <Field label="אימות סיסמה" type="password" placeholder="••••••••" />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-white">אימות דו-שלבי</p>
                    <p className="text-xs text-muted-foreground mt-0.5">הגן על החשבון שלך</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Plan & Subscription */}
            <PlanCard />

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={CARD}
            >
              <h3 className={SECTION_TITLE}>
                <Bell className="w-4 h-4 text-amber-400" />
                התראות
              </h3>
              <div className="space-y-4">
                {(
                  [
                    { key: "duplicateAlerts" as NotifKey, label: "חשבוניות כפולות", desc: "התרעה על כפילויות שזוהו" },
                    { key: "approvalReminders" as NotifKey, label: "תזכורות אישור", desc: "חשבוניות הממתינות לאישור" },
                    { key: "weeklyReport" as NotifKey, label: "דוח שבועי", desc: "סיכום שבועי במייל" },
                    { key: "systemUpdates" as NotifKey, label: "עדכוני מערכת", desc: "שינויים ועדכונים" },
                  ] as const
                ).map(({ key, label, desc }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={notifications[key]}
                      onCheckedChange={(v) =>
                        setNotifications((prev) => ({ ...prev, [key]: v }))
                      }
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Security & Privacy */}
            <SecurityCard />

            {/* Activity summary */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={CARD}
            >
              <h3 className={SECTION_TITLE}>
                <CheckCircle2 className="w-4 h-4 text-primary" />
                פעילות
              </h3>
              <div className="space-y-3">
                {[
                  { label: "חשבוניות שאושרו", value: "0", color: "text-emerald-400" },
                  { label: "ספקים שזוהו", value: "2", color: "text-primary" },
                  { label: "כפילויות שנחסמו", value: "1", color: "text-rose-400" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="gap-2 px-8 rounded-xl bg-primary hover:bg-primary/90"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> נשמר!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> שמור שינויים
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </Layout>
  );
}
