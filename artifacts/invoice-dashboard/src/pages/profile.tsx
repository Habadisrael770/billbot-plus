import React, { useState } from "react";
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
          {/* Left: Personal info */}
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

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={CARD}
            >
              <h3 className={SECTION_TITLE}>
                <Shield className="w-4 h-4 text-emerald-400" />
                אבטחה
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

          {/* Right: Notifications + stats */}
          <div className="space-y-6">
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

            {/* Stats summary */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
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
