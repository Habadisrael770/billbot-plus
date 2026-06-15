import { useState, useEffect, useRef } from 'react';
import { motion, animate } from 'framer-motion';

function useCountUp(target: number, start: boolean, duration = 1.2) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [start, target, duration]);
  return value;
}

const invoiceRows = [
  { id: '#1024', vendor: 'מוצרי ישראל בע"מ', date: '12/06/26', amount: '₪4,850', status: 'אושרה', statusColor: '#2dd4bf' },
  { id: '#1023', vendor: 'טק סולושנס', date: '10/06/26', amount: '₪12,300', status: 'אושרה', statusColor: '#2dd4bf' },
  { id: '#1022', vendor: 'ענן שירותים', date: '08/06/26', amount: '₪750', status: 'ממתינה', statusColor: '#f59e0b' },
  { id: '#1021', vendor: 'אופיס מקס', date: '05/06/26', amount: '₪2,100', status: 'אושרה', statusColor: '#2dd4bf' },
  { id: '#1020', vendor: 'אמאזון ישראל', date: '01/06/26', amount: '₪640', status: 'ממתינה', statusColor: '#f59e0b' },
];

const navItems = [
  { label: 'דשבורד', color: '#4361ee', active: true },
  { label: 'הוצאות', color: '#2dd4bf', active: false },
  { label: 'ספקים', color: '#f59e0b', active: false },
  { label: 'הרמס AI', color: '#d946ef', active: false },
  { label: 'הגדרות', color: '#94a3b8', active: false },
];

