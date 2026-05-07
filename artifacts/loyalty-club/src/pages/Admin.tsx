import React, { useState } from "react";
import { Link } from "wouter";
import { useLoyaltyMembers, useLoyaltyStats, useDeleteMember, useResendWhatsApp } from "@/hooks/use-loyalty";
import { Users, UserCheck, Clock, Send, Trash2, Search, ArrowRight, Loader2, Store, Activity, MoreVertical } from "lucide-react";

export default function Admin() {
  const { data: stats, isLoading: statsLoading } = useLoyaltyStats();
  const { data: members, isLoading: membersLoading } = useLoyaltyMembers();
  
  const [searchTerm, setSearchTerm] = useState("");
  
  const deleteMutation = useDeleteMember();
  const resendMutation = useResendWhatsApp();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את הלקוח ${name}?`)) {
      setDeletingId(id);
      deleteMutation.mutate(id, {
        onSettled: () => setDeletingId(null)
      });
    }
  };

  const handleResend = (id: string) => {
    setResendingId(id);
    resendMutation.mutate(id, {
      onSuccess: () => {
        alert("הודעת וואטסאפ נשלחה בהצלחה!");
      },
      onSettled: () => setResendingId(null)
    });
  };

  const filteredMembers = members?.filter(m => 
    m.fullName.includes(searchTerm) || m.phone.includes(searchTerm)
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Top Navigation */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">פאנל ניהול מועדון</h1>
          </div>
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors">
            חזרה לעמדת הרשמה
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="סה״כ לקוחות" 
            value={statsLoading ? "-" : stats?.total || 0} 
            icon={<Users className="w-5 h-5" />} 
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <StatCard 
            title="מאושרים מלא" 
            value={statsLoading ? "-" : stats?.fullyOnboarded || 0} 
            icon={<UserCheck className="w-5 h-5" />} 
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-500/10"
          />
          <StatCard 
            title="ממתינים לאישור" 
            value={statsLoading ? "-" : (stats?.pendingStep1 || 0) + (stats?.pendingStep2 || 0)} 
            icon={<Clock className="w-5 h-5" />} 
            color="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-500/10"
          />
          <StatCard 
            title="הצטרפו לאחרונה" 
            value={statsLoading ? "-" : stats?.recentCount || 0} 
            icon={<Activity className="w-5 h-5" />} 
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-500/10"
          />
        </div>

        {/* Table Section */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-foreground">רשימת חברי מועדון</h2>
            
            <div className="relative w-full sm:w-72">
              <Search className="w-5 h-5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="חיפוש לפי שם או טלפון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {membersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>טוען נתונים...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg">לא נמצאו לקוחות</p>
                {searchTerm && <p className="text-sm mt-1">נסה לשנות את מילות החיפוש</p>}
              </div>
            ) : (
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border">
                    <th className="px-6 py-4 font-medium">שם לקוח</th>
                    <th className="px-6 py-4 font-medium">טלפון</th>
                    <th className="px-6 py-4 font-medium">סטטוס מועדון</th>
                    <th className="px-6 py-4 font-medium">תאריך הצטרפות</th>
                    <th className="px-6 py-4 font-medium w-[100px]">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.map((member, i) => (
                    <tr 
                      key={member.id} 
                      className="hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{member.fullName}</div>
                        {member.email && <div className="text-xs text-muted-foreground mt-0.5">{member.email}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm" dir="ltr">{member.phone}</td>
                      <td className="px-6 py-4">
                        <StatusBadge step={member.onboardingStep} />
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleResend(member.id)}
                            disabled={resendingId === member.id || member.onboardingStep === 2}
                            title="שלח תזכורת בוואטסאפ"
                            className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resendingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDelete(member.id, member.fullName)}
                            disabled={deletingId === member.id}
                            title="מחק לקוח"
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color, bgColor }: { title: string, value: number | string, icon: React.ReactNode, color: string, bgColor: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgColor} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ step }: { step: number }) {
  if (step === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        מאושר מלא
      </span>
    );
  }
  if (step === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        אישר שלב 1
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
      ממתין לאישור
    </span>
  );
}
