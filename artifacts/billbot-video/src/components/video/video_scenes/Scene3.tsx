import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function GmailIcon() {
  return (
    <svg viewBox="0 0 48 48" width="60%" height="60%">
      <path fill="#EA4335" d="M6 40h6V22.5L24 32l12-9.5V40h6V16l-18 13L6 16z"/>
      <path fill="#FBBC05" d="M6 16v4l12 9V22.5z" opacity="0"/>
      <path fill="#FFFFFF" d="M6 40h6V22.5L24 32l12-9.5V40h6V16L24 29 6 16z"/>
      <path fill="#EA4335" d="M6 16l18 13 18-13H6z"/>
      <path fill="#C5221F" d="M6 16v4l12 9v-6.5z" opacity="0"/>
      <rect fill="#EA4335" x="0" y="14" width="48" height="4" opacity="0"/>
      <g>
        <path fill="#4285F4" d="M6 40V16l18 13z" opacity="0"/>
        <path fill="#34A853" d="M42 40V16L24 29z" opacity="0"/>
        <path fill="#FBBC05" d="M6 16v4l18 9V16z" opacity="0"/>
        <path fill="#EA4335" d="M42 16v4L24 29V16z" opacity="0"/>
      </g>
      <path fill="none" stroke="#EA4335" strokeWidth="0" d="M6 14h36v22H6z"/>
      <path fill="#FFFFFF" d="M6 16v24h6V22.5L24 32l12-9.5V40h6V16L24 29z"/>
      <path fill="#EA4335" d="M6 16h36l-18 13z"/>
    </svg>
  );
}

function DriveIcon() {
  return (
    <svg viewBox="0 0 48 48" width="60%" height="60%">
      <path fill="#FFC107" d="M17 6L6 25l5 9 11-19z"/>
      <path fill="#1976D2" d="M31 6H17l11 19h14z"/>
      <path fill="#4CAF50" d="M11 34l5 8h16l5-8z"/>
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg viewBox="0 0 48 48" width="60%" height="60%">
      <rect fill="#0078D4" x="6" y="6" width="36" height="36" rx="4"/>
      <rect fill="#50D9FF" x="20" y="14" width="18" height="20" rx="2"/>
      <path d="M20 14l9 9 9-9" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
      <ellipse fill="#FFFFFF" cx="17" cy="24" rx="8" ry="10"/>
      <ellipse fill="#0078D4" cx="17" cy="24" rx="5" ry="7"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 48 48" width="60%" height="60%">
      <circle fill="#25D366" cx="24" cy="24" r="18"/>
      <path fill="#FFFFFF" d="M24 12c-6.627 0-12 5.373-12 12 0 2.11.546 4.09 1.5 5.82L12 37l7.41-1.47A11.94 11.94 0 0024 36c6.627 0 12-5.373 12-12S30.627 12 24 12zm5.95 16.9c-.25.7-1.47 1.37-2.03 1.43-.52.06-1.02.26-3.44-.72-2.9-1.15-4.74-4.1-4.88-4.3-.14-.2-1.13-1.5-1.13-2.87 0-1.36.72-2.03 1-2.3.25-.26.55-.32.73-.32.18 0 .37.003.53.01.17.01.4-.06.62.48.24.57.8 1.97.87 2.11.07.14.11.3.02.48-.09.18-.13.3-.26.46-.13.16-.28.36-.4.48-.13.13-.27.27-.11.52.15.25.69 1.13 1.47 1.83 1.01.9 1.86 1.18 2.12 1.31.26.13.41.11.56-.07.15-.18.64-.75.81-1.01.17-.26.34-.21.57-.13.23.08 1.46.69 1.71.81.25.13.42.19.48.3.06.1.06.58-.18 1.28z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 48 48" width="60%" height="60%">
      <circle fill="#29B6F6" cx="24" cy="24" r="18"/>
      <path fill="#FFFFFF" d="M33.5 15.5l-3.8 18.4c-.28 1.24-1 1.55-2.03.97l-5.6-4.12-2.7 2.6c-.3.3-.55.55-1.12.55l.4-5.68 10.3-9.3c.45-.4-.1-.62-.7-.23l-12.74 8.02-5.48-1.71c-1.2-.37-1.21-1.18.25-1.75l21.36-8.24c.98-.38 1.85.24 1.56 1.55z"/>
    </svg>
  );
}

const inputSources = [
  { id: 'gmail', label: 'Gmail', color: '#EA4335', Icon: GmailIcon },
  { id: 'drive', label: 'Drive', color: '#1976D2', Icon: DriveIcon },
  { id: 'outlook', label: 'Outlook', color: '#0078D4', Icon: OutlookIcon },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', Icon: WhatsAppIcon },
  { id: 'telegram', label: 'Telegram', color: '#29B6F6', Icon: TelegramIcon },
];

