import React, { useState, memo, useTransition, useEffect } from "react";
import { Droplets, X } from "lucide-react";
import { motion } from "motion/react";
import GlassCard from "../../GlassCard";
import { DayData } from "../../../types";
import WidgetPortal from "./WidgetPortal";

interface WaterWidgetProps {
  dayData: DayData;
  t: (key: string) => string;
  onUpdateWater: (amount: number) => void;
  onSetWater: (total: number) => void;
}

const WaterWidget = memo(({ dayData, t, onUpdateWater, onSetWater }: WaterWidgetProps) => {
  const [isPending, startTransition] = useTransition();
  const [showWaterEditor, setShowWaterEditor] = useState(false);
  const [tempWater, setTempWater] = useState("");
  
  // Optimistic UI state
  const [localWater, setLocalWater] = useState(dayData.water || 0);

  // Sync local state when dayData changes (but not while pending)
  useEffect(() => {
    if (!isPending) {
      setLocalWater(dayData.water || 0);
    }
  }, [dayData.water, isPending]);

  const handleQuickAdd = (amount: number) => {
    // 1. Immediate UI update (Optimistic)
    setLocalWater(prev => prev + amount);
    
    // 2. Background data update (Concurrent)
    startTransition(() => {
      onUpdateWater(amount);
    });
  };

  const handleSaveEditor = () => {
    const total = Number(tempWater);
    if (isNaN(total)) return;
    
    setLocalWater(total);
    startTransition(() => {
      onSetWater(total);
      setShowWaterEditor(false);
    });
  };

  const waterGoal = 2500;
  const percentage = Math.min(100, (localWater / waterGoal) * 100);

  return (
    <motion.div
      layout
      style={{ willChange: 'transform, opacity' }}
      className="col-span-2"
    >
      <GlassCard className="flex items-center justify-between p-4 overflow-hidden relative h-full">
        {/* Water Level Animation - Hardware Accelerated */}
        <motion.div 
          initial={false}
          animate={{ height: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 bg-blue-500/10 z-0 pointer-events-none"
        />
        
        <div className="flex items-center gap-4 z-10">
          <button 
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 active:scale-90 transition-transform"
            onClick={() => {
              setTempWater(localWater.toString());
              setShowWaterEditor(true);
            }}
          >
            <Droplets size={24} />
          </button>
          <div>
            <h3 className="font-semibold">{t("waterIntake")}</h3>
            <p className="text-xs text-white/40">
              {localWater / 1000}L / {waterGoal / 1000}L
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 z-20 relative">
          <button 
            onClick={() => handleQuickAdd(250)}
            className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/30 active:scale-95"
          >
            + 250ml
          </button>
        </div>

        {/* Water Editor Modal - Using Portal */}
        <WidgetPortal isOpen={showWaterEditor} onClose={() => setShowWaterEditor(false)}>
          <GlassCard className="p-6 space-y-4 border-white/20 bg-black/90 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("logWater")}</h2>
              <button onClick={() => setShowWaterEditor(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("waterIntake")} (ml)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-blue-500/50"
                  value={tempWater}
                  onChange={e => setTempWater(e.target.value)}
                  placeholder="e.g. 500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[250, 330, 500].map(amount => (
                  <button 
                    key={amount}
                    onClick={() => setTempWater(amount.toString())}
                    className="rounded-xl bg-white/5 py-2 text-xs font-bold hover:bg-white/[0.06] active:scale-95 transition-transform"
                  >
                    {amount}ml
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={handleSaveEditor}
              disabled={isPending}
              className="w-full rounded-2xl bg-white py-4 font-bold text-black transition-transform active:scale-95 disabled:opacity-50"
            >
              {isPending ? "..." : t("save")}
            </button>
          </GlassCard>
        </WidgetPortal>
      </GlassCard>
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.dayData.water === next.dayData.water &&
    prev.dayData.date === next.dayData.date
  );
});

WaterWidget.displayName = "WaterWidget";

export default WaterWidget;
