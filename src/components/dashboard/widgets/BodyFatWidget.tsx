import React, { useState, memo, useTransition, useMemo, useCallback } from "react";
import { Activity, X } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import WidgetPortal from "./WidgetPortal";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { getTodayStr } from "../../../lib/utils";

const BodyFatWidget = () => {
  console.log("render BodyFatWidget");
  
  const selectedDate = useAppSelector(s => s.selectedDate);
  const dayBF = useAppSelector(s => s.appData.days[selectedDate]?.bodyFat);
  const dayWeight = useAppSelector(s => s.appData.days[selectedDate]?.weight);
  const profileWeight = useAppSelector(s => s.appData.profile.weight);
  const profileBF = useAppSelector(s => s.appData.profile.bodyFat);
  const t = useAppSelector(s => s.t);
  const setAppData = useAppSelector(s => s.setAppData);
  
  // Logic aligned with WeightWidget to find the most recent previous record
  const prevBF = useAppSelector(s => {
    const dates = Object.keys(s.appData.days).sort().reverse();
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex === -1 || currentIndex === dates.length - 1) return null;
    const prevDateWithBF = dates.slice(currentIndex + 1).find(d => s.appData.days[d].bodyFat);
    return prevDateWithBF ? s.appData.days[prevDateWithBF].bodyFat : null;
  });

  const isHistory = selectedDate !== getTodayStr();
  const [isPending, startTransition] = useTransition();
  const [showEditor, setShowEditor] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [tempBF, setTempBF] = useState("");

  const bfTrend = useMemo(() => {
    if (prevBF === null || dayBF === undefined) return null;
    return dayBF - (prevBF || 0);
  }, [prevBF, dayBF]);

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
              weight: weight || existingDay.weight,
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

  const displayBF = dayBF !== undefined ? dayBF : (isHistory ? profileBF : profileBF);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <GlassCard 
        className="flex flex-col items-center text-center gap-2 p-4 h-full border-pink-500/20 bg-pink-500/5 cursor-pointer active:scale-95 transition-transform" 
        onClick={openEditor}
      >
        <div className="flex flex-col items-center justify-center w-full text-pink-400 gap-1">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t("bodyFat")}</span>
          </div>
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {displayBF}
          </span>
          <span className="text-xs text-white/40">%</span>
        </div>

        <div className="flex flex-col items-center justify-center w-full mt-auto gap-1">
          <p className="text-[10px] text-white/40">
            W: {dayWeight || profileWeight} kg
          </p>
          {bfTrend !== null ? (
            <p className={`text-[10px] font-bold ${bfTrend <= 0 ? "text-green-400" : "text-red-400"}`}>
              {bfTrend > 0 ? "+" : ""}{bfTrend.toFixed(1)}%
            </p>
          ) : (
            <p className="text-[10px] text-white/10">--%</p>
          )}
        </div>
      </GlassCard>

      <WidgetPortal isOpen={showEditor} onClose={() => setShowEditor(false)}>
        <GlassCard className="p-6 space-y-4 border-white/20 bg-black/90 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("updateBodyFat" as any) || "Update Body Metrics"}</h2>
            <button onClick={() => setShowEditor(false)} className="text-white/40 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("bodyFat")} (%)</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-pink-500/50"
                value={tempBF}
                onChange={e => setTempBF(e.target.value)}
                placeholder="15.0"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("weight")} (kg)</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-purple-500/50"
                value={tempWeight}
                onChange={e => setTempWeight(e.target.value)}
                placeholder="70.0"
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

export default memo(BodyFatWidget);
