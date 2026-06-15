import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function GmailIcon({ glow }: { glow: string }) {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%" style={{ filter: `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 12px ${glow}80)` }}>
      <path fill="#FF6B6B" d="M6 16h36l-18 13z"/>
      <path fill="none" stroke="#FF6B6B" strokeWidth="2.5" d="M6 16v24h6V22.5L24 32l12-9.5V40h6V16"/>
    </svg>
  );
}

function DriveIcon({ glow }: { glow: string }) {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%" style={{ filter: `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 12px ${glow}80)` }}>
      <path fill="none" stroke="#FFD93D" strokeWidth="2.5" strokeLinejoin="round" d="M17 6L6 25l5 9 11-19z"/>
      <path fill="none" stroke="#4FC3F7" strokeWidth="2.5" strokeLinejoin="round" d="M31 6H17l11 19h14z"/>
      <path fill="none" stroke="#69F0AE" strokeWidth="2.5" strokeLinejoin="round" d="M11 34l5 8h16l5-8z"/>
    </svg>
  );
}

function OutlookIcon({ glow }: { glow: string }) {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%" style={{ filter: `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 12px ${glow}80)` }}>
      <rect fill="none" stroke="#50D9FF" strokeWidth="2" x="20" y="12" width="18" height="20" rx="2"/>
      <path d="M20 12l9 9 9-9" stroke="#50D9FF" strokeWidth="2" fill="none"/>
      <ellipse fill="none" stroke="#50D9FF" strokeWidth="2" cx="16" cy="24" rx="8" ry="10"/>
    </svg>
  );
}

function WhatsAppIcon({ glow }: { glow: string }) {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%" style={{ filter: `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 12px ${glow}80)` }}>
      <circle fill="none" stroke="#4ADE80" strokeWidth="2.5" cx="24" cy="24" r="18"/>
      <path fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M16 31l1.5-4.5A10 10 0 1124 34a10 10 0 01-5.2-1.5z"/>
      <path fill="#4ADE80" d="M20 22c.3-.5 1-.6 1.4-.1l1 1.2c.3.4.2.9-.1 1.2l-.5.5c.5 1 1.2 1.7 2.2 2.2l.5-.5c.3-.3.8-.4 1.2-.1l1.2 1c.5.4.4 1.1-.1 1.4-1.5 1-4 .4-5.5-1.1C19.8 26.2 19 23.5 20 22z"/>
    </svg>
  );
}

function TelegramIcon({ glow }: { glow: string }) {
  return (
    <svg viewBox="0 0 48 48" width="62%" height="62%" style={{ filter: `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 12px ${glow}80)` }}>
      <circle fill="none" stroke="#38BDF8" strokeWidth="2.5" cx="24" cy="24" r="18"/>
      <path fill="#38BDF8" d="M33.5 15.5l-3.8 18.4c-.28 1.24-1 1.55-2.03.97l-5.6-4.12-2.7 2.6c-.3.3-.55.55-1.12.55l.4-5.68 10.3-9.3c.45-.4-.1-.62-.7-.23l-12.74 8.02-5.48-1.71c-1.2-.37-1.21-1.18.25-1.75l21.36-8.24c.98-.38 1.85.24 1.56 1.55z"/>
    </svg>
  );
}

const inputSources = [
  { id: 'gmail',    label: 'Gmail',    color: '#FF6B6B', neon: '#ff4444', Icon: GmailIcon },
  { id: 'drive',    label: 'Drive',    color: '#FFD93D', neon: '#ffd700', Icon: DriveIcon },
  { id: 'outlook',  label: 'Outlook',  color: '#50D9FF', neon: '#00cfff', Icon: OutlookIcon },
  { id: 'whatsapp', label: 'WhatsApp', color: '#4ADE80', neon: '#00e676', Icon: WhatsAppIcon },
  { id: 'telegram', label: 'Telegram', color: '#38BDF8', neon: '#29b6f6', Icon: TelegramIcon },
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
