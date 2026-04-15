import React, { useState, memo, useTransition, useMemo, useCallback } from "react";
import { Activity, X } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import WidgetPortal from "./WidgetPortal";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { getTodayStr } from "../../../lib/utils";

const WeightWidget = () => {
  console.log("render WeightWidget");
  
  const selectedDate = useAppSelector(s => s.selectedDate);
  const dayWeight = useAppSelector(s => s.appData.days[selectedDate]?.weight);
  const dayBF = useAppSelector(s => s.appData.days[selectedDate]?.bodyFat);
  const profileWeight = useAppSelector(s => s.appData.profile.weight);
  const profileBF = useAppSelector(s => s.appData.profile.bodyFat);
  const t = useAppSelector(s => s.t);
  const setAppData = useAppSelector(s => s.setAppData);
  
  // For trend calculation, we need to know if there's a previous weight
  // To keep it stable, we only select the relevant previous weight
  const prevWeight = useAppSelector(s => {
    const dates = Object.keys(s.appData.days).sort().reverse();
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex === -1 || currentIndex === dates.length - 1) return null;
    const prevDateWithWeight = dates.slice(currentIndex + 1).find(d => s.appData.days[d].weight);
    return prevDateWithWeight ? s.appData.days[prevDateWithWeight].weight : null;
  });

  const isHistory = selectedDate !== getTodayStr();
  const [isPending, startTransition] = useTransition();
  const [showEditor, setShowEditor] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [tempBF, setTempBF] = useState("");
  const [showError, setShowError] = useState(false);

  if (showError) throw new Error("Test 1: Local Widget Crash");

  const weightTrend = useMemo(() => {
    if (prevWeight === null || dayWeight === undefined) return null;
    return dayWeight - (prevWeight || 0);
  }, [prevWeight, dayWeight]);

  const handleSave = useCallback(() => {
    const weight = tempWeight ? Number(tempWeight) : undefined;
    const bodyFat = tempBF ? Number(tempBF) : undefined;
    
    startTransition(() => {
      setAppData(prev => {
        const existingDay = prev.days[selectedDate] || { 
          date: selectedDate, 
          steps: 0, 
          water: 0, 
          meals: [], 
          workoutSessions: [] 
        };
        
        return {
          ...prev,
          days: {
            ...prev.days,
            [selectedDate]: {
              ...existingDay,
              weight,
              bodyFat
            }
          }
        };
      });
      setShowEditor(false);
    });
  }, [tempWeight, tempBF, selectedDate, setAppData]);

  const openEditor = useCallback(() => {
    setTempWeight(dayWeight?.toString() || profileWeight.toString());
    setTempBF(dayBF?.toString() || profileBF.toString());
    setShowEditor(true);
  }, [dayWeight, profileWeight, dayBF, profileBF]);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard 
        className="flex flex-col items-center text-center gap-2 p-4 h-full border-purple-500/20 bg-purple-500/5 cursor-pointer active:scale-95 transition-transform" 
        onClick={openEditor}
      >
        <div className="flex flex-col items-center justify-center w-full text-purple-400 gap-1">
          <div className="flex items-center gap-2">
            <Activity size={16} onDoubleClick={(e) => { e.stopPropagation(); setShowError(true); }} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("weightChanged")}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {dayWeight !== undefined ? dayWeight : (isHistory ? '---' : profileWeight)}
          </span>
          <span className="text-xs text-white/40">kg</span>
        </div>
        <div className="flex flex-col items-center justify-center w-full mt-auto gap-1">
          {dayBF !== undefined ? (
            <p className="text-[10px] font-bold text-pink-400">
              BF: {dayBF}%
            </p>
          ) : (
            <p className="text-[10px] text-white/20">BF: --%</p>
          )}
          {weightTrend !== null && (
            <p className={`text-[10px] font-bold ${weightTrend <= 0 ? "text-green-400" : "text-red-400"}`}>
              {weightTrend > 0 ? "+" : ""}{weightTrend.toFixed(1)} kg
            </p>
          ) || <p className="text-[10px] text-white/10">-- kg</p>}
        </div>
      </GlassCard>

      <WidgetPortal isOpen={showEditor} onClose={() => setShowEditor(false)}>
        <GlassCard className="p-6 space-y-4 border-white/20 bg-black/90 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("updateWeight" as any)}</h2>
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
};

export default memo(WeightWidget);
