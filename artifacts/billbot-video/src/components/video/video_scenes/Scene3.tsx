import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function GmailIcon() {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%">
      <path fill="#4285F4" d="M6 40V16l18 13z"/>
      <path fill="#34A853" d="M42 40V16L24 29z"/>
      <path fill="#FBBC05" d="M6 40h6V22.5L6 16z"/>
      <path fill="#EA4335" d="M42 40h-6V22.5L42 16z"/>
      <path fill="#C5221F" d="M6 16l18 13 18-13H6z"/>
      <path fill="#EA4335" d="M6 16l18 13 18-13H6z"/>
    </svg>
  );
}

function DriveIcon() {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%">
      <path fill="#FFC107" d="M17 6L6 25l5 9 11-19z"/>
      <path fill="#1976D2" d="M31 6H17l11 19h14z"/>
      <path fill="#4CAF50" d="M11 34l5 8h16l5-8H11z"/>
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%">
      <rect fill="#0078D4" x="4" y="6" width="22" height="36" rx="3"/>
      <rect fill="#28A8E8" x="22" y="10" width="22" height="28" rx="3"/>
      <rect fill="#0078D4" x="22" y="22" width="22" height="4"/>
      <path fill="#fff" d="M22 10h22v4L31 20l-9-6z"/>
      <ellipse fill="#fff" cx="15" cy="24" rx="7" ry="9"/>
      <ellipse fill="#0078D4" cx="15" cy="24" rx="4.5" ry="6.5"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%">
      <circle fill="#25D366" cx="24" cy="24" r="20"/>
      <path fill="#fff" d="M34.5 13.5A14.5 14.5 0 0010.7 31.3l-2.2 8 8.3-2.2A14.5 14.5 0 1034.5 13.5zm-10.5 22a12 12 0 01-6.1-1.7l-.4-.3-4.4 1.2 1.2-4.3-.3-.5A12 12 0 1124 35.5z"/>
      <path fill="#25D366" d="M19.8 17.3c-.4-.9-.8-.9-1.2-.9h-1c-.3 0-.9.1-1.3.6-.5.5-1.8 1.7-1.8 4.2s1.8 4.8 2.1 5.1c.3.4 3.5 5.6 8.6 7.6 4.3 1.7 5.1 1.4 6 1.3.9-.1 2.9-1.2 3.3-2.3.4-1.2.4-2.2.3-2.4-.1-.2-.4-.3-.9-.6s-2.9-1.4-3.3-1.6c-.4-.2-.8-.2-1.1.2-.3.4-1.2 1.6-1.5 1.9-.3.3-.5.4-.9.1-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-2.9-.2-.4 0-.6.2-.8l.7-.8c.2-.3.3-.5.4-.8.1-.3 0-.6-.1-.8l-1.7-4z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%">
      <defs>
        <linearGradient id="tgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2AABEE"/>
          <stop offset="100%" stopColor="#229ED9"/>
        </linearGradient>
      </defs>
      <circle fill="url(#tgGrad)" cx="24" cy="24" r="20"/>
      <path fill="#fff" fillOpacity=".6" d="M14.1 30.2l1.3-6.2 10.5-9.4-13.1 7.9z"/>
      <path fill="#fff" d="M14.1 30.2l9.9-3.1 4.5 3.4z"/>
      <path fill="#fff" fillOpacity=".8" d="M28.5 30.5l-4.5-3.4 7.6-12.4z"/>
      <path fill="#fff" d="M15.4 24l-1.3 6.2 14-16.5z"/>
    </svg>
  );
}

const inputSources = [
  { id: 'gmail',    label: 'Gmail',    color: '#EA4335', glow: '#ea433560', Icon: GmailIcon },
  { id: 'drive',    label: 'Drive',    color: '#FFC107', glow: '#ffc10750', Icon: DriveIcon },
  { id: 'outlook',  label: 'Outlook',  color: '#0078D4', glow: '#0078d460', Icon: OutlookIcon },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', glow: '#25d36660', Icon: WhatsAppIcon },
  { id: 'telegram', label: 'Telegram', color: '#2AABEE', glow: '#2aabee60', Icon: TelegramIcon },
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
        <span className="text-[#4361ee] font-black drop-shadow-[0_0_15px_rgba(67,97,238,0.5)]">BILLIBOT+</span> סורק, מארגן ומנתח אוטומטית
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
            <motion.div 
              className="w-[4.5vw] h-[4.5vw] rounded-2xl flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${source.color}15 0%, #0d1224 70%)`,
                border: `1.5px solid ${source.color}60`,
                boxShadow: `0 0 12px ${source.neon}50, 0 0 28px ${source.neon}25, inset 0 0 12px ${source.neon}10`,
              }}
              animate={phase >= 2 ? {
                boxShadow: [
                  `0 0 10px ${source.neon}40, 0 0 24px ${source.neon}20, inset 0 0 10px ${source.neon}08`,
                  `0 0 18px ${source.neon}70, 0 0 40px ${source.neon}35, inset 0 0 16px ${source.neon}15`,
                  `0 0 10px ${source.neon}40, 0 0 24px ${source.neon}20, inset 0 0 10px ${source.neon}08`,
                ],
              } : {}}
              transition={{ duration: 2.5, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
            >
              <source.Icon glow={source.neon} />
            </motion.div>
            <span className="text-[1.2vw] font-semibold" style={{ color: source.color, textShadow: `0 0 8px ${source.neon}80` }}>{source.label}</span>
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
          <div className="text-white font-bold text-[1.4vw]">BILLIBOT AI</div>
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
