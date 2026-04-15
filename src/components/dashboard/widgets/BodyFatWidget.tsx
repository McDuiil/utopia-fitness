import React, { memo } from "react";
import { Activity } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";

interface BodyFatWidgetProps {
  bodyFat?: number;
  profileBodyFat: number;
  goalBodyFat: number;
  isHistory: boolean;
  t: (key: string) => string;
  onClick: () => void;
}

const BodyFatWidget = memo(({ bodyFat, profileBodyFat, goalBodyFat, isHistory, t, onClick }: BodyFatWidgetProps) => {
  const displayValue = bodyFat !== undefined ? bodyFat : (isHistory ? '--' : profileBodyFat);
  const percentage = Math.min(100, ((bodyFat || profileBodyFat || 20) / (goalBodyFat || 15)) * 100);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard 
        className="flex flex-col items-center text-center gap-2 p-4 h-full border-pink-500/20 bg-pink-500/5 cursor-pointer active:scale-95 transition-transform" 
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center w-full text-pink-400 gap-1">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("bodyFat")}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <motion.span 
            key={displayValue}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            {displayValue}
          </motion.span>
          <span className="text-xs text-white/40">%</span>
        </div>
        <p className="text-[10px] text-white/40">Goal: {goalBodyFat}%</p>
        <div className="h-1 w-full rounded-full bg-white/[0.06] mt-auto overflow-hidden">
          <motion.div 
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full rounded-full bg-pink-500" 
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.bodyFat === next.bodyFat &&
    prev.profileBodyFat === next.profileBodyFat &&
    prev.goalBodyFat === next.goalBodyFat &&
    prev.isHistory === next.isHistory
  );
});

BodyFatWidget.displayName = "BodyFatWidget";

export default BodyFatWidget;
