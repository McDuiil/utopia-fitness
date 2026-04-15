import React, { memo } from "react";
import { Footprints } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";

interface StepsWidgetProps {
  steps: number;
  goal: number;
  t: (key: string) => string;
}

const StepsWidget = memo(({ steps, goal, t }: StepsWidgetProps) => {
  const percentage = Math.min(100, (steps / goal) * 100);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard className="flex flex-col items-center text-center gap-2 p-4 h-full border-emerald-500/20 bg-emerald-500/5">
        <div className="flex flex-col items-center justify-center w-full text-emerald-400 gap-1">
          <div className="flex items-center gap-2">
            <Footprints size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("steps") || "Steps"}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <motion.span 
            key={steps}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            {steps}
          </motion.span>
          <span className="text-xs text-white/40">/ {goal}</span>
        </div>
        <div className="h-1 w-full rounded-full bg-white/[0.06] mt-auto overflow-hidden">
          <motion.div 
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full rounded-full bg-emerald-500" 
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}, (prev, next) => {
  return prev.steps === next.steps && prev.goal === next.goal;
});

StepsWidget.displayName = "StepsWidget";

export default StepsWidget;
