import { useState, useEffect } from "react";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import Workouts from "./components/Workouts";
import Nutrition from "./components/Nutrition";
import Profile from "./components/Profile";
import { motion } from "motion/react";
import { useApp } from "./context/AppContext";
import GlassCard from "./components/GlassCard";
import { X } from "lucide-react";
import { getTodayStr } from "./lib/utils";

export default function App() {
  const { appData, setAppData, t, activeTab, setActiveTab } = useApp();
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [tempWeight, setTempWeight] = useState<string>("");
  const [tempBodyFat, setTempBodyFat] = useState<string>("");

  /* 路由/会话恢复逻辑 */
  useEffect(() => {
    if (appData.activeWorkoutSession && activeTab === 'dashboard') {
      setActiveTab('workouts');
    }
  }, [appData.activeWorkoutSession, activeTab, setActiveTab]);

  /* 每日体重提醒逻辑 */
  useEffect(() => {
    const today = getTodayStr();
    const hasWeightToday = appData.days[today]?.weight;
    if (!hasWeightToday && !sessionStorage.getItem('weightPromptShown')) {
      setShowWeightPrompt(true);
      setTempWeight(appData.profile.weight.toString());
      setTempBodyFat(appData.profile.bodyFat.toString());
      sessionStorage.setItem('weightPromptShown', 'true');
    }
  }, [appData.days, appData.profile.weight, appData.profile.bodyFat]);

  const handleSaveWeight = () => {
    const today = getTodayStr();
    const weightNum = parseFloat(tempWeight);
    const bodyFatNum = parseFloat(tempBodyFat);
    if (isNaN(weightNum)) return;

    const updatedDays = { ...appData.days };
    if (!updatedDays[today]) {
      updatedDays[today] = {
        date: today, calories: 0, steps: 0, water: 0,
        weight: weightNum, bodyFat: isNaN(bodyFatNum) ? undefined : bodyFatNum,
        meals: [], workoutSessions: []
      };
    } else {
      updatedDays[today] = { 
        ...updatedDays[today], 
        weight: weightNum, 
        bodyFat: isNaN(bodyFatNum) ? updatedDays[today].bodyFat : bodyFatNum 
      };
    }

    setAppData({
      ...appData,
      profile: { ...appData.profile, weight: weightNum, bodyFat: isNaN(bodyFatNum) ? appData.profile.bodyFat : bodyFatNum },
      days: updatedDays
    });
    setShowWeightPrompt(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "workouts": return <Workouts />;
      case "nutrition": return <Nutrition />;
      case "profile": return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col bg-[#050505] selection:bg-blue-500/30">
      {/* 背景装饰层 - 锁死 z-0 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[90px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[80px] animate-pulse" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[70px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* 内容承载层 - 锁死 z-10 确保交互正常 */}
      <div className="w-full max-w-md mx-auto relative min-h-screen flex flex-col z-10">
        <main className="flex-1 relative overflow-y-auto no-scrollbar px-4">
          <motion.div
            key={activeTab}
            className="w-full py-6"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            {renderContent()}
          </motion.div>
          <div className="h-32" />
        </main>
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* 体重弹窗层 - 锁死 z-[200] */}
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
                  type="number" step="0.1" autoFocus
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={appData.profile.weight.toString()}
                  value={tempWeight}
                  onChange={e => setTempWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">{t("enterBodyFat")}</p>
                <input 
                  type="number" step="0.1"
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={appData.profile.bodyFat.toString()}
                  value={tempBodyFat}
                  onChange={e => setTempBodyFat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveWeight()}
                />
              </div>
              <button onClick={handleSaveWeight} className="w-full rounded-2xl bg-blue-500 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">
                {t("save")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
