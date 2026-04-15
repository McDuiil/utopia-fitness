import React, { memo } from "react";
import { Award } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";

interface StreakWidgetProps {
  streak: number;
  t: (key: string) => string;
}

const StreakWidget = memo(({ streak, t }: StreakWidgetProps) => {
  const percentage = Math.min(100, (streak / 7) * 100);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard className="flex flex-col items-center text-center gap-2 p-4 h-full border-yellow-500/20 bg-yellow-500/5">
        <div className="flex flex-col items-center justify-center w-full text-yellow-500 gap-1">
          <div className="flex items-center gap-2">
            <Award size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("streak")}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <motion.span 
            key={streak}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            {streak}
          </motion.span>
          <span className="text-xs text-white/40">{t("days") || "d"}</span>
        </div>
        <p className="text-[10px] text-white/40">
          {streak > 0 ? t("keepGoing") || "Keep it up!" : t("startToday") || "Start today!"}
        </p>
        <div className="h-1 w-full rounded-full bg-white/[0.06] mt-auto overflow-hidden">
          <motion.div 
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full rounded-full bg-yellow-500" 
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}, (prev, next) => {
  return prev.streak === next.streak;
});

StreakWidget.displayName = "StreakWidget";

export default StreakWidget;
