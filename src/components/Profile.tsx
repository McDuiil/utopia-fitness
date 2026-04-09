import React, { ChangeEvent, useState } from "react";
import { Settings, LogOut, ChevronRight, Award, Target, Heart, Globe, Moon, Sun, Download, Upload, X, ChevronLeft, Flame, RefreshCw, Activity } from "lucide-react";
import GlassCard from "./GlassCard";
import { useApp } from "@/src/context/AppContext";
import { Profile as ProfileType, DayData } from "@/src/types";
import { SyncSettings } from "./SyncSettings";
import { getTodayStr } from "../lib/utils";

export default function Profile() {
  const { t, language, setLanguage, theme, setTheme, appData, setAppData, calculateBMR, setSelectedDate, setActiveTab, mergeData, syncWithGist, showToast, user } = useApp();
  const [showEditor, setShowEditor] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showBFHistory, setShowBFHistory] = useState(false);
  const [tempProfile, setTempProfile] = useState<ProfileType>(appData.profile);
  const [historyDate, setHistoryDate] = useState(getTodayStr());
  const [historyBF, setHistoryBF] = useState("");

  const handleExport = () => {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `utopia_data_${getTodayStr()}.json`;
    link.click();
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        console.log("Importing JSON:", json);
        mergeData(json);
        showToast(t("syncSuccess"));
      } catch (err) {
        showToast(t("syncError"), "error");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveProfile = () => {
    setAppData({ ...appData, profile: tempProfile });
    setShowEditor(false);
  };

  const handleSaveHistoryBF = () => {
    const day = appData.days[historyDate] || { date: historyDate, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [historyDate]: {
          ...day,
          bodyFat: Number(historyBF)
        }
      }
    });
    setHistoryBF("");
  };

  const bfHistory = Object.entries(appData.days)
    .filter(([_, data]) => (data as DayData).bodyFat !== undefined)
    .sort((a, b) => b[0].localeCompare(a[0])) as [string, DayData][];

  const currentBMR = calculateBMR(appData.profile);
  const today = getTodayStr();

  const calculateStreak = () => {
    let streak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toLocaleDateString('en-CA');
      const day = appData.days[dateStr];
      const hasActivity = day && (
        (day.meals && day.meals.length > 0) || 
        (day.workoutSessions && day.workoutSessions.length > 0) ||
        (day.steps && day.steps > 0)
      );

      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If it's today and no activity yet, don't break the streak, just check yesterday
        if (dateStr === today) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();
  const dayData = appData.days[today] || { date: today, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
  const mealCalories = (dayData.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
  const workoutCalories = (dayData.workoutSessions || []).reduce((sum, s) => sum + (s.calories || 0), 0);
  const dailyDeficit = (currentBMR + workoutCalories) - mealCalories;

  // Calendar Logic
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasData = appData.days[dateStr];
      const isToday = getTodayStr() === dateStr;

      days.push(
        <div 
          key={d} 
          onClick={() => {
            setSelectedDate(dateStr);
            setActiveTab('dashboard');
          }}
          className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-90 ${
            hasData ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-white/5 text-white/40 dark:bg-white/5 dark:text-white/40 light:bg-black/5 light:text-black/40"
          } ${isToday ? "ring-2 ring-blue-500" : ""}`}
        >
          {d}
          {hasData && hasData.done && (
            <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6 pb-32 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-4 px-4">
        <div 
          className="relative h-24 w-24 cursor-pointer rounded-full border-2 border-white/20 p-1 transition-transform active:scale-95 dark:border-white/20 light:border-black/10"
          onClick={() => setShowEditor(true)}
        >
          <img
            src={appData.profile.avatar || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'Felix'}`}
            alt="Avatar"
            className="h-full w-full rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg">
            <Settings size={16} />
          </div>
          {user && (
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 border-2 border-black">
              <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            </div>
          )}
        </div>
        <div className="text-center w-full overflow-hidden px-4">
          <h1 className="text-2xl font-bold truncate">{appData.profile.nickname || user?.displayName || "Utopia User"}</h1>
          <p className="text-sm text-white/40 dark:text-white/40 light:text-black/40 truncate">
            {user?.email ? `${user.email} • ` : ''}BMR: {currentBMR} kcal
          </p>
        </div>
      </div>

      {/* Profile Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/80 dark:border-white/20 dark:bg-black/80 light:border-black/10 light:bg-white/90">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("profileSettings")}</h2>
              <button onClick={() => setShowEditor(false)} className="text-white/40 hover:text-white dark:text-white/40 light:text-black/40">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("nickname")}</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                  value={tempProfile.nickname}
                  onChange={e => setTempProfile({...tempProfile, nickname: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("avatar")}</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                    placeholder="Image URL"
                    value={tempProfile.avatar}
                    onChange={e => setTempProfile({...tempProfile, avatar: e.target.value})}
                  />
                  <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 hover:bg-white/20">
                    <Upload size={18} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setTempProfile({...tempProfile, avatar: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("gender")}</label>
                <select 
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5 dark:text-white light:text-black"
                  value={tempProfile.gender}
                  onChange={e => setTempProfile({...tempProfile, gender: e.target.value as any})}
                >
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("age")}</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                  value={tempProfile.age}
                  onChange={e => setTempProfile({...tempProfile, age: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("height")} (cm)</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                  value={tempProfile.height}
                  onChange={e => setTempProfile({...tempProfile, height: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("weight")} (kg)</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                  value={tempProfile.weight}
                  onChange={e => setTempProfile({...tempProfile, weight: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("bodyFat")} (%)</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                  value={tempProfile.bodyFat}
                  onChange={e => setTempProfile({...tempProfile, bodyFat: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("bmr")}</label>
                <button 
                  onClick={() => setTempProfile({...tempProfile, useCustomBMR: !tempProfile.useCustomBMR})}
                  className="text-[10px] font-bold text-blue-400"
                >
                  {tempProfile.useCustomBMR ? t("autoBMR") : t("manualBMR")}
                </button>
              </div>
              <input 
                type="number" 
                inputMode="decimal"
                disabled={!tempProfile.useCustomBMR}
                className={`w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5 ${!tempProfile.useCustomBMR ? "opacity-50" : ""}`}
                value={tempProfile.useCustomBMR ? tempProfile.customBMR : calculateBMR(tempProfile)}
                onChange={e => setTempProfile({...tempProfile, customBMR: Number(e.target.value)})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("goalWeight")}</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                  value={tempProfile.goalWeight}
                  onChange={e => setTempProfile({...tempProfile, goalWeight: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("goalBodyFat")} (%)</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none dark:bg-white/5 light:bg-black/5"
                  value={tempProfile.goalBodyFat}
                  onChange={e => setTempProfile({...tempProfile, goalBodyFat: Number(e.target.value)})}
                />
              </div>
            </div>

            <button 
              onClick={handleSaveProfile}
              className="w-full rounded-2xl bg-white py-3 text-sm font-bold text-black transition-transform active:scale-95 dark:bg-white dark:text-black light:bg-black light:text-white"
            >
              {t("save")}
            </button>
          </GlassCard>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 px-4">
        <GlassCard className="flex flex-col items-center justify-center text-center gap-1 p-3" delay={0.1}>
          <Target size={16} className="text-blue-400" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("goal")}</span>
          <span className="text-xs font-bold">{appData.profile.goalWeight}kg</span>
        </GlassCard>
        <GlassCard 
          className="flex flex-col items-center justify-center text-center gap-1 p-3 cursor-pointer active:scale-95 transition-transform hover:bg-white/5" 
          delay={0.15}
          onClick={() => setShowBFHistory(true)}
        >
          <Activity size={16} className="text-pink-400" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("bodyFat")}</span>
          <span className="text-xs font-bold">{appData.profile.bodyFat || '--'}%</span>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center text-center gap-1 p-3" delay={0.2}>
          <Flame size={16} className="text-orange-400" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("dailyDeficit")}</span>
          <span className="text-xs font-bold">{Math.round(dailyDeficit)}</span>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center text-center gap-1 p-3" delay={0.3}>
          <Award size={16} className="text-yellow-400" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 dark:text-white/40 light:text-black/40">{t("streak")}</span>
          <span className="text-xs font-bold">{streak}d</span>
        </GlassCard>
      </div>

      {/* Calendar View */}
      <div className="px-4">
        <GlassCard className="space-y-4" delay={0.4}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("history")}</h2>
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
                <ChevronLeft size={20} className="text-white/40 hover:text-white dark:text-white/40 dark:hover:text-white light:text-black/40 light:hover:text-black" />
              </button>
              <span className="text-sm font-bold">
                {currentMonth.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
                <ChevronRight size={20} className="text-white/40 hover:text-white dark:text-white/40 dark:hover:text-white light:text-black/40 light:hover:text-black" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-white/20 dark:text-white/20 light:text-black/20">{d}</div>
            ))}
            {renderCalendar()}
          </div>
        </GlassCard>
      </div>

      {/* Settings */}
      <div className="space-y-3 px-4">
        <h2 className="text-lg font-bold">{t("settings")}</h2>
        <div className="space-y-2">
          {/* Language Toggle */}
          <GlassCard 
            className="flex items-center justify-between p-4 cursor-pointer" 
            delay={0.5}
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 dark:bg-white/5 light:bg-black/5 text-blue-400">
                <Globe size={20} />
              </div>
              <span className="font-medium">{t("language")}</span>
            </div>
            <span className="text-sm font-bold text-white/40 dark:text-white/40 light:text-black/40">{language === 'en' ? 'English' : '中文'}</span>
          </GlassCard>

          {/* Theme Toggle */}
          <GlassCard 
            className="flex items-center justify-between p-4 cursor-pointer" 
            delay={0.6}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 dark:bg-white/5 light:bg-black/5 text-yellow-400">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <span className="font-medium">{t("theme")}</span>
            </div>
            <span className="text-sm font-bold text-white/40 dark:text-white/40 light:text-black/40">{t(theme as any)}</span>
          </GlassCard>

          {/* Sync Settings */}
          <GlassCard 
            className="flex items-center justify-between p-4 cursor-pointer" 
            delay={0.7}
            onClick={() => setShowSync(true)}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 dark:bg-white/5 light:bg-black/5 text-purple-400">
                <RefreshCw size={20} />
              </div>
              <span className="font-medium">{t("sync")}</span>
            </div>
            <ChevronRight size={20} className="text-white/40 dark:text-white/40 light:text-black/40" />
          </GlassCard>

          {/* Import/Export (Legacy) */}
          <div className="grid grid-cols-2 gap-2 opacity-50">
            <GlassCard 
              className="flex flex-col items-center gap-2 p-4 cursor-pointer" 
              delay={0.8}
              onClick={handleExport}
            >
              <Download size={20} className="text-green-400" />
              <span className="text-xs font-bold">{t("exportData")}</span>
            </GlassCard>
            
            <label className="cursor-pointer">
              <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              <GlassCard className="flex flex-col items-center gap-2 p-4" delay={0.9}>
                <Upload size={20} className="text-purple-400" />
                <span className="text-xs font-bold">{t("importData")}</span>
              </GlassCard>
            </label>
          </div>
        </div>
      </div>

      {/* Body Fat History Modal */}
      {showBFHistory && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm max-h-[80vh] flex flex-col border-white/20 bg-black/80 p-0 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">{t("bodyFatHistory")}</h2>
              <button onClick={() => setShowBFHistory(false)} className="text-white/40 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {/* Add Past Record Section */}
              <div className="space-y-3 rounded-2xl bg-white/5 p-4 border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400">{t("addPastRecord")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40">{t("selectDate")}</label>
                    <input 
                      type="date" 
                      className="w-full rounded-xl bg-white/5 px-3 py-2 text-xs outline-none"
                      value={historyDate}
                      onChange={e => setHistoryDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40">{t("bodyFat")} (%)</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      className="w-full rounded-xl bg-white/5 px-3 py-2 text-xs outline-none"
                      value={historyBF}
                      onChange={e => setHistoryBF(e.target.value)}
                      placeholder="e.g. 15.5"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveHistoryBF}
                  disabled={!historyBF}
                  className="w-full rounded-xl bg-blue-500 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {t("add")}
                </button>
              </div>

              {/* History List */}
              <div className="space-y-3">
                {bfHistory.length === 0 ? (
                  <p className="text-center text-sm text-white/20 py-10">{t("noRecords")}</p>
                ) : (
                  bfHistory.map(([date, data]) => (
                    <div key={date} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                      <div>
                        <p className="text-xs font-bold">{date}</p>
                        <p className="text-[10px] text-white/40">{new Date(date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short' })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-pink-400">{data.bodyFat}%</span>
                        <button 
                          onClick={() => {
                            const newDays = { ...appData.days };
                            delete newDays[date].bodyFat;
                            setAppData({ ...appData, days: newDays });
                          }}
                          className="text-white/10 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Sync Modal */}
      {showSync && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/80 dark:border-white/20 dark:bg-black/80 light:border-black/10 light:bg-white/90">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("sync")}</h2>
              <button onClick={() => setShowSync(false)} className="text-white/40 hover:text-white dark:text-white/40 light:text-black/40">
                <X size={20} />
              </button>
            </div>
            <SyncSettings />
          </GlassCard>
        </div>
      )}
    </div>
  );
}
