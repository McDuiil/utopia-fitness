import React, { memo, useMemo } from "react";
import { Award } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import { AppData } from "../../../types";
import { getTodayStr } from "../../../lib/utils";

interface StreakWidgetProps {
  appData: AppData;
  t: (key: string) => string;
}

const StreakWidget = memo(({ appData, t }: StreakWidgetProps) => {
  const streak = useMemo(() => {
    let count = 0;
    const todayStr = getTodayStr();
    let checkDate = new Date();
    let isFirstDay = true;
    
    // Check backwards from today
    while (true) {
      const dateStr = checkDate.toLocaleDateString('en-CA');
      const day = appData.days[dateStr];
      
      // Active if has workout OR has meals logged
      const hasWorkout = day?.workoutSessions?.some(s => !s.deleted && s.exercises && s.exercises.length > 0);
      const hasMeals = day?.meals && day.meals.length > 0;

      if (hasWorkout || hasMeals) {
        count++;
      } else {
        // If it's today and no activity yet, don't break the streak, just check yesterday
        // But if we already found activity in the "future" (relative to this check), 
        // or if this isn't the first day we're checking, then a gap breaks the streak.
        if (!isFirstDay) {
          break;
        }
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
      isFirstDay = false;
      if (count > 3650) break; // Safety break
    }
    return count;
  }, [appData.days]);

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
  return prev.appData.days === next.appData.days;
});

StreakWidget.displayName = "StreakWidget";

export default StreakWidget;
