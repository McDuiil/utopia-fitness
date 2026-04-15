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
    // 【第一道防线】绝对空值保护，防止 Object.keys 崩溃
    if (!days || typeof days !== 'object') {
      console.log("StreakWidget: 等待数据加载中...");
      return 0;
    }

    try {
      const dayKeys = Object.keys(days);
      if (dayKeys.length === 0) return 0;

      // 调试日志：确认是否读取到了 3 月的历史记录
      console.log("Streak 扫描天数:", dayKeys.length);

      let count = 0;
      let checkDate = new Date();
      
      // 【逻辑补丁】凌晨 0-4 点逻辑：若此时没记录，自动回溯从昨天开始算
      if (checkDate.getHours() < 4) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      let safetyNet = 500; // 安全锁：防止任何意外导致的死循环

      while (safetyNet > 0) {
        // 格式化为 YYYY-MM-DD 以匹配数据库 Key
        const dateKey = checkDate.toISOString().split('T')[0];
        const dayData = days[dateKey];

        // 【活跃判定】饮食记录 OR 训练记录 OR 体重/体脂更新
        const isActive = dayData && (
          (dayData.meals && dayData.meals.length > 0) || 
          (dayData.workoutSessions && dayData.workoutSessions.some(s => !s.deleted)) ||
          (dayData.weight || dayData.bodyFat)
        );

        if (isActive) {
          count++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // 【晚间宽限】如果是今天且还没到晚上 22:00，跳过今天继续回溯，不计入中断
          if (dateKey === todayStr && new Date().getHours() < 22) {
            checkDate.setDate(checkDate.getDate() - 1);
            safetyNet--;
            continue;
          }
          break; // 真正的连续中断点
        }
        safetyNet--;
      }
      return count;
    } catch (e) {
      console.error("Streak 计算逻辑异常:", e);
      return 0;
    }
  }, [days]);

  // 以 30 天为一个视觉周期进度条
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
            className="h-full rounded-full bg-yellow-500" 
          />
        </div>
      </GlassCard>
    </motion.div>
  );
});

export default StreakWidget;
