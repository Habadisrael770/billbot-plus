import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative mb-8">
        <motion.div 
          className="absolute -inset-8 bg-[var(--color-primary)] rounded-full blur-[40px] opacity-30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.h1 
          className="text-[8vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[var(--color-text-secondary)] leading-none relative z-10"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        >
          BillBOT+
        </motion.h1>
      </div>

      <motion.p 
        className="text-[3vw] text-[var(--color-accent)] font-medium tracking-wide"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        אוטומציה חכמה לחשבוניות
      </motion.p>
      
      {/* Decorative tech lines */}
      {phase >= 2 && (
        <motion.div 
          className="absolute bottom-1/4 w-[40vw] h-[2px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.5 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}