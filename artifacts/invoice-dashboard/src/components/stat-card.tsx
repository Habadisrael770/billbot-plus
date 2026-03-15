import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

export function StatCard({ title, value, icon, trend, trendUp, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="stat-card group hover:border-primary/40 transition-colors duration-200"
    >
      <div className="flex items-start justify-between gap-2 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 truncate" dir="rtl">
            {title}
          </p>
          <p className="text-lg sm:text-2xl font-black text-foreground tabular-nums leading-tight break-all" dir="ltr">
            {value}
          </p>
          {trend && (
            <p
              className={`text-[11px] mt-1.5 font-semibold flex items-center gap-0.5 ${
                trendUp ? "text-success" : "text-destructive"
              }`}
              dir="ltr"
            >
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div className="icon-blue w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
