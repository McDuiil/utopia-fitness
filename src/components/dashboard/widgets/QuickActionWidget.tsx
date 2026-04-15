import React, { memo } from "react";
import { Play, Utensils } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";

interface QuickActionWidgetProps {
  type: 'workout' | 'meal';
  label: string;
  subLabelText: string;
  onClick: () => void;
}

const QuickActionWidget = memo(({ type, label, subLabelText, onClick }: QuickActionWidgetProps) => {
  const isWorkout = type === 'workout';
  const Icon = isWorkout ? Play : Utensils;
  const colorClass = isWorkout ? "bg-blue-500 shadow-blue-500/30" : "bg-green-500 shadow-green-500/30";
  const borderClass = isWorkout ? "bg-blue-500/10 border-blue-500/20" : "bg-green-500/10 border-green-500/20";

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard 
        className={`flex flex-col items-center justify-center p-4 h-full cursor-pointer active:scale-95 transition-transform text-center gap-3 ${borderClass}`}
        onClick={onClick}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${colorClass}`}>
          <Icon size={24} fill={isWorkout ? "currentColor" : "none"} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black tracking-tight">{label}</h3>
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{subLabelText}</p>
        </div>
      </GlassCard>
    </motion.div>
  );
});

QuickActionWidget.displayName = "QuickActionWidget";

export default QuickActionWidget;
