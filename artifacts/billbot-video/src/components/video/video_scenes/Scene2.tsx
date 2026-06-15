import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center max-w-[70vw]">
        {/* Floating document icons */}
        <div className="relative w-full h-[30vh] mb-12 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-[15vw] h-[20vw] bg-[var(--color-bg-light)] border border-[var(--color-border)] rounded-xl shadow-2xl flex flex-col p-4"
              initial={{ opacity: 0, y: 50, rotate: 0, scale: 0.8 }}
              animate={phase >= 1 ? { 
                opacity: 1, 
                y: 0, 
                rotate: (i - 1) * 15,
                x: (i - 1) * 60,
                scale: 1,
                zIndex: i === 1 ? 10 : 0
              } : { opacity: 0, y: 50, rotate: 0, scale: 0.8 }}
              transition={{ duration: 0.8, delay: i * 0.15, type: 'spring', bounce: 0.3 }}
            >
              <div className="w-1/2 h-2 bg-[var(--color-text-muted)] rounded-full mb-4 opacity-50" />
              <div className="w-full h-2 bg-[var(--color-text-muted)] rounded-full mb-2 opacity-30" />
              <div className="w-3/4 h-2 bg-[var(--color-text-muted)] rounded-full mb-2 opacity-30" />
              <div className="w-full h-2 bg-[var(--color-text-muted)] rounded-full opacity-30" />
              
              {/* Red warning highlight on documents */}
              <motion.div 
                className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[var(--color-error)]"
                initial={{ scale: 0 }}
                animate={phase >= 2 ? { scale: [0, 1.5, 1] } : { scale: 0 }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
              />
            </motion.div>
          ))}
        </div>

        <motion.h2 
          className="text-[4vw] font-bold text-center leading-tight text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          עייפת ממעקב ידני אחר חשבוניות?
        </motion.h2>
        
        <motion.p
          className="text-[2vw] text-[var(--color-text-muted)] mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          הודעות דוא"ל, מסמכים, קבלות... הכל הולך לאיבוד.
        </motion.p>
      </div>
    </motion.div>
  );
}