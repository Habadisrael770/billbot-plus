import React, { useRef, useState } from "react";
import { Mail, MailPlus, X, Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListInvoicesQueryKey,
  getGetInvoiceSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type EmailMode = "scan" | "attach";

interface EmailScanModalProps {
  isOpen: boolean;
  mode: EmailMode;
  onClose: () => void;
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

export function EmailScanModal({ isOpen, mode: initialMode, onClose }: EmailScanModalProps) {
  const [activeMode, setActiveMode] = useState<EmailMode>(initialMode);
  const [emailText, setEmailText] = useState("");
  const [emlFile, setEmlFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInvoiceSummaryQueryKey() });
  };

  const reset = () => {
    setEmailText("");
    setEmlFile(null);
    setDragOver(false);
    setIsProcessing(false);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleEmlDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setEmlFile(file);
  };

  const handleEmlSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEmlFile(file);
  };

  const handleSubmit = async () => {
    if (activeMode === "scan" && !emailText.trim()) {
      toast({ title: "שדה ריק", description: "הדבק את תוכן המייל לפני השליחה.", variant: "destructive" });
      return;
    }
    if (activeMode === "attach" && !emlFile) {
      toast({ title: "לא נבחר קובץ", description: "בחר קובץ EML לפני השליחה.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      if (activeMode === "scan") {
        formData.append("emailText", emailText);
      } else if (emlFile) {
        formData.append("file", emlFile);
      }
      formData.append("source", activeMode);

      const res = await fetch(`${API_BASE}/invoices/scan-email`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בעיבוד המייל");

      setSuccess(true);
      invalidate();
      toast({ title: "המייל עובד בהצלחה", description: `נוספה ${data.count ?? 1} חשבונית/ות מהמייל.` });
      setTimeout(handleClose, 1800);
    } catch (err: unknown) {
      toast({
        title: "שגיאת עיבוד",
        description: err instanceof Error ? err.message : "לא ניתן לעבד את המייל.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pb-[68px] sm:pb-4">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">סריקת מייל</h2>
              <p className="text-xs text-muted-foreground">ייבוא חשבוניות ממייל</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveMode("scan")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              activeMode === "scan"
                ? "text-violet-400 border-b-2 border-violet-400"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" />
            הדבק תוכן מייל
          </button>
          <button
            onClick={() => setActiveMode("attach")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              activeMode === "attach"
                ? "text-violet-400 border-b-2 border-violet-400"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <MailPlus className="w-4 h-4" />
            צרף קובץ EML
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-400" />
              <p className="text-white font-medium">המייל עובד בהצלחה!</p>
            </div>
          ) : activeMode === "scan" ? (
            <>
              <p className="text-xs text-muted-foreground">העתק והדבק את תוכן המייל (כולל כותרת, שולח, גוף) כאן:</p>
              <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder={`From: supplier@example.com\nSubject: חשבונית מס' 1234\n\nשלום,\nמצורפת חשבונית עבור...\nסכום: ₪5,850\nמע"מ: ₪850`}
                rows={9}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all font-mono text-xs leading-relaxed"
              />
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">גרור קובץ EML לכאן, או לחץ לבחירה:</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleEmlDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed h-44 cursor-pointer transition-all ${
                  dragOver
                    ? "border-violet-500 bg-violet-500/10"
                    : emlFile
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5"
                }`}
              >
                {emlFile ? (
                  <>
                    <FileText className="w-10 h-10 text-emerald-400" />
                    <p className="text-sm text-white font-medium">{emlFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(emlFile.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm text-white/70">גרור קובץ .eml לכאן</p>
                    <p className="text-xs text-muted-foreground">או לחץ לבחירה</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml,message/rfc822"
                className="hidden"
                onChange={handleEmlSelect}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 pb-6 flex gap-3 justify-end">
            <Button variant="ghost" onClick={handleClose} className="rounded-xl border border-white/10">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {isProcessing ? "מעבד..." : "סרוק מייל"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
