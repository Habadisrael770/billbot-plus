import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.5 }}
      transition={{ duration: 1 }}
    >
      <motion.div 
        className="absolute inset-0 bg-[var(--color-primary)]/10"
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.h1 
        className="text-[6vw] font-black text-white mb-4 relative z-10 text-center leading-tight"
        initial={{ y: 30, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
        transition={{ duration: 0.8, type: 'spring' }}
      >
        הזמן שלך יקר.
        <br />
        <span className="text-[var(--color-accent)]">תנו לנו לנהל את החשבוניות.</span>
      </motion.h1>

      <motion.div
        className="mt-[4vh] relative"
        initial={{ scale: 0, opacity: 0 }}
        animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.5 }}
      >
        <div className="absolute -inset-4 bg-[var(--color-primary)] rounded-full blur-[20px] opacity-40 animate-pulse" />
        <div className="relative px-[4vw] py-[2vh] bg-white text-[var(--color-bg-dark)] font-bold text-[2.5vw] rounded-full shadow-2xl flex items-center gap-[1vw]">
          נסה עכשיו בחינם — billibot.net
        </div>
      </motion.div>
    </motion.div>
  );
}