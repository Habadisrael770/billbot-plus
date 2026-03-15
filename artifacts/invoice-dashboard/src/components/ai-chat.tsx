import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Loader2,
  Trash2,
  MessageSquarePlus,
  ChevronDown,
  Sparkles,
  Lock,
  Zap,
  Clock,
} from "lucide-react";

const TRIAL_DAYS = 7;
const TRIAL_KEY = "bb_chat_trial_start";

function getSelectedPlan(): string {
  try {
    const saved = localStorage.getItem("bb_onboarding_progress");
    if (saved) {
      const d = JSON.parse(saved) as { plan?: string };
      return d.plan ?? "free";
    }
  } catch { /* ignore */ }
  return "free";
}

function getTrialInfo(): { inTrial: boolean; daysLeft: number; trialExpired: boolean } {
  let startStr = localStorage.getItem(TRIAL_KEY);
  if (!startStr) {
    startStr = new Date().toISOString();
    localStorage.setItem(TRIAL_KEY, startStr);
  }
  const startDate = new Date(startStr);
  const now = new Date();
  const elapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
  return {
    inTrial: elapsed < TRIAL_DAYS,
    daysLeft,
    trialExpired: elapsed >= TRIAL_DAYS,
  };
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  createdAt: string;
};

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const plan = getSelectedPlan();
  const isPaid = plan === "starter" || plan === "business";
  const trial = getTrialInfo();
  const hasAccess = isPaid || trial.inTrial;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showConvList, setShowConvList] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/openrouter/conversations`);
      const data = await res.json() as Conversation[];
      setConversations(data);
    } catch { /* silent */ }
  }, []);

  const loadMessages = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`${API_BASE}/openrouter/conversations/${convId}`);
      const data = await res.json() as { messages: Message[] };
      setMessages(data.messages ?? []);
      scrollBottom();
    } catch { /* silent */ }
  }, []);

  const createConversation = async () => {
    const res = await fetch(`${API_BASE}/openrouter/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "שיחה חדשה" }),
    });
    const conv = await res.json() as Conversation;
    setConversations((p) => [conv, ...p]);
    setActiveConvId(conv.id);
    setMessages([]);
    setShowConvList(false);
    // Welcome message
    setMessages([{
      id: -1,
      role: "assistant",
      content: "שלום! אני **אינבוי**, עוזר ה-AI שלך למערכת החשבוניות 🤖\n\nאני יכול לעזור לך עם:\n- שאלות על חשבוניות וספקים\n- הסברים על קטגוריות וסיווגי מס\n- עזרה עם כפילויות\n- הסברים על חיבור Gmail/Outlook\n\nשאל אותי כל שאלה!",
    }]);
  };

  const deleteConversation = async (convId: number) => {
    await fetch(`${API_BASE}/openrouter/conversations/${convId}`, { method: "DELETE" });
    setConversations((p) => p.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      if (!activeConvId) createConversation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (activeConvId && messages.length === 0) loadMessages(activeConvId);
  }, [activeConvId, loadMessages, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !activeConvId) return;
    const userText = input.trim();
    setInput("");
    const userMsg: Message = { id: Date.now(), role: "user", content: userText };
    setMessages((p) => [...p, userMsg]);
    scrollBottom();

    setIsStreaming(true);
    const assistantId = Date.now() + 1;
    setMessages((p) => [...p, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const response = await fetch(`${API_BASE}/openrouter/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userText }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; error?: string };
            if (json.content) {
              setMessages((p) =>
                p.map((m) => m.id === assistantId ? { ...m, content: m.content + json.content! } : m)
              );
              scrollBottom();
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setMessages((p) =>
        p.map((m) => m.id === assistantId ? { ...m, content: "שגיאה בחיבור לשרת AI." } : m)
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render markdown-lite (bold **text**)
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-[72px] right-2 md:bottom-6 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        style={{
          background: hasAccess
            ? "hsl(var(--primary))"
            : "linear-gradient(135deg, #374151, #1f2937)",
          boxShadow: hasAccess
            ? "0 8px 24px hsl(var(--primary) / 0.35)"
            : "0 8px 24px rgba(0,0,0,0.3)",
        }}
        title={
          isPaid ? "יועץ BillBOT+"
          : trial.inTrial ? `יועץ AI — ניסיון חינם (${trial.daysLeft} ימים)`
          : "AI יועץ — נעול"
        }
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              {hasAccess
                ? <Bot className="w-6 h-6 text-white" />
                : <Lock className="w-5 h-5 text-white/70" />
              }
            </motion.div>
          )}
        </AnimatePresence>
        {!isPaid && trial.inTrial && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] rounded-full bg-teal text-[9px] font-bold text-white flex items-center justify-center px-0.5">{trial.daysLeft}</span>
        )}
        {!hasAccess && (
          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">!</span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[136px] right-2 md:bottom-24 md:right-6 z-50 w-[calc(100vw-1rem)] sm:w-80 md:w-96 h-[520px] rounded-2xl border border-[#4361ee]/25 bg-[#060d20] shadow-2xl flex flex-col overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#4361ee]/15" style={{ background: "linear-gradient(90deg, #4361ee22 0%, #2dd4bf18 100%)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4361ee33, #2dd4bf22)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#2dd4bf" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">יועץ BillBOT+</p>
                  <p className="text-xs" style={{ color: "#2dd4bf" }}>
                    {isPaid ? "AI חכם · זוכר שיחות" : trial.inTrial ? `ניסיון חינם · ${trial.daysLeft} ימים נותרו` : "תקופת ניסיון הסתיימה"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowConvList((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
                  title="שיחות"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showConvList ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={createConversation}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
                  title="שיחה חדשה"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Trial banner (free plan, trial active) ── */}
            {!isPaid && trial.inTrial && (
              <div className="flex items-center gap-2 px-4 py-2 bg-teal/10 border-b border-teal/20">
                <Clock className="w-3.5 h-3.5 text-teal shrink-0" />
                <span className="text-xs text-teal font-medium">ניסיון חינם · {trial.daysLeft} ימים נותרו</span>
                <button
                  onClick={() => { setIsOpen(false); window.location.href = "/settings"; }}
                  className="mr-auto text-[10px] font-bold transition-colors" style={{ color: "#4361ee" }}
                >
                  שדרג
                </button>
              </div>
            )}

            {/* ── Upgrade wall (trial expired, free plan) ── */}
            {!hasAccess && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-[15px]">תקופת הניסיון הסתיימה</p>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">
                    נגמרו 7 ימי הניסיון החינם.<br/>שדרג לתוכנית Starter כדי להמשיך להשתמש ביועץ AI
                  </p>
                </div>
                <div className="space-y-2 w-full text-right">
                  {["זוכר את כל השיחות הקודמות", "ניתוח חשבוניות וספקים", "המלצות לחסכון במס"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-white/60">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setIsOpen(false); window.location.href = "/settings"; }}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Zap className="w-4 h-4" /> שדרג לStarter
                </button>
              </div>
            )}

            {/* ── Full chat (paid plans only) ── */}
            {hasAccess && <>

            {/* Conversations list */}
            <AnimatePresence>
              {showConvList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-white/5 bg-black/20 overflow-hidden"
                >
                  <div className="max-h-36 overflow-y-auto">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5 transition-all ${activeConvId === conv.id ? "bg-violet-500/10" : ""}`}
                        onClick={() => { setActiveConvId(conv.id); setMessages([]); setShowConvList(false); }}
                      >
                        <span className="text-xs text-white/80 truncate flex-1">{conv.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-tr-sm"
                        : "bg-white/8 border border-white/10 text-white/90 rounded-tl-sm"
                    }`}
                  >
                    {msg.content === "" && isStreaming ? (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap">{renderContent(msg.content)}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5 bg-black/20">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="שאל אותי כל דבר..."
                  rows={1}
                  dir="rtl"
                  disabled={isStreaming}
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all max-h-24 disabled:opacity-50"
                  style={{ minHeight: "40px" }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 96) + "px";
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isStreaming || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* end hasAccess paid section */}
            </>}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