const invoices = [
  { id: 1001, supplier: 'מוצרי ישראל בע"מ', customer: 'ישראל ישראלי', amount: '4,850', date: '12/06/2026' },
  { id: 1002, supplier: 'טק סולושנס', customer: 'ישראל ישראלי', amount: '12,300', date: '10/06/2026' },
  { id: 1003, supplier: 'ענן שירותים', customer: 'ישראל ישראלי', amount: '750', date: '08/06/2026' },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 5 seconds total duration, carefully timed phases
    const timers = [
      setTimeout(() => setPhase(1), 100),    // Phase 1: Title (0-1.2s)
      setTimeout(() => setPhase(2), 800),    // Phase 2: Icons (0.8-2.5s)
      setTimeout(() => setPhase(3), 1800),   // Phase 3: Invoices (1.8-3.5s)
      setTimeout(() => setPhase(4), 3000),   // Phase 4: Chatbot (3.0-4.2s)
      setTimeout(() => setPhase(5), 4000),   // Phase 5: Hold / Scanner (4.0-5.0s)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10 overflow-hidden bg-[#0d1224]"
      dir="rtl"
      style={{ fontFamily: '"Heebo", sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background ambient glow */}
      <motion.div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#4361ee] opacity-10 blur-[100px]" />
      <motion.div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#2dd4bf] opacity-5 blur-[120px]" />

      {/* PHASE 1: Title */}
      <motion.h2 
        className="absolute top-[8vh] w-full text-center text-[3.5vw] font-black text-white tracking-tight"
        initial={{ opacity: 0, y: -50 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
      >
        <span className="text-[#4361ee] font-black drop-shadow-[0_0_15px_rgba(67,97,238,0.5)]">BillBOT+</span> סורק, מארגן ומנתח אוטומטית
      </motion.h2>

      {/* PHASE 2: Input Sources */}
      <div className="absolute top-[22vh] right-[5vw] w-[50vw] flex justify-between items-center px-[2vw]">
        {inputSources.map((source, i) => (
          <motion.div 
            key={source.id}
            className="flex flex-col items-center gap-[1vh]"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
            transition={{ duration: 0.5, delay: phase >= 2 ? i * 0.1 : 0, type: 'spring' }}
          >
            <div 
              className="w-[4.5vw] h-[4.5vw] rounded-2xl flex items-center justify-center shadow-lg bg-white"
              style={{ boxShadow: `0 10px 25px -5px ${source.color}80` }}
            >
              <source.Icon />
            </div>
            <span className="text-white/80 text-[1.2vw] font-medium">{source.label}</span>
          </motion.div>
        ))}
      </div>

      {/* PHASE 3 & 5: Invoices & Scanner */}
      <div className="absolute top-[38vh] right-[5vw] w-[45vw] flex flex-col gap-[2.5vh]">
        {invoices.map((inv, i) => (
          <motion.div 
            key={inv.id}
            className="relative bg-[#161e36] border border-[#2dd4bf]/40 rounded-xl p-[1.5vw] shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden"
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={phase >= 3 ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.6, delay: phase >= 3 ? i * 0.15 : 0, type: 'spring' }}
          >
            {/* Scanner Line (Phase 5) */}
            {phase >= 5 && (
              <motion.div 
                className="absolute left-0 right-0 h-[3px] bg-[#2dd4bf] shadow-[0_0_20px_4px_rgba(45,212,191,0.6)] z-20"
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            )}

            <div className="flex justify-between items-start mb-[1vh]">
              <div className="text-[#2dd4bf] font-bold text-[1.2vw]">חשבונית #{inv.id}</div>
              <div className="text-white font-bold text-[1.4vw]">₪ {inv.amount}</div>
            </div>
            <div className="flex justify-between items-center text-[1.1vw]">
              <div className="text-white/90">
                <span className="text-white/50">ספק:</span> {inv.supplier} | <span className="text-white/50">לקוח:</span> {inv.customer}
              </div>
            </div>
            <div className="flex justify-between items-center mt-[1vh] text-[1vw] text-white/60">
              <div>תאריך: {inv.date}</div>
              <div className="flex items-center gap-[0.5vw] text-[#2dd4bf] font-medium bg-[#2dd4bf]/10 px-[0.8vw] py-[0.2vw] rounded-full">
                <svg width="1vw" height="1vw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                נסרקה
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PHASE 4: Smart Chatbot */}
      <motion.div 
        className="absolute top-[35vh] left-[5vw] w-[32vw] bg-[#161e36] border border-[#4361ee]/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
        initial={{ opacity: 0, x: -50, scale: 0.9 }}
        animate={phase >= 4 ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -50, scale: 0.9 }}
        transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
      >
        <div className="bg-[#4361ee]/20 border-b border-[#4361ee]/30 p-[1.5vw] flex items-center gap-[1vw]">
          <div className="w-[3vw] h-[3vw] bg-[#4361ee] rounded-full flex items-center justify-center text-[1.5vw]">🤖</div>
          <div className="text-white font-bold text-[1.4vw]">BillBOT AI</div>
        </div>

        <div className="p-[2vw] flex flex-col gap-[2vh]">
          {/* User Message */}
          <motion.div 
            className="self-end bg-[#4361ee] text-white rounded-2xl rounded-tr-sm p-[1.2vw] text-[1.2vw] max-w-[85%]"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={phase >= 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            שלח דוח חודשי לרואה חשבון
          </motion.div>

          {/* Bot Typing / Reply */}
          <motion.div 
            className="self-start bg-white/10 text-white rounded-2xl rounded-tl-sm p-[1.2vw] text-[1.2vw] max-w-[90%] border border-white/5"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={phase >= 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            <div className="flex items-center gap-[0.5vw] text-[#2dd4bf] font-bold mb-[0.5vh]">
              <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              נשלח!
            </div>
            סה"כ 3 חשבוניות, ₪17,900
          </motion.div>

          {/* Small status text */}
          <motion.div 
            className="text-white/40 text-[0.9vw] text-center mt-[1vh]"
            initial={{ opacity: 0 }}
            animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 1.5 }}
          >
            שולח לרואה חשבון...
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
