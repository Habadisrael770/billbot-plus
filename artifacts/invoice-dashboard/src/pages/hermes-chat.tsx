/**
 * HermesChat — Hermes Starter Kit (BILLIBOT+ adaptation)
 *
 * Standalone RTL Hebrew chat page. Authenticates via the app's session cookie
 * (bb_sid) — every request uses `credentials: "include"`, so no auth header is
 * needed. API calls are prefixed with the artifact base path so they resolve
 * correctly under both "/" and a sub-path deployment.
 */

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Send, Loader2, AlertCircle, Wifi, WifiOff, RefreshCw, Coins } from "lucide-react";

// API base — mirrors the helper used in App.tsx
const API = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/\/$/, "");

let _idCounter = 0;
function uid() { return `msg-${Date.now()}-${++_idCounter}`; }

interface Message {
  id: string;
  role: "user" | "hermes";
  text: string;
  ts: Date;
}

interface HermesChatProps {
  isAdmin?: boolean;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  emptyText?: string;
  noCreditsText?: string;
  offlineText?: string;
  thinkingText?: string;
  sendLabel?: string;
}

export default function HermesChat({
  isAdmin = false,
  title = "הרמס AI",
  subtitle = "העוזר החכם של BILLIBOT+",
  placeholder = "כתבו הודעה…",
  emptyText = "שאלו אותי כל דבר על חשבוניות, הוצאות, ספקים ואוטומציות ב-BILLIBOT+.",
  noCreditsText = "נגמרו הקרדיטים. פנו למנהל המערכת.",
  offlineText = "הרמס לא מחובר כרגע. בודקים את החיבור לשרת…",
  thinkingText = "חושב…",
  sendLabel = "שלח",
}: HermesChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId] = useState(() => `conv-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: healthData, refetch: refetchHealth } = useQuery({
    queryKey: ["/api/hermes/health"],
    queryFn: async () => {
      const res = await fetch(`${API}/hermes/health`, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const { data: creditsData, refetch: refetchCredits } = useQuery({
    queryKey: ["/api/hermes/credits"],
    queryFn: async () => {
      const res = await fetch(`${API}/hermes/credits`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const isOnline = (healthData as any)?.ok === true;
  const balance: number | null = (creditsData as any)?.balance ?? null;
  const isBlocked = balance !== null && balance <= 0 && !isAdmin;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`${API}/hermes/message`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "hermes", text: data?.reply || "(אין תשובה)", ts: new Date() },
      ]);
      refetchCredits();
    },
    onError: (err: any) => {
      const status = err?.status;
      const text =
        status === 402 ? noCreditsText :
        status === 401 ? "יש להתחבר כדי להשתמש בהרמס." :
        err?.data?.error || "אירעה שגיאה. נסו שוב.";
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "hermes", text, ts: new Date() },
      ]);
      refetchCredits();
    },
  });

  function handleSend() {
    const text = input.trim();
    if (!text || sendMutation.isPending || isBlocked || !isOnline) return;
    setMessages((prev) => [...prev, { id: uid(), role: "user", text, ts: new Date() }]);
    setInput("");
    sendMutation.mutate(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function fmt(d: Date) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 4rem)", maxWidth: 720, margin: "0 auto", padding: 16, gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={20} color="#7c3aed" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{subtitle}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {balance !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px", border: "1px solid #d1fae5", borderRadius: 20, color: "#059669" }}>
              <Coins size={12} />
              {isAdmin ? "∞" : balance} קרדיטים
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px", border: `1px solid ${isOnline ? "#d1fae5" : "#fee2e2"}`, borderRadius: 20, color: isOnline ? "#059669" : "#dc2626" }}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? "מחובר" : "מנותק"}
          </span>
          <button onClick={() => { refetchHealth(); refetchCredits(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6 }} title="רענן">
            <RefreshCw size={16} color="#6b7280" />
          </button>
        </div>
      </div>

      {/* No-credits banner */}
      {isBlocked && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 16px" }}>
          <AlertCircle size={16} /> {noCreditsText}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#f9fafb", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", textAlign: "center", gap: 12 }}>
            <Bot size={48} color="#d1d5db" />
            <p style={{ fontSize: 14 }}>{emptyText}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              {msg.role === "hermes" && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}>
                  <Bot size={16} color="#7c3aed" />
                </div>
              )}
              <div style={{
                maxWidth: "80%", borderRadius: msg.role === "user" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                padding: "10px 14px", fontSize: 14, whiteSpace: "pre-wrap",
                background: msg.role === "user" ? "#7c3aed" : "#ffffff",
                color: msg.role === "user" ? "#ffffff" : "#111827",
                border: msg.role === "hermes" ? "1px solid #e5e7eb" : "none",
              }}>
                {msg.text}
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>{fmt(msg.ts)}</div>
              </div>
            </div>
          ))
        )}

        {sendMutation.isPending && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bot size={16} color="#7c3aed" />
            </div>
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#6b7280" }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {thinkingText}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isBlocked ? noCreditsText : placeholder}
          rows={2}
          disabled={sendMutation.isPending || !isOnline || isBlocked}
          style={{ flex: 1, resize: "none", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", outline: "none" }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending || !isOnline || isBlocked}
          style={{ height: 72, width: 48, borderRadius: 10, background: "#7c3aed", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: (!input.trim() || sendMutation.isPending || !isOnline || isBlocked) ? 0.5 : 1 }}
          title={sendLabel}
        >
          {sendMutation.isPending
            ? <Loader2 size={18} color="white" style={{ animation: "spin 1s linear infinite" }} />
            : <Send size={18} color="white" />}
        </button>
      </div>

      {!isOnline && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "8px 12px" }}>
          <AlertCircle size={12} /> {offlineText}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
