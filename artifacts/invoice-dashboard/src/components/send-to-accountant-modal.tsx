import React, { useState } from "react";
import { X, FileSpreadsheet, Download, Send, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SendToAccountantModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceCount: number;
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

export function SendToAccountantModal({ isOpen, onClose, invoiceCount }: SendToAccountantModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setSent(false);
    onClose();
  };

  const handleExcelDownload = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/invoices/export`, { method: "GET" });
      if (!res.ok) throw new Error("שגיאה בייצוא");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `חשבוניות_${new Date().toLocaleDateString("he-IL").replace(/\//g, "-")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "הקובץ הורד בהצלחה", description: "קובץ האקסל נשמר למחשב שלך." });
    } catch (err: unknown) {
      toast({
        title: "שגיאת ייצוא",
        description: err instanceof Error ? err.message : "לא ניתן לייצא.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendTelegram = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/invoices/send-accountant`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בשליחה");
      setSent(true);
      toast({ title: "נשלח בהצלחה", description: "הדוח נשלח לטלגרם." });
    } catch (err: unknown) {
      toast({
        title: "שגיאת שליחה",
        description: err instanceof Error ? err.message : "לא ניתן לשלוח.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">שלח לרו"ח</h2>
              <p className="text-xs text-muted-foreground">ייצוא ושליחת חשבוניות לרואה חשבון</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-400" />
              <p className="text-white font-medium">הדוח נשלח בהצלחה לטלגרם!</p>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="rounded-xl border border-white/5 bg-white/3 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{invoiceCount} חשבוניות</p>
                  <p className="text-xs text-muted-foreground">מוכנות לייצוא עם פרטים מלאים וקישורים לקבצים</p>
                </div>
              </div>

              {/* What's included */}
              <div className="rounded-xl border border-white/5 bg-white/2 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">הקובץ יכלול:</p>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "מספר חשבונית, ספק, תאריך",
                    "סכום, מע\"מ, מטבע",
                    "קטגוריה ומקור",
                    "קישור לקובץ PDF / JPG",
                    "סטטוס אישור וכפילות",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-white/70">
                      <ExternalLink className="w-3 h-3 text-emerald-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div className="px-6 pb-6 flex flex-col gap-2">
            <Button
              onClick={handleExcelDownload}
              disabled={isExporting}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2 h-11"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? "מכין קובץ..." : "הורד קובץ אקסל"}
            </Button>
            <Button
              onClick={handleSendTelegram}
              disabled={isSending}
              variant="ghost"
              className="w-full rounded-xl border border-white/10 gap-2 h-11"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending ? "שולח..." : "שלח דרך טלגרם"}
            </Button>
            <Button variant="ghost" onClick={handleClose} className="w-full rounded-xl text-muted-foreground h-9">
              ביטול
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