const barData = [65, 82, 55, 90, 73, 88, 95];
const barLabels = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול'];

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 150),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const totalDocs   = useCountUp(47,      phase >= 3, 1.0);
  const totalAmount = useCountUp(187500,  phase >= 3, 1.3);
  const totalVat    = useCountUp(33750,   phase >= 3, 1.3);
  const pending     = useCountUp(6,       phase >= 3, 0.8);

  return (
    <motion.div
      className="absolute inset-0 z-10 overflow-hidden flex flex-col items-center justify-center"
      style={{ fontFamily: '"Heebo", sans-serif', background: '#0d1224' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
      transition={{ duration: 0.7 }}
    >
      {/* Background glows */}
      <div className="absolute top-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#4361ee] opacity-10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[10%] w-[35vw] h-[35vw] rounded-full bg-[#d946ef] opacity-6 blur-[120px] pointer-events-none" />

      {/* Title */}
      <motion.h2
        className="absolute top-[4.5vh] w-full text-center text-[3vw] font-black text-white tracking-tight"
        initial={{ opacity: 0, y: -30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
      >
        דשבורד חכם —{' '}
        <span className="text-[#4361ee]">כל המידע במקום אחד</span>
      </motion.h2>

      {/* Browser chrome + dashboard */}
      <motion.div
        className="relative w-[88vw] h-[72vh] rounded-2xl overflow-hidden shadow-[0_30px_80px_-10px_rgba(0,0,0,0.7)] border border-white/8"
        style={{ top: '3vh' }}
        initial={{ opacity: 0, scale: 0.88, y: 40 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.88, y: 40 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.25 }}
      >
        {/* Browser top bar */}
        <div className="h-[5%] bg-[#0f1533] flex items-center px-[1.5vw] gap-[0.6vw] border-b border-white/5">
          <div className="w-[1vw] h-[1vw] rounded-full bg-red-500/70" />
          <div className="w-[1vw] h-[1vw] rounded-full bg-yellow-400/70" />
          <div className="w-[1vw] h-[1vw] rounded-full bg-green-500/70" />
          <div className="flex-1 mx-[2vw] bg-[#161e36] rounded-full h-[2.5vh] flex items-center px-[1.5vw]">
            <span className="text-white/40 text-[1vw]">billibot.net</span>
          </div>
        </div>

        {/* App layout: sidebar (right) + main (left, RTL) */}
        <div className="flex h-[95%] bg-[#0d1224]" dir="rtl">

          {/* RIGHT SIDEBAR */}
          <motion.div
            className="w-[16%] bg-[#0f1533] border-l border-white/5 flex flex-col py-[2vh] px-[0.8vw] gap-[0.5vh] shrink-0"
            initial={{ x: 40, opacity: 0 }}
            animate={phase >= 2 ? { x: 0, opacity: 1 } : { x: 40, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Logo */}
            <div className="px-[0.8vw] pb-[1.5vh] mb-[1vh] border-b border-white/5">
              <span className="text-white font-black text-[1.4vw] tracking-tight">BILLIBOT<span className="text-[#4361ee]">+</span></span>
            </div>

            {navItems.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center gap-[0.6vw] px-[0.8vw] py-[1vh] rounded-lg text-[1.1vw] font-medium"
                style={{
                  backgroundColor: item.active ? `${item.color}18` : 'transparent',
                  color: item.active ? item.color : 'rgba(255,255,255,0.5)',
                  border: item.active ? `1px solid ${item.color}35` : '1px solid transparent',
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ delay: 0.05 * i, duration: 0.35 }}
              >
                <div className="w-[1vw] h-[1vw] rounded-full shrink-0" style={{ background: item.color, opacity: item.active ? 1 : 0.4 }} />
                {item.label}
              </motion.div>
            ))}

            {/* User avatar */}
            <div className="mt-auto flex items-center gap-[0.6vw] px-[0.8vw] pt-[1.5vh] border-t border-white/5">
              <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-[#4361ee] flex items-center justify-center text-white font-bold text-[1vw]">י</div>
              <div>
                <div className="text-white text-[0.9vw] font-semibold leading-tight">ישראל י'</div>
                <div className="text-white/40 text-[0.75vw]">מנהל</div>
              </div>
            </div>
          </motion.div>

          {/* MAIN CONTENT */}
          <div className="flex-1 overflow-hidden flex flex-col px-[2vw] py-[2vh] gap-[1.5vh]">

            {/* Page header */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="text-white font-black text-[1.8vw]">דשבורד</div>
              <div className="flex items-center gap-[1vw]">
                <div className="bg-[#4361ee] text-white text-[0.9vw] font-semibold px-[1.2vw] py-[0.6vh] rounded-lg">+ הוסף חשבונית</div>
                <div className="bg-[#161e36] border border-white/10 text-white/60 text-[0.9vw] px-[1.2vw] py-[0.6vh] rounded-lg">שלח לרו"ח</div>
              </div>
            </motion.div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-4 gap-[1.2vw]">
              {[
                { title: 'סה״כ מסמכים', value: totalDocs, suffix: '', color: '#4361ee' },
                { title: 'סה״כ חשבוניות', value: `₪${totalAmount.toLocaleString('he-IL')}`, suffix: '', color: '#2dd4bf' },
                { title: 'סה״כ מע״מ', value: `₪${totalVat.toLocaleString('he-IL')}`, suffix: '', color: '#d946ef' },
                { title: 'ממתינות לאישור', value: pending, suffix: '', color: '#f59e0b' },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  className="bg-[#161e36] rounded-xl p-[1.2vw] border border-white/5"
                  style={{ boxShadow: `0 4px 20px ${card.color}20` }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ delay: 0.08 * i + 0.15, duration: 0.45, type: 'spring' }}
                >
                  <div className="text-white/50 text-[0.8vw] font-medium mb-[0.8vh] uppercase tracking-wide">{card.title}</div>
                  <div className="text-white font-black text-[1.8vw] leading-tight tabular-nums">
                    {typeof card.value === 'number' ? card.value : card.value}
                  </div>
                  <div className="mt-[0.8vh] h-[2px] w-1/3 rounded-full" style={{ background: card.color }} />
                </motion.div>
              ))}
            </div>

            {/* CHART + TABLE row */}
            <div className="flex gap-[1.5vw] flex-1 min-h-0">

              {/* Bar chart */}
              <motion.div
                className="w-[32%] bg-[#161e36] rounded-xl p-[1.2vw] border border-white/5 flex flex-col shrink-0"
                initial={{ opacity: 0, x: -20 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="text-white font-bold text-[1vw] mb-[1.5vh]">הוצאות חודשיות</div>
                <div className="flex-1 flex items-end gap-[0.4vw]">
                  {barData.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-[0.4vh]">
                      <motion.div
                        className="w-full rounded-t-md"
                        style={{ background: i === 5 ? '#4361ee' : '#4361ee40' }}
                        initial={{ height: 0 }}
                        animate={phase >= 3 ? { height: `${h}%` } : { height: 0 }}
                        transition={{ duration: 0.6, delay: 0.06 * i + 0.15, ease: 'easeOut' }}
                      />
                      <span className="text-white/30 text-[0.65vw]">{barLabels[i]}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Invoice table */}
              <motion.div
                className="flex-1 bg-[#161e36] rounded-xl border border-white/5 overflow-hidden flex flex-col"
                initial={{ opacity: 0, x: 20 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                {/* Table header */}
                <div className="grid grid-cols-5 px-[1.2vw] py-[1vh] border-b border-white/5 text-white/40 text-[0.8vw] font-semibold uppercase">
                  <span>מספר</span>
                  <span className="col-span-2">ספק</span>
                  <span>תאריך</span>
                  <span className="text-left">סה״כ</span>
                </div>
                {/* Rows */}
                <div className="flex-1 flex flex-col divide-y divide-white/5">
                  {invoiceRows.map((row, i) => (
                    <motion.div
                      key={row.id}
                      className="grid grid-cols-5 px-[1.2vw] py-[1.1vh] items-center"
                      initial={{ opacity: 0, x: 15 }}
                      animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 15 }}
                      transition={{ delay: 0.1 * i, duration: 0.35 }}
                    >
                      <span className="text-[#4361ee] font-mono text-[0.85vw] font-bold">{row.id}</span>
                      <span className="col-span-2 text-white/90 text-[0.85vw] truncate">{row.vendor}</span>
                      <span className="text-white/40 text-[0.8vw]">{row.date}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[0.9vw]">{row.amount}</span>
                        <span
                          className="text-[0.7vw] font-semibold px-[0.6vw] py-[0.2vh] rounded-full"
                          style={{ background: `${row.statusColor}20`, color: row.statusColor }}
                        >{row.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* AI Chat bubble — appears in phase 5 */}
        <motion.div
          className="absolute bottom-[6%] left-[2%] bg-[#4361ee] rounded-2xl rounded-bl-sm shadow-[0_8px_30px_rgba(67,97,238,0.5)] px-[1.5vw] py-[1vh] max-w-[25vw]"
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={phase >= 5 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 20 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          <div className="text-white/60 text-[0.75vw] mb-[0.3vh] font-medium">הרמס AI</div>
          <div className="text-white text-[0.95vw] font-semibold">ב-יוני הוצאת ₪20,640 — ירידה של 8% לעומת מאי ✅</div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
