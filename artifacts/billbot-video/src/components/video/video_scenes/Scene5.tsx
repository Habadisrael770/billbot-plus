import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const invoiceItems = [
  { id: 1001, supplier: 'מוצרי ישראל בע"מ', amount: '₪4,850' },
  { id: 1002, supplier: 'טק סולושנס', amount: '₪12,300' },
  { id: 1003, supplier: 'ענן שירותים', amount: '₪750' },
];

function AccountantIcon() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
      <circle cx="32" cy="18" r="11" fill="#4361ee" opacity="0.9"/>
      <circle cx="32" cy="18" r="7" fill="#a5b4fc"/>
      <path d="M10 54c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="#4361ee" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <rect x="22" y="44" width="20" height="14" rx="2" fill="#4361ee" opacity="0.7"/>
      <path d="M22 49l10 5 10-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none">
      <rect x="4" y="10" width="40" height="28" rx="4" fill="#4361ee"/>
      <path d="M4 14l20 14 20-14" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function Scene5() {
  const [phase, setPhase] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => {
        setPhase(4);
        // stagger the flying invoices
        setTimeout(() => setSentCount(1), 300);
        setTimeout(() => setSentCount(2), 700);
        setTimeout(() => setSentCount(3), 1100);
      }, 2200),
      setTimeout(() => setPhase(5), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-10 overflow-hidden"
      dir="rtl"
      style={{ fontFamily: '"Heebo", sans-serif', background: '#0d1224' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.7 }}
    >
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#4361ee] opacity-10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#2dd4bf] opacity-8 blur-[100px] pointer-events-none" />

      {/* Title */}
      <motion.h2
        className="absolute top-[7vh] w-full text-center text-[3.2vw] font-black text-white tracking-tight"
        initial={{ opacity: 0, y: -40 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -40 }}
        transition={{ duration: 0.7, type: 'spring', bounce: 0.3 }}
      >
        שליחה אוטומטית ל
        <span className="text-[#2dd4bf] mx-2">רואה החשבון</span>
        — בלחיצה אחת
      </motion.h2>

      {/* LEFT: Invoice stack */}
      <div className="absolute top-[22vh] right-[8vw] w-[30vw] flex flex-col gap-[1.5vh]">
        {invoiceItems.map((inv, i) => (
          <motion.div
            key={inv.id}
            className="relative bg-[#161e36] border border-[#2dd4bf]/30 rounded-xl px-[2vw] py-[1.5vh] flex items-center justify-between shadow-lg overflow-hidden"
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={phase >= 2 ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 40, scale: 0.9 }}
            transition={{ duration: 0.5, delay: i * 0.12, type: 'spring' }}
          >
            {/* Flying animation — card shoots left */}
            {phase >= 4 && sentCount > i && (
              <motion.div
                className="absolute inset-0 bg-[#2dd4bf]/20 rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.4 }}
              />
            )}

            <div>
              <div className="text-[1.1vw] font-bold text-white/90">חשבונית #{inv.id}</div>
              <div className="text-[0.95vw] text-white/50 mt-[0.3vh]">{inv.supplier}</div>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="text-[1.2vw] font-bold text-[#2dd4bf]">{inv.amount}</div>
              {phase >= 4 && sentCount > i && (
                <motion.div
                  className="w-[1.8vw] h-[1.8vw] bg-[#2dd4bf] rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.6 }}
                >
                  <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* CENTER: Animated flying envelopes */}
      <div className="absolute top-[22vh] left-0 right-0 flex items-center justify-center" style={{ top: '38vh' }}>
        {phase >= 4 && invoiceItems.map((inv, i) => (
          sentCount > i && (
            <motion.div
              key={`fly-${inv.id}`}
              className="absolute"
              style={{ right: '38vw', top: `${(i - 1) * 4}vh` }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: '-28vw', y: 0, opacity: [1, 1, 0], scale: [1, 0.8, 0.4] }}
              transition={{ duration: 0.7, delay: 0, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="w-[3vw] h-[2.2vw]">
                <EnvelopeIcon />
              </div>
            </motion.div>
          )
        ))}
      </div>

      {/* Dashed path line */}
      <motion.div
        className="absolute"
        style={{ top: '38vh', right: '8vw', width: '52vw', height: '2px' }}
        initial={{ scaleX: 0, originX: 1 }}
        animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none">
          <line
            x1="400" y1="4" x2="0" y2="4"
            stroke="#4361ee"
            strokeWidth="2"
            strokeDasharray="8 6"
            opacity="0.5"
          />
          <polygon points="0,0 12,4 0,8" fill="#4361ee" opacity="0.6"/>
        </svg>
      </motion.div>

      {/* RIGHT: Accountant icon */}
      <motion.div
        className="absolute flex flex-col items-center gap-[1.5vh]"
        style={{ top: '22vh', left: '7vw', width: '14vw' }}
        initial={{ opacity: 0, x: -40 }}
        animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
        transition={{ duration: 0.7, type: 'spring' }}
      >
        {/* Avatar circle */}
        <motion.div
          className="w-[8vw] h-[8vw] rounded-full bg-[#161e36] border-2 border-[#4361ee]/50 flex items-center justify-center shadow-[0_0_30px_rgba(67,97,238,0.3)]"
          animate={phase >= 5 ? { borderColor: '#2dd4bf', boxShadow: '0 0 30px rgba(45,212,191,0.5)' } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="w-[5.5vw] h-[5.5vw]">
            <AccountantIcon />
          </div>
        </motion.div>

        <div className="text-center">
          <div className="text-white font-bold text-[1.3vw]">רואה חשבון</div>
          <div className="text-white/50 text-[1vw] mt-[0.3vh]">cohen@cpa.co.il</div>
        </div>

        {/* Inbox counter */}
        <motion.div
          className="flex items-center gap-[0.8vw] bg-[#2dd4bf]/15 border border-[#2dd4bf]/30 rounded-full px-[1.5vw] py-[0.6vh]"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 5 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        >
          <svg width="1.4vw" height="1.4vw" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="text-[#2dd4bf] font-bold text-[1.1vw]">3 חשבוניות התקבלו</span>
        </motion.div>
      </motion.div>

      {/* BOTTOM: Summary bar */}
      <motion.div
        className="absolute bottom-[8vh] w-full px-[8vw]"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <div className="bg-[#161e36] border border-[#2dd4bf]/30 rounded-2xl px-[4vw] py-[2vh] flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-[1vw]">
            <div className="w-[2.5vw] h-[2.5vw] bg-[#2dd4bf] rounded-full flex items-center justify-center">
              <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span className="text-white font-bold text-[1.4vw]">נשלח אוטומטית!</span>
          </div>
          <div className="flex gap-[4vw] text-[1.2vw]">
            <div className="text-center">
              <div className="text-[#2dd4bf] font-black text-[2vw]">3</div>
              <div className="text-white/50">חשבוניות</div>
            </div>
            <div className="w-px bg-white/10 self-stretch"/>
            <div className="text-center">
              <div className="text-[#2dd4bf] font-black text-[2vw]">₪17,900</div>
              <div className="text-white/50">סה"כ</div>
            </div>
            <div className="w-px bg-white/10 self-stretch"/>
            <div className="text-center">
              <div className="text-white font-black text-[1.4vw]">cohen@cpa.co.il</div>
              <div className="text-white/50">נמען</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
