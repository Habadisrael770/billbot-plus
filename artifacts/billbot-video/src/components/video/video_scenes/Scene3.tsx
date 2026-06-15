import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-[10vw]"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2 
        className="text-[3.5vw] font-bold text-center mb-[5vh] text-white"
        initial={{ opacity: 0, y: -30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <span className="text-[var(--color-primary)]">BillBOT+</span> סורק, מארגן ומנתח אוטומטית
      </motion.h2>

      {/* Abstract Dashboard UI */}
      <motion.div 
        className="w-full max-w-[60vw] bg-[var(--color-bg-light)] rounded-2xl border border-[var(--color-primary)]/30 p-[2vw] shadow-[0_20px_50px_-12px_rgba(67,97,238,0.25)] relative overflow-hidden"
        initial={{ opacity: 0, y: 50, rotateX: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: 20 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
      >
        {/* Scanning effect scanner line */}
        <motion.div 
          className="absolute left-0 right-0 h-[2px] bg-[var(--color-accent)] shadow-[0_0_15px_3px_rgba(45,212,191,0.5)] z-20"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        <div className="flex gap-[2vw] mb-[2vw]">
          {/* Dashboard Stats */}
          {[1, 2, 3].map(i => (
            <motion.div 
              key={i}
              className="flex-1 h-[8vw] bg-[var(--color-bg-dark)] rounded-lg p-[1vw] border border-white/5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="w-1/3 h-2 bg-white/20 rounded-full mb-[2vw]" />
              <div className="w-2/3 h-6 bg-[var(--color-primary)]/80 rounded-full" />
            </motion.div>
          ))}
        </div>

        {/* Invoice List */}
        <div className="space-y-[1vw]">
          {[1, 2, 3].map(i => (
            <motion.div 
              key={i}
              className="w-full h-[4vw] bg-[var(--color-bg-dark)] rounded-lg flex items-center justify-between px-[1vw] border border-white/5"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="w-1/4 h-3 bg-white/30 rounded-full" />
              <div className="w-1/6 h-3 bg-white/20 rounded-full" />
              <div className="w-1/5 h-3 bg-[var(--color-accent)]/80 rounded-full" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}