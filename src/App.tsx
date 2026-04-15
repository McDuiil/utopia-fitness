import { useState, useEffect } from "react";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import Workouts from "./components/Workouts";
import Nutrition from "./components/Nutrition";
import Profile from "./components/Profile";
import DebugLogger from "./components/DebugLogger";
import { AnimatePresence, motion } from "motion/react";
import { useAppSelector } from "./hooks/useAppSelector";
import { Tab } from "./types";
import GlassCard from "./components/GlassCard";
import { X } from "lucide-react";
import { getTodayStr } from "./lib/utils";

// Tab type moved to types.ts

export default function App() {
  const t = useAppSelector(s => s.t);
  const selectedDate = useAppSelector(s => s.selectedDate);
  const setSelectedDate = useAppSelector(s => s.setSelectedDate);
  const activeTab = useAppSelector(s => s.activeTab);
  const setActiveTab = useAppSelector(s => s.setActiveTab);
  const setAppData = useAppSelector(s => s.setAppData);
  const activeWorkoutSession = useAppSelector(s => s.appData.activeWorkoutSession);
  const profileWeight = useAppSelector(s => s.appData.profile.weight);
  const profileBodyFat = useAppSelector(s => s.appData.profile.bodyFat);
  const days = useAppSelector(s => s.appData.days);

  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [tempWeight, setTempWeight] = useState<string>("");
  const [tempBodyFat, setTempBodyFat] = useState<string>("");

  // Test 2: Global Crash Trigger
  if ((window as any).__TRIGGER_GLOBAL_CRASH__) {
    throw new Error("Test 2: Global App Crash");
  }

  // Session Recovery Logic: If there's an active workout, force switch to Workouts tab on app start
  useEffect(() => {
    if (activeWorkoutSession && activeTab === 'dashboard') {
      console.log("Active workout detected, recovering session...");
      setActiveTab('workouts');
    }
  }, []); // Only run once on mount

  useEffect(() => {
    const today = getTodayStr();
    const hasWeightToday = days[today]?.weight;
    
    // Only prompt if today's weight is missing and we haven't prompted in this session
    if (!hasWeightToday && !sessionStorage.getItem('weightPromptShown')) {
      setShowWeightPrompt(true);
      setTempWeight(profileWeight.toString());
      setTempBodyFat(profileBodyFat.toString());
      sessionStorage.setItem('weightPromptShown', 'true');
    }
  }, [days, profileWeight, profileBodyFat]);

  const handleSaveWeight = () => {
    const today = getTodayStr();
    const weightNum = parseFloat(tempWeight);
    const bodyFatNum = parseFloat(tempBodyFat);
    
    if (isNaN(weightNum)) return;

    setAppData(prev => {
      const updatedDays = { ...prev.days };
      if (!updatedDays[today]) {
        updatedDays[today] = {
          date: today,
          steps: 0,
          water: 0,
          weight: weightNum,
          bodyFat: isNaN(bodyFatNum) ? undefined : bodyFatNum,
          meals: [],
          workoutSessions: []
        };
      } else {
        updatedDays[today] = { 
          ...updatedDays[today], 
          weight: weightNum,
          bodyFat: isNaN(bodyFatNum) ? updatedDays[today].bodyFat : bodyFatNum
        };
      }

      return {
        ...prev,
        profile: { 
          ...prev.profile, 
          weight: weightNum,
          bodyFat: isNaN(bodyFatNum) ? prev.profile.bodyFat : bodyFatNum
        },
        days: updatedDays
      };
    });
    setShowWeightPrompt(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "workouts":
        return <Workouts />;
      case "nutrition":
        return <Nutrition />;
      case "profile":
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    // [MODIFIED] 根容器铺满全屏，移除 max-w-md 限制，改为 min-h-screen
    <div className="min-h-screen w-full relative overflow-hidden no-scrollbar flex flex-col bg-[#050505]">
      {/* Background Decorative Elements (Orbs) */}
      {/* [MODIFIED] 调整 z-index 为 0，避免使用 z-[-1]，提高背景显示的稳定性 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* [MODIFIED] 将内容包装层提升至 z-10，确保其位于背景装饰层之上 */}
      <div className="w-full max-w-md mx-auto relative z-10 min-h-screen flex flex-col">
        <main className="flex-1 relative z-0 overflow-y-auto no-scrollbar">
          <motion.div
            key={activeTab}
            className="w-full"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.15,
              ease: [0.23, 1, 0.32, 1] 
            }}
          >
            {renderContent()}
          </motion.div>
          <div className="h-32" /> {/* Bottom Spacer inside scrollable area */}
        </main>

        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Weight Prompt Modal */}
      {showWeightPrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm space-y-4 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("weightPrompt")}</h2>
              <button onClick={() => setShowWeightPrompt(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">{t("enterWeight")}</p>
                <input 
                  type="number" 
                  step="0.1"
                  autoFocus
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={profileWeight.toString()}
                  value={tempWeight}
                  onChange={e => setTempWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">{t("enterBodyFat")}</p>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={profileBodyFat.toString()}
                  value={tempBodyFat}
                  onChange={e => setTempBodyFat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveWeight()}
                />
              </div>
              <button 
                onClick={handleSaveWeight}
                className="w-full rounded-2xl bg-blue-500 py-4 text-sm font-bold text-white transition-transform active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {t("save")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Debug Logger Drawer */}
      <DebugLogger />
    </div>
  );
}
