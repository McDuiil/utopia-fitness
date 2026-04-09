import React, { useState } from "react";
import { Activity, Flame, Footprints, Droplets, Plus, Play, Utensils, Settings, X, Check, AlertCircle } from "lucide-react";
import GlassCard from "./GlassCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useApp } from "@/src/context/AppContext";
import { DayData } from "../types";
import { getTodayStr } from "../lib/utils";

export default function Dashboard() {
  const { t, appData, language, calculateBMR, setAppData, selectedDate, setSelectedDate, setActiveTab, resolvedNutritionToday } = useApp();
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [showWaterEditor, setShowWaterEditor] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [tempBF, setTempBF] = useState("");
  const [tempWater, setTempWater] = useState("");
  const today = getTodayStr();
  const isHistory = selectedDate !== today;
  const dayData = appData.days[selectedDate] || { date: selectedDate, steps: 0, water: 0, meals: [], workoutSessions: [] };
  
  const bmr = calculateBMR(appData.profile);
  const workoutCalories = (dayData.workoutSessions || []).reduce((sum, s) => sum + (s.calories || 0), 0);
  
  const totalBurned = bmr + workoutCalories;
  const dailyDeficit = totalBurned - resolvedNutritionToday.calories.consumed;

  const chartData = [
    { time: "6am", calories: 120 },
    { time: "9am", calories: 340 },
    { time: "12pm", calories: 680 },
    { time: "3pm", calories: 890 },
    { time: "6pm", calories: 1240 },
    { time: "9pm", calories: resolvedNutritionToday.calories.consumed || 1420 },
  ];

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const date = new Date(selectedDate + 'T00:00:00');
    return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', options).format(date);
  };

  const getTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour < 10) return t("breakfast");
    if (hour < 14) return t("lunch");
    if (hour < 19) return t("dinner");
    return t("snack");
  };

  const handleQuickLogMeal = () => {
    setActiveTab('nutrition');
  };

  const toggleWidget = (id: string) => {
    const enabled = appData.enabledWidgets || [];
    const newWidgets = enabled.includes(id) 
      ? enabled.filter(w => w !== id)
      : [...enabled, id];
    setAppData({ ...appData, enabledWidgets: newWidgets });
  };

  const isEnabled = (id: string) => (appData.enabledWidgets || []).includes(id);

  const getWeightTrend = () => {
    const dates = Object.keys(appData.days).sort().reverse();
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex === -1 || currentIndex === dates.length - 1) return null;
    
    const prevDateWithWeight = dates.slice(currentIndex + 1).find(d => appData.days[d].weight);
    console.log("Current date:", selectedDate, "Weight:", dayData.weight, "Prev date with weight:", prevDateWithWeight, "Prev weight:", prevDateWithWeight ? appData.days[prevDateWithWeight].weight : 'N/A');
    if (!prevDateWithWeight || !dayData.weight) return null;
    
    const diff = dayData.weight - (appData.days[prevDateWithWeight].weight || 0);
    return diff;
  };

  const getWeightHistory = () => {
    return Object.entries(appData.days)
      .filter(([_, data]) => (data as DayData).weight !== undefined || (data as DayData).bodyFat !== undefined)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, data]) => ({
        date: date.split('-').slice(1).join('/'),
        weight: (data as DayData).weight,
        bodyFat: (data as DayData).bodyFat
      }));
  };

  const weightHistoryData = getWeightHistory();
  const weightTrend = getWeightTrend();
  const calorieGoal = appData.profile?.customCalorieGoal || 2400;

  const handleSaveWeight = () => {
    const day = appData.days[selectedDate] || { date: selectedDate, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [selectedDate]: {
          ...day,
          weight: tempWeight ? Number(tempWeight) : undefined,
          bodyFat: tempBF ? Number(tempBF) : undefined
        }
      }
    });
    setShowWeightEditor(false);
  };

  const openWeightEditor = () => {
    setTempWeight(dayData.weight?.toString() || "");
    setTempBF(dayData.bodyFat?.toString() || "");
    setShowWeightEditor(true);
  };

  const handleAddWater = (amount: number) => {
    const day = appData.days[selectedDate] || { date: selectedDate, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [selectedDate]: {
          ...day,
          water: (day.water || 0) + amount
        }
      }
    });
  };

  const handleSaveWater = () => {
    const day = appData.days[selectedDate] || { date: selectedDate, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [selectedDate]: {
          ...day,
          water: Number(tempWater)
        }
      }
    });
    setShowWaterEditor(false);
  };

  return (
    <div className="space-y-6 pb-32 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {isHistory ? t("viewingHistory") : t("today")}
            </h1>
            {isHistory && (
              <button 
                onClick={() => setSelectedDate(today)}
                className="rounded-full bg-blue-500/20 px-2 py-1 text-[10px] font-bold text-blue-400"
              >
                {t("backToToday")}
              </button>
            )}
          </div>
          <p className="text-white/40 dark:text-white/40 light:text-black/40">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowWidgetManager(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings size={20} />
          </button>
          <div className="h-12 w-12 rounded-full border border-white/20 bg-white/10 p-1 dark:border-white/20 dark:bg-white/10 light:border-black/10 light:bg-black/5">
            <img
              src={appData.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`}
              alt="Avatar"
              className="h-full w-full rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Resume Workout Banner */}
      {appData.activeWorkoutSession && (
        <div className="px-4">
          <GlassCard 
            className="flex items-center justify-between p-4 border-blue-500/30 bg-blue-500/10 cursor-pointer active:scale-95 transition-transform"
            onClick={() => setActiveTab('workouts')}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white animate-pulse">
                <Play size={20} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-400">{t("workoutInProgress")}...</h3>
                <p className="text-[10px] text-white/40">
                  {appData.activeWorkoutSession.category ? t(appData.activeWorkoutSession.category as any) : t("workouts")} • {new Date(appData.activeWorkoutSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-xs font-bold">{t("resume")}</span>
              <Play size={14} fill="currentColor" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Quick Action Widgets Row */}
      <div className="grid grid-cols-2 gap-4 px-4">
        {isEnabled('quickWorkout') && (
          <GlassCard 
            className="flex flex-col justify-between p-4 aspect-square cursor-pointer active:scale-95 transition-transform bg-blue-500/10 border-blue-500/20"
            onClick={() => setActiveTab('workouts')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
              <Play size={20} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{t("quickStart")}</h3>
              <p className="text-[10px] text-white/40 dark:text-white/40 light:text-black/40">{t("workouts")}</p>
            </div>
          </GlassCard>
        )}

        {isEnabled('quickMeal') && (
          <GlassCard 
            className="flex flex-col justify-between p-4 aspect-square cursor-pointer active:scale-95 transition-transform bg-green-500/10 border-green-500/20"
            onClick={handleQuickLogMeal}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg shadow-green-500/30">
              <Utensils size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold">{t("quickLog")}</h3>
              <p className="text-[10px] text-white/40 dark:text-white/40 light:text-black/40">{getTimeSlot()}</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 px-4">
        {isEnabled('weight') && (
          <GlassCard 
            className="flex flex-col items-center text-center gap-2 p-4 border-purple-500/20 bg-purple-500/5 cursor-pointer active:scale-95 transition-transform" 
            delay={0.05}
            onClick={openWeightEditor}
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
              <span className="text-xs text-white/40 dark:text-white/40 light:text-black/40">kg</span>
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
        )}

        {isEnabled('calories') && (
          <GlassCard className="flex flex-col items-center text-center gap-2 p-4 border-orange-500/20 bg-orange-500/5" delay={0.1}>
            <div className="flex flex-col items-center justify-center w-full text-orange-400 gap-1">
              <div className="flex items-center gap-2">
                <Flame size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("calories")}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{resolvedNutritionToday.calories.consumed}</span>
              <span className="text-xs text-white/40 dark:text-white/40 light:text-black/40">kcal</span>
            </div>
            <p className="text-[10px] text-white/40 dark:text-white/40 light:text-black/40">Goal: {resolvedNutritionToday.calories.dynamicGoal} kcal</p>
            <div className="h-1 w-full rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5 mt-auto">
              <div 
                className="h-full rounded-full bg-orange-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, resolvedNutritionToday.percentage.calories)}%` }}
              />
            </div>
          </GlassCard>
        )}

        {isEnabled('deficit') && (
          <GlassCard className="flex flex-col items-center text-center gap-2 p-4 border-blue-500/20 bg-blue-500/5" delay={0.2}>
            <div className="flex flex-col items-center justify-center w-full text-blue-400 gap-1">
              <div className="flex items-center gap-2">
                <Activity size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("dailyDeficit")}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{Math.round(dailyDeficit)}</span>
              <span className="text-xs text-white/40 dark:text-white/40 light:text-black/40">kcal</span>
            </div>
            <p className="text-[10px] text-white/40 dark:text-white/40 light:text-black/40">Target: {appData.profile.goalDeficit} kcal</p>
            <div className="h-1 w-full rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5 mt-auto">
              <div 
                className="h-full rounded-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, (dailyDeficit / appData.profile.goalDeficit) * 100)}%` }}
              />
            </div>
          </GlassCard>
        )}

        {isEnabled('bodyFat') && (
          <GlassCard 
            className="flex flex-col items-center text-center gap-2 p-4 border-pink-500/20 bg-pink-500/5 cursor-pointer active:scale-95 transition-transform" 
            delay={0.25}
            onClick={() => {
              setActiveTab('profile');
              // We'll trigger the BF history modal in Profile.tsx
            }}
          >
            <div className="flex flex-col items-center justify-center w-full text-pink-400 gap-1">
              <div className="flex items-center gap-2">
                <Activity size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("bodyFat")}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {dayData.bodyFat !== undefined ? dayData.bodyFat : (isHistory ? '--' : appData.profile.bodyFat)}
              </span>
              <span className="text-xs text-white/40 dark:text-white/40 light:text-black/40">%</span>
            </div>
            <p className="text-[10px] text-white/40 dark:text-white/40 light:text-black/40">Goal: {appData.profile.goalBodyFat}%</p>
            <div className="h-1 w-full rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5 mt-auto">
              <div 
                className="h-full rounded-full bg-pink-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, ((dayData.bodyFat || appData.profile.bodyFat || 20) / (appData.profile.goalBodyFat || 15)) * 100)}%` }}
              />
            </div>
          </GlassCard>
        )}
      </div>

      {/* Late Night Coach Suggestion */}
      {!isHistory && new Date().getHours() >= 22 && (
        <div className="px-4">
          <GlassCard className="p-4 border-yellow-500/30 bg-yellow-500/10 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500 text-black">
              <AlertCircle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-yellow-500">{t("lateNightTitle")}</h3>
              <p className="text-xs text-white/70">
                {resolvedNutritionToday.remaining.protein > 20 
                  ? t("proteinDeficitSuggestion")
                  : resolvedNutritionToday.remaining.carbs < -30
                    ? t("carbExcessSuggestion")
                    : t("goalAchievedSuggestion")
                }
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Weight History Chart */}
      {isEnabled('activity') && (
        <div className="px-4">
          <GlassCard className="h-[320px] flex flex-col p-6" delay={0.3}>
            <div className="mb-6 flex items-center justify-center w-full text-purple-400">
              <div className="flex items-center gap-2">
                <Activity size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("weightTrend")}</span>
              </div>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightHistoryData.length > 0 ? weightHistoryData : [{date: 'N/A', weight: appData.profile.weight, bodyFat: appData.profile.bodyFat}]}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBodyFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  />
                  <YAxis 
                    yId="left"
                    orientation="left"
                    tick={{ fill: 'rgba(168, 85, 247, 0.4)', fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    yId="right"
                    orientation="right"
                    tick={{ fill: 'rgba(236, 72, 153, 0.4)', fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area 
                    yId="left"
                    type="monotone" 
                    dataKey="weight" 
                    name={t('weight')}
                    stroke="#a855f7" 
                    fillOpacity={1} 
                    fill="url(#colorWeight)" 
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                  <Area 
                    yId="right"
                    type="monotone" 
                    dataKey="bodyFat" 
                    name={t('bodyFat')}
                    stroke="#ec4899" 
                    fillOpacity={1} 
                    fill="url(#colorBodyFat)" 
                    strokeWidth={2}
                    dot={{ fill: '#ec4899', r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Water Intake */}
      {isEnabled('water') && (
        <div className="px-4">
          <GlassCard className="flex items-center justify-between p-4 overflow-hidden relative" delay={0.4}>
            {/* Water Wave Background Effect */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-blue-500/10 transition-all duration-1000 ease-out z-0 pointer-events-none"
              style={{ height: `${Math.min(100, ((dayData.water || 0) / 2500) * 100)}%` }}
            />
            
            <div className="flex items-center gap-4 z-10">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 cursor-pointer active:scale-90 transition-transform"
                onClick={() => {
                  setTempWater(dayData.water?.toString() || "0");
                  setShowWaterEditor(true);
                }}
              >
                <Droplets size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{t("waterIntake")}</h3>
                <p className="text-xs text-white/40 dark:text-white/40 light:text-black/40">
                  {(dayData.water || 0) / 1000}L / 2.5L
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 z-20 relative">
              <button 
                onClick={() => handleAddWater(250)}
                className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/30 active:scale-90 pointer-events-auto"
              >
                + 250ml
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Weight Editor Modal */}
      {showWeightEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("recordWeight")}</h2>
              <button onClick={() => setShowWeightEditor(false)} className="text-white/40 hover:text-white">
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
                  placeholder="e.g. 65.5"
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
                  placeholder="e.g. 15.2"
                />
              </div>
            </div>
            <button 
              onClick={handleSaveWeight}
              className="w-full rounded-2xl bg-white py-4 font-bold text-black transition-transform active:scale-95"
            >
              {t("save")}
            </button>
          </GlassCard>
        </div>
      )}

      {/* Water Editor Modal */}
      {showWaterEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/80">
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
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[250, 330, 500].map(amount => (
                  <button 
                    key={amount}
                    onClick={() => setTempWater(amount.toString())}
                    className="rounded-xl bg-white/5 py-2 text-xs font-bold hover:bg-white/10"
                  >
                    {amount}ml
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={handleSaveWater}
              className="w-full rounded-2xl bg-white py-4 font-bold text-black transition-transform active:scale-95"
            >
              {t("save")}
            </button>
          </GlassCard>
        </div>
      )}

      {/* Widget Manager Modal */}
      {showWidgetManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("manageWidgets")}</h2>
              <button onClick={() => setShowWidgetManager(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'weight', label: t("weightTrend") },
                { id: 'bodyFat', label: t("bodyFat") },
                { id: 'calories', label: t("calories") },
                { id: 'deficit', label: t("deficitWidget") },
                { id: 'activity', label: t("activityWidget") },
                { id: 'water', label: t("waterWidget") },
                { id: 'quickWorkout', label: t("quickWorkoutWidget") },
                { id: 'quickMeal', label: t("quickMealWidget") },
              ].map(w => (
                <button
                  key={w.id}
                  onClick={() => toggleWidget(w.id)}
                  className={`flex items-center justify-between rounded-xl p-4 transition-all ${
                    isEnabled(w.id) ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/40"
                  }`}
                >
                  <span className="font-bold">{w.label}</span>
                  {isEnabled(w.id) && <Check size={18} />}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowWidgetManager(false)}
              className="w-full rounded-2xl bg-white py-4 font-bold text-black transition-transform active:scale-95"
            >
              {t("save")}
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
