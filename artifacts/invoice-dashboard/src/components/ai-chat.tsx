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
} from "lucide-react";

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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-110 transition-transform"
        title="צ'אט AI"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Bot className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[520px] rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl flex flex-col overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-violet-900/40 to-blue-900/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">אינבוי AI</p>
                  <p className="text-xs text-violet-400">DeepSeek · זוכר שיחות</p>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
