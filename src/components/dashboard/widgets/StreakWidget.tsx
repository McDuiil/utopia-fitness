import React, { memo, useMemo } from "react";
import { Award } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import { DayData } from "../../../types";

interface StreakWidgetProps {
  days: Record<string, DayData>;
  name: string;
  t: (key: string) => string;
}

const StreakWidget = memo(({ days, name, t }: StreakWidgetProps) => {
  const streak = useMemo(() => {
    // 【坚固化保护】确保 days 是有效的对象，防止 Object.keys 裸奔导致崩溃
    if (!days || typeof days !== 'object') return 0;

    try {
      const dayKeys = Object.keys(days);
      if (dayKeys.length === 0) return 0;

      let count = 0;
      let checkDate = new Date();
      
      // 【人性化宽限】凌晨 0-4 点逻辑：若此时没记录，自动回溯从昨天开始算
      if (checkDate.getHours() < 4) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      let safetyNet = 500; // 绝对安全锁，防止死循环

      while (safetyNet > 0) {
        const dateKey = checkDate.toISOString().split('T')[0];
        const dayData = days[dateKey];

        // 【核心算法】三位一体活跃判定：饮食记录 OR 训练记录(未删除) OR 体重/体脂更新
        const isActive = dayData && (
          (dayData.meals && dayData.meals.length > 0) || 
          (dayData.workoutSessions && dayData.workoutSessions.some(s => !s.deleted)) ||
          (dayData.weight || dayData.bodyFat)
        );

        if (isActive) {
          count++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // 【晚间宽限】如果是今天且还没到晚上 22:00，跳过今天继续回溯
          if (dateKey === todayStr && new Date().getHours() < 22) {
            checkDate.setDate(checkDate.getDate() - 1);
            safetyNet--;
            continue;
          }
          break; // 真正的连续记录中断
        }
        safetyNet--;
      }
      return count;
    } catch (e) {
      console.error("Streak 计算逻辑异常:", e);
      return 0;
    }
  }, [days]);

  // 以 30 天为一个视觉进度周期
  const percentage = Math.min(100, (streak / 30) * 100);

  return (
    <motion.div layout className="h-full">
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
          {streak >= 40 ? "自律之神！" : streak > 0 ? t("keepGoing") : "开始第一天！"}
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
});

export default StreakWidget;
