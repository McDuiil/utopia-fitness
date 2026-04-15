import React, { memo, useMemo } from "react";
import { Activity } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { useApp } from "../../../context/AppContext";

const DeficitWidget = () => {
  console.log("render DeficitWidget");
  const { calculateBMR } = useApp();
  const t = useAppSelector(s => s.t);
  const profile = useAppSelector(s => s.appData.profile);
  const selectedDate = useAppSelector(s => s.selectedDate);
  const workoutSessions = useAppSelector(s => s.appData.days[selectedDate]?.workoutSessions || []);
  const consumed = useAppSelector(s => s.resolvedNutritionToday.calories.consumed);
  const goal = useAppSelector(s => s.appData.profile.goalDeficit || 500);

  const deficit = useMemo(() => {
    const bmr = calculateBMR(profile);
    const workoutCalories = workoutSessions.reduce((sum, s) => sum + (s.calories || 0), 0);
    return (bmr + workoutCalories) - consumed;
  }, [calculateBMR, profile, workoutSessions, consumed]);

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
};

export default memo(DeficitWidget);
