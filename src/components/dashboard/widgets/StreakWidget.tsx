import React, { memo, useMemo } from "react";
import { Award } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import { DayData } from "../../../types";
import { getTodayStr } from "../../../lib/utils";

interface StreakWidgetProps {
  days: Record<string, DayData>;
  name: string;
  t: (key: string) => string;
}

const StreakWidget = memo(({ days, name, t }: StreakWidgetProps) => {
  const streak = useMemo(() => {
    if (!days) return 0;
    
    const now = new Date();
    const hour = now.getHours();
    
    // 审查起点判定
    let checkDate = new Date();
    if (hour < 4) {
      // 凌晨宽限：4点前算昨天
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    let count = 0;
    let isCheckingToday = true;
    
    // Check backwards from today
    while (true) {
      const dateStr = checkDate.toLocaleDateString('en-CA');
      const day = days[dateStr];
      
      // 三位一体判定标准：饮食、训练、身体指标
      const hasMeals = day?.meals && day.meals.length > 0;
      const hasWorkout = day?.workoutSessions && day.workoutSessions.length > 0;
      const hasMetrics = day?.weight !== undefined || day?.bodyFat !== undefined;

      if (hasMeals || hasWorkout || hasMetrics) {
        count++;
      } else {
        // 晚间保护：22:00前，如果今天没记录，不中断，继续看昨天
        if (isCheckingToday && hour < 22) {
          // 不加 count，但也不 break
        } else {
          break;
        }
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
      isCheckingToday = false;
      if (count > 3650) break; // Safety break
    }
    return count;
  }, [days]);

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
  return prev.days === next.days && prev.name === next.name;
});

StreakWidget.displayName = "StreakWidget";

export default StreakWidget;
