import React, { useState, useCallback, memo } from "react";
import { Plus, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import GlassCard from "../GlassCard";

interface AddWorkoutButtonProps {
  t: (key: string) => string;
  onStartNewWorkout: () => void;
  onStartPlanning: () => void;
  disabled: boolean;
}

const AddWorkoutButton = memo(({ t, onStartNewWorkout, onStartPlanning, disabled }: AddWorkoutButtonProps) => {
  const [showAddOptions, setShowAddOptions] = useState(false);

  // Body scroll lock
  React.useEffect(() => {
    if (showAddOptions) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showAddOptions]);

  const toggleMenu = useCallback(() => {
    if (disabled) return;
    setShowAddOptions(prev => !prev);
  }, [disabled]);

  const handleAction = useCallback((action: () => void) => {
    action();
    setShowAddOptions(false);
  }, []);

  if (disabled) return null;

  return (
    <>
      <button 
        onClick={toggleMenu}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
      >
        <Plus size={24} />
      </button>

      <AnimatePresence>
        {showAddOptions && (
          <div 
            className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            onClick={() => setShowAddOptions(false)}
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm space-y-3 pb-8"
              layout
            >
              <GlassCard className="p-2 border-white/10 bg-gray-900/90 shadow-2xl">
                <button 
                  onClick={() => handleAction(onStartNewWorkout)}
                  className="flex w-full items-center gap-4 rounded-xl p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                    <Play size={20} fill="currentColor" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{t("startNewWorkout")}</p>
                    <p className="text-xs text-white/40">Record your training in real-time</p>
                  </div>
                </button>
                <div className="h-[1px] bg-white/5 mx-4" />
                <button 
                  onClick={() => handleAction(onStartPlanning)}
                  className="flex w-full items-center gap-4 rounded-xl p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                    <Plus size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{t("trainingPlan")}</p>
                    <p className="text-xs text-white/40">Plan your workout for today</p>
                  </div>
                </button>
              </GlassCard>
              <button 
                onClick={() => setShowAddOptions(false)}
                className="w-full rounded-2xl bg-white/10 py-4 font-bold text-white backdrop-blur-xl active:scale-[0.98] transition-transform"
              >
                {t("cancel")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

AddWorkoutButton.displayName = "AddWorkoutButton";

export default AddWorkoutButton;
