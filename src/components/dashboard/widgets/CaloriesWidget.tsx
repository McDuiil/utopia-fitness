import React, { memo } from "react";
import { Flame } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import { useAppSelector } from "../../../hooks/useAppSelector";

const CaloriesWidget = () => {
  console.log("render CaloriesWidget");
  const consumed = useAppSelector(s => s.resolvedNutritionToday.calories.consumed);
  const dynamicGoal = useAppSelector(s => s.resolvedNutritionToday.calories.dynamicGoal);
  const percentage = useAppSelector(s => s.resolvedNutritionToday.percentage.calories);
  const t = useAppSelector(s => s.t);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard className="flex flex-col items-center text-center gap-2 p-4 h-full border-orange-500/20 bg-orange-500/5">
        <div className="flex flex-col items-center justify-center w-full text-orange-400 gap-1">
          <div className="flex items-center gap-2">
            <Flame size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("calories")}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <motion.span 
            key={consumed}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            {consumed}
          </motion.span>
          <span className="text-xs text-white/40">kcal</span>
        </div>
        <p className="text-[10px] text-white/40">Goal: {dynamicGoal} kcal</p>
        <div className="h-1 w-full rounded-full bg-white/[0.06] mt-auto overflow-hidden">
          <motion.div 
            initial={false}
            animate={{ width: `${Math.min(100, percentage)}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full rounded-full bg-orange-500" 
          />
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default memo(CaloriesWidget);
