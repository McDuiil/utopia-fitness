import React, { useState, useMemo, useCallback } from "react";
import { Settings, X, Check, AlertCircle, GripVertical, CheckCircle2, Play, Plus, Utensils } from "lucide-react";
import GlassCard from "./GlassCard";
import { useApp } from "@/src/context/AppContext";
import { getTodayStr } from "../lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from "motion/react";

// Atomic Widgets
import WaterWidget from "./dashboard/widgets/WaterWidget";
import WeightWidget from "./dashboard/widgets/WeightWidget";
import WeightChartWidget from "./dashboard/widgets/WeightChartWidget";
import CaloriesWidget from "./dashboard/widgets/CaloriesWidget";
import DeficitWidget from "./dashboard/widgets/DeficitWidget";
import StreakWidget from "./dashboard/widgets/StreakWidget";
import BodyFatWidget from "./dashboard/widgets/BodyFatWidget";
import QuickActionWidget from "./dashboard/widgets/QuickActionWidget";
import StepsWidget from "./dashboard/widgets/StepsWidget";

function SortableWidget({ id, children, isEditing }: { id: string; children: React.ReactNode; isEditing: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isEditing ? 'touch-none' : ''}`}>
      {children}
      {isEditing && (
        <div 
          {...attributes} 
          {...listeners}
          className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm active:scale-95 active:bg-blue-500 active:text-white transition-all cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t, appData, language, calculateBMR, setAppData, selectedDate, setSelectedDate, setActiveTab, resolvedNutritionToday } = useApp();
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 【第一层保护：全局数据总闸】
  // 报错根本原因是 appData 为空时，下方的 useMemo 强行执行。
  // 必须在执行任何业务逻辑前拦截！
  if (!appData || !appData.days || !appData.profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-white/40 text-xs font-bold tracking-widest uppercase italic">Utopia Loading...</p>
      </div>
    );
  }
  
  const today = getTodayStr();
  const isHistory = selectedDate !== today;
  
  // 【第二层保护：安全取值】使用可选链
  const dayData = useMemo(() => {
    return appData.days?.[selectedDate] || { date: selectedDate, steps: 0, water: 0, meals: [], workoutSessions: [] };
  }, [appData.days, selectedDate]);
  
  const bmr = useMemo(() => {
    return calculateBMR ? calculateBMR(appData.profile) : 1600;
  }, [calculateBMR, appData.profile]);

  const workoutCalories = useMemo(() => {
    return (dayData.workoutSessions || []).reduce((sum, s) => sum + (s.calories || 0), 0);
  }, [dayData.workoutSessions]);
  
  const dailyDeficit = useMemo(() => {
    const consumed = resolvedNutritionToday?.calories?.consumed || 0;
    return (bmr + workoutCalories) - consumed;
  }, [bmr, workoutCalories, resolvedNutritionToday]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = appData.profile?.name || "McDull";
    if (hour < 5) return { title: `Hi, ${name}`, sub: "深夜还在坚持？记得早点休息。" };
    if (hour < 12) return { title: `早上好, ${name}`, sub: "今天也是刷脂的好天气！" };
    if (hour < 18) return { title: `下午好, ${name}`, sub: "保持状态，离目标又近了一步。" };
    return { title: `晚上好, ${name}`, sub: "回顾今天，好好恢复。" };
  };

  const greeting = getGreeting();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const enabled = appData.enabledWidgets || [];
      const oldIndex = enabled.indexOf(active.id as string);
      const newIndex = enabled.indexOf(over.id as string);
      const newOrder = arrayMove(enabled, oldIndex, newIndex);
      setAppData({ ...appData, enabledWidgets: newOrder });
    }
  }, [appData, setAppData]);

  const handleUpdateWeight = useCallback((weight?: number, bodyFat?: number) => {
    setAppData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [selectedDate]: {
          ...(prev.days[selectedDate] || { date: selectedDate, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] }),
          weight,
          bodyFat
        }
      }
    }));
  }, [selectedDate, setAppData]);

  const handleAddWater = useCallback((amount: number) => {
    setAppData(prev => {
      const day = prev.days[selectedDate] || { date: selectedDate, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
      return {
        ...prev,
        days: { ...prev.days, [selectedDate]: { ...day, water: (day.water || 0) + amount } }
      };
    });
  }, [selectedDate, setAppData]);

  const handleSetWater = useCallback((total: number) => {
    setAppData(prev => {
      const day = prev.days[selectedDate] || { date: selectedDate, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
      return {
        ...prev,
        days: { ...prev.days, [selectedDate]: { ...day, water: total } }
      };
    });
  }, [selectedDate, setAppData]);

  const toggleWidget = useCallback((id: string) => {
    const enabled = appData.enabledWidgets || [];
    const newEnabled = enabled.includes(id) ? enabled.filter(w => w !== id) : [...enabled, id];
    setAppData({ ...appData, enabledWidgets: newEnabled });
  }, [appData, setAppData]);

  const isEnabled = (id: string) => (appData.enabledWidgets || []).includes(id);
  const enabledWidgets = appData.enabledWidgets || ['quickWorkout', 'quickMeal', 'weight', 'bodyFat', 'calories', 'deficit', 'activity', 'water', 'streak'];

  const getTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour < 11) return t("breakfast");
    if (hour < 15) return t("lunch");
    if (hour < 19) return t("dinner");
    return t("snack");
  };

  const renderWidget = (id: string) => {
    // 【第三层保护：组件内部数据隔离】
    switch (id) {
      case 'quickWorkout':
        return <QuickActionWidget type="workout" label={t("startWorkout")} subLabelText={t("quickStart")} onClick={() => setActiveTab('workouts')} />;
      case 'quickMeal':
        return <QuickActionWidget type="meal" label={t("quickLog")} subLabelText={getTimeSlot()} onClick={() => setActiveTab('nutrition')} />;
      case 'weight':
        return <WeightWidget selectedDate={selectedDate} dayData={dayData} appData={appData} isHistory={isHistory} t={t} onUpdateWeight={handleUpdateWeight} />;
      case 'calories':
        return <CaloriesWidget nutrition={resolvedNutritionToday} t={t} />;
      case 'deficit':
        return <DeficitWidget deficit={dailyDeficit} goal={appData.profile.goalDeficit} t={t} />;
      case 'streak':
        return <StreakWidget days={appData.days} name={appData.profile.name} t={t} />;
      case 'bodyFat':
        return <BodyFatWidget bodyFat={dayData.bodyFat} profileBodyFat={appData.profile.bodyFat} goalBodyFat={appData.profile.goalBodyFat} isHistory={isHistory} t={t} onClick={() => setActiveTab('profile')} />;
      case 'steps':
        return <StepsWidget steps={dayData.steps || 0} goal={appData.profile.goalSteps || 10000} t={t} />;
      case 'activity':
        return <WeightChartWidget appData={appData} t={t} language={language} />;
      case 'water':
        return <WaterWidget dayData={dayData} t={t} onUpdateWater={handleAddWater} onSetWater={handleSetWater} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-32 pt-[calc(2rem+env(safe-area-inset-top,0px))] bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">{greeting.title}</h1>
          <p className="text-sm text-white/40 mt-1 font-medium">{greeting.sub}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all active:scale-90 ${
              isEditing ? "border-blue-500 bg-blue-500 text-white" : "border-white/10 bg-white/5 text-white/60"
            }`}
          >
            {isEditing ? <CheckCircle2 size={24} /> : <Settings size={24} />}
          </button>
          <div className="h-12 w-12 rounded-full border border-white/20 bg-white/[0.06] p-1">
            <img
              src={appData.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=McDull`}
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

      {/* Draggable Widgets Area */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={enabledWidgets} strategy={rectSortingStrategy}>
          <div className="px-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {isEditing && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-center gap-2 py-2 text-blue-400"
                >
                  <GripVertical size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t("dragToReorder")}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4">
              {enabledWidgets.map((id) => {
                const isFullWidth = ['activity', 'water'].includes(id);
                return (
                  <div key={id} className={isFullWidth ? "col-span-2" : "col-span-1"}>
                    <SortableWidget id={id} isEditing={isEditing}>
                      {renderWidget(id)}
                    </SortableWidget>
                  </div>
                );
              })}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {/* Late Night Coach Suggestion */}
      {!isHistory && new Date().getHours() >= 22 && resolvedNutritionToday?.remaining && (
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
                  : (resolvedNutritionToday.remaining.carbs || 0) < -30
                    ? t("carbExcessSuggestion")
                    : t("goalAchievedSuggestion")
                }
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Widget Manager Modal */}
      {isEditing && (
        <div className="px-4 mt-8">
          <button 
            onClick={() => setShowWidgetManager(true)}
            className="w-full rounded-2xl border border-dashed border-white/20 py-6 text-white/40 hover:border-blue-500/50 hover:text-blue-400 transition-all flex flex-col items-center gap-2"
          >
            <Plus size={24} />
            <span className="text-xs font-bold uppercase tracking-widest">{t("manageWidgets")}</span>
          </button>
        </div>
      )}

      {showWidgetManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/80 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("manageWidgets")}</h2>
              <button onClick={() => setShowWidgetManager(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2">
              {[
                { id: 'weight', label: t("weight") },
                { id: 'bodyFat', label: t("bodyFat") },
                { id: 'calories', label: t("calories") },
                { id: 'deficit', label: t("deficitWidget") },
                { id: 'streak', label: t("streak") },
                { id: 'activity', label: t("weightTrend") },
                { id: 'water', label: t("waterWidget") },
                { id: 'steps', label: t("steps") },
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
            <button onClick={() => setShowWidgetManager(false)} className="w-full rounded-2xl bg-white py-4 font-bold text-black active:scale-95 transition-transform">{t("done") || "Done"}</button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
