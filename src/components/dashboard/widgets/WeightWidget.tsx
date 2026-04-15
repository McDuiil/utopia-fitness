import React, { useState, memo, useTransition, useMemo } from "react";
import { Activity, X } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import { DayData, AppData } from "../../../types";
import WidgetPortal from "./WidgetPortal";

interface WeightWidgetProps {
  selectedDate: string;
  dayData: DayData;
  appData: AppData;
  isHistory: boolean;
  t: (key: string) => string;
  onUpdateWeight: (weight?: number, bodyFat?: number) => void;
}

const WeightWidget = memo(({ selectedDate, dayData, appData, isHistory, t, onUpdateWeight }: WeightWidgetProps) => {
  const [isPending, startTransition] = useTransition();
  const [showEditor, setShowEditor] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [tempBF, setTempBF] = useState("");

  const weightTrend = useMemo(() => {
    const dates = Object.keys(appData.days).sort().reverse();
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex === -1 || currentIndex === dates.length - 1) return null;
    
    const prevDateWithWeight = dates.slice(currentIndex + 1).find(d => appData.days[d].weight);
    if (!prevDateWithWeight || !dayData.weight) return null;
    
    return dayData.weight - (appData.days[prevDateWithWeight].weight || 0);
  }, [appData.days, selectedDate, dayData.weight]);

  const handleSave = () => {
    const weight = tempWeight ? Number(tempWeight) : undefined;
    const bodyFat = tempBF ? Number(tempBF) : undefined;
    
    startTransition(() => {
      onUpdateWeight(weight, bodyFat);
      setShowEditor(false);
    });
  };

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard 
        className="flex flex-col items-center text-center gap-2 p-4 h-full border-purple-500/20 bg-purple-500/5 cursor-pointer active:scale-95 transition-transform" 
        onClick={() => {
          setTempWeight(dayData.weight?.toString() || appData.profile.weight.toString());
          setTempBF(dayData.bodyFat?.toString() || appData.profile.bodyFat.toString());
          setShowEditor(true);
        }}
      >
        <div className="flex flex-col items-center justify-center w-full text-purple-400 gap-1">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("weightChanged")}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {dayData.weight !== undefined ? dayData.weight : (isHistory ? '---' : appData.profile.weight)}
          </span>
          <span className="text-xs text-white/40">kg</span>
        </div>
        <div className="flex flex-col items-center justify-center w-full mt-auto gap-1">
          {dayData.bodyFat !== undefined ? (
            <p className="text-[10px] font-bold text-pink-400">
              BF: {dayData.bodyFat}%
            </p>
          ) : (
            <p className="text-[10px] text-white/20">BF: --%</p>
          )}
          {weightTrend !== null && (
            <p className={`text-[10px] font-bold ${weightTrend <= 0 ? "text-green-400" : "text-red-400"}`}>
              {weightTrend > 0 ? "+" : ""}{weightTrend.toFixed(1)} kg
            </p>
          )}
        </div>
      </GlassCard>

      {/* Weight Editor Modal - Using Portal */}
      <WidgetPortal isOpen={showEditor} onClose={() => setShowEditor(false)}>
        <GlassCard className="p-6 space-y-4 border-white/20 bg-black/90 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("updateWeight")}</h2>
            <button onClick={() => setShowEditor(false)} className="text-white/40 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("weight")} (kg)</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-purple-500/50"
                value={tempWeight}
                onChange={e => setTempWeight(e.target.value)}
                placeholder="70.0"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("bodyFat")} (%)</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-pink-500/50"
                value={tempBF}
                onChange={e => setTempBF(e.target.value)}
                placeholder="15.0"
              />
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={isPending}
            className="w-full rounded-2xl bg-white py-4 font-bold text-black transition-transform active:scale-95 disabled:opacity-50"
          >
            {isPending ? "..." : t("save")}
          </button>
        </GlassCard>
      </WidgetPortal>
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.selectedDate === next.selectedDate &&
    prev.dayData.weight === next.dayData.weight &&
    prev.dayData.bodyFat === next.dayData.bodyFat &&
    prev.isHistory === next.isHistory &&
    prev.appData.profile.weight === next.appData.profile.weight &&
    prev.appData.profile.bodyFat === next.appData.profile.bodyFat &&
    // Check if history changed (for trend)
    Object.keys(prev.appData.days).length === Object.keys(next.appData.days).length
  );
});

WeightWidget.displayName = "WeightWidget";

export default WeightWidget;
