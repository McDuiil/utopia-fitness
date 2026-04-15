import React, { memo } from "react";
import { Activity } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";

interface DeficitWidgetProps {
  deficit: number;
  goal: number;
  t: (key: string) => string;
}

const DeficitWidget = memo(({ deficit, goal, t }: DeficitWidgetProps) => {
  const percentage = Math.min(100, (deficit / goal) * 100);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard className="flex flex-col items-center text-center gap-2 p-4 h-full border-blue-500/20 bg-blue-500/5">
        <div className="flex flex-col items-center justify-center w-full text-blue-400 gap-1">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("dailyDeficit")}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <motion.span 
            key={deficit}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            {Math.round(deficit)}
          </motion.span>
          <span className="text-xs text-white/40">kcal</span>
        </div>
        <p className="text-[10px] text-white/40">Target: {goal} kcal</p>
        <div className="h-1 w-full rounded-full bg-white/[0.06] mt-auto overflow-hidden">
          <motion.div 
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full rounded-full bg-blue-500" 
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}, (prev, next) => {
  return prev.deficit === next.deficit && prev.goal === next.goal;
});

DeficitWidget.displayName = "DeficitWidget";

export default DeficitWidget;
