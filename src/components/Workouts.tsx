import React, { useState, useMemo } from "react";
import { Search, Play, Plus, Clock, X, Check, Award, Settings, ChevronRight, LayoutDashboard, History as HistoryIcon, Dumbbell, Flame } from "lucide-react";
import GlassCard from "./GlassCard";
import { useApp } from "@/src/context/AppContext";
import { Exercise, WorkoutSession, WorkoutSessionExercise, DayData } from "@/src/types";
import { motion, AnimatePresence } from "framer-motion";
import { getTodayStr } from "../lib/utils";

const EXERCISES: Exercise[] = [
  { id: '1', name: { en: 'Bench Press', zh: '卧推' }, part: 'chest', equipment: 'Barbell', image: '' },
  { id: '2', name: { en: 'Squat', zh: '深蹲' }, part: 'legs', equipment: 'Barbell', image: '' },
  { id: '3', name: { en: 'Deadlift', zh: '硬拉' }, part: 'back', equipment: 'Barbell', image: '' },
  { id: '4', name: { en: 'Shoulder Press', zh: '推肩' }, part: 'shoulders', equipment: 'Dumbbell', image: '' },
  { id: '5', name: { en: 'Pull Up', zh: '引体向上' }, part: 'back', equipment: 'Bodyweight', image: '' },
  { id: '6', name: { en: 'Bicep Curl', zh: '二头弯举' }, part: 'arms', equipment: 'Dumbbell', image: '' },
];

export default function Workouts() {
  const { t, language, appData, setAppData } = useApp();
  const [activeTab, setActiveTab] = useState<'records' | 'library'>('records');
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const activeSession = appData.activeWorkoutSession;
  const setActiveSession = (session: WorkoutSession | null) => {
    setAppData({ ...appData, activeWorkoutSession: session });
  };
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  // Context-aware filtering: when opening exercise picker, default to current session's category
  React.useEffect(() => {
    if (showExercisePicker && activeSession?.category) {
      setFilter(activeSession.category);
    } else if (showExercisePicker && !activeSession?.category) {
      setFilter("all");
    }
  }, [showExercisePicker, activeSession?.category]);

  const [isAddingFromPicker, setIsAddingFromPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingSession, setEditingSession] = useState<{date: string, session: WorkoutSession} | null>(null);
  const [deletingSession, setDeletingSession] = useState<{date: string, sessionId: string} | null>(null);
  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  // Real-time timer for active session
  React.useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const start = new Date(activeSession.startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setElapsedTime(
        `${hours > 0 ? hours.toString().padStart(2, '0') + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({
    name: { en: "", zh: "" },
    part: 'chest',
    equipment: '',
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef03a7403f?w=400&auto=format&fit=crop&q=60'
  });

  // Body scroll lock
  React.useEffect(() => {
    const isModalOpen = !!editingSession || !!deletingSession || showCategoryPicker || showExercisePicker || showCustomExerciseModal || showAddCategoryModal;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [editingSession, deletingSession, showCategoryPicker, showExercisePicker, showCustomExerciseModal, showAddCategoryModal]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat = newCategoryName.trim().toLowerCase();
    setAppData({
      ...appData,
      customCategories: [...(appData.customCategories || []), newCat]
    });
    setNewCategoryName("");
    setShowAddCategoryModal(false);
  };

  const deleteCategory = (cat: string) => {
    setAppData({
      ...appData,
      customCategories: (appData.customCategories || []).filter(c => c !== cat)
    });
  };

  const defaultCategories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];
  const allCategories = Array.from(new Set([...defaultCategories, ...(appData.customCategories || [])]));

  const allExercises = [...EXERCISES, ...(appData.customExercises || [])];

  const filteredExercises = allExercises.filter(ex => {
    const matchesSearch = ex.name[language].toLowerCase().includes(search.toLowerCase()) || ex.name.en.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || ex.part === filter;
    return matchesSearch && matchesFilter;
  });

  // Get all workout history across all days
  const workoutHistory = useMemo(() => {
    const history: { date: string; session: WorkoutSession }[] = [];
    Object.entries(appData.days).forEach(([date, day]) => {
      const dayData = day as DayData;
      if (dayData.workoutSessions) {
        dayData.workoutSessions.forEach(session => {
          if (!session.deleted) {
            history.push({ date, session });
          }
        });
      }
    });
    
    // Sort by date (descending) then by startTime (descending)
    return history.sort((a, b) => {
      // First compare by date key (YYYY-MM-DD)
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      // If same day, compare by startTime
      const timeA = a.session.startTime ? new Date(a.session.startTime).getTime() : 0;
      const timeB = b.session.startTime ? new Date(b.session.startTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [appData.days]);

  const startSession = (category?: string) => {
    const newSession: WorkoutSession = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      exercises: [],
      calories: 0,
      category: category
    };
    setActiveSession(newSession);
    setShowCategoryPicker(false);
  };

  const addExerciseToSession = (ex: Exercise) => {
    if (!activeSession) return;
    const sessionEx: WorkoutSessionExercise = {
      exerciseId: ex.id,
      name: ex.name[language],
      sets: [{ reps: 0, weight: 0, isPR: false }]
    };
    setActiveSession({
      ...activeSession,
      exercises: [...activeSession.exercises, sessionEx]
    });
    setShowExercisePicker(false);
  };

  const handleAddCustomExercise = () => {
    if (!newExercise.name?.zh) return;
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: { en: newExercise.name.en || newExercise.name.zh, zh: newExercise.name.zh },
      part: newExercise.part || 'chest',
      equipment: '',
      image: newExercise.image || 'https://images.unsplash.com/photo-1581009146145-b5ef03a7403f?w=400&auto=format&fit=crop&q=60'
    };

    const newCustomExercises = [...(appData.customExercises || []), exercise];
    
    if (isAddingFromPicker && activeSession) {
      const sessionEx: WorkoutSessionExercise = {
        exerciseId: exercise.id,
        name: exercise.name[language],
        sets: [{ reps: 0, weight: 0, isPR: false }]
      };
      
      const updatedSession = {
        ...activeSession,
        exercises: [...activeSession.exercises, sessionEx]
      };

      setAppData({
        ...appData,
        customExercises: newCustomExercises,
        activeWorkoutSession: updatedSession
      });
      setShowExercisePicker(false);
    } else {
      setAppData({
        ...appData,
        customExercises: newCustomExercises
      });
    }
    
    setShowCustomExerciseModal(false);
    setIsAddingFromPicker(false);
    setNewExercise({ name: { en: "", zh: "" }, part: 'chest', equipment: '', image: '' });
  };

  const updateSet = (exIndex: number, setIndex: number, field: 'reps' | 'weight' | 'isPR', value: any) => {
    if (!activeSession) return;
    const newExercises = [...activeSession.exercises];
    newExercises[exIndex].sets[setIndex] = {
      ...newExercises[exIndex].sets[setIndex],
      [field]: value
    };
    setActiveSession({ ...activeSession, exercises: newExercises });
  };

  const addSet = (exIndex: number) => {
    if (!activeSession) return;
    const newExercises = [...activeSession.exercises];
    const lastSet = newExercises[exIndex].sets[newExercises[exIndex].sets.length - 1];
    newExercises[exIndex].sets.push({ ...lastSet, isPR: false });
    setActiveSession({ ...activeSession, exercises: newExercises });
  };

  const deleteWorkout = (date: string, sessionId: string) => {
    setDeletingSession({ date, sessionId });
  };

  const confirmDeleteWorkout = () => {
    if (!deletingSession) return;
    const { date, sessionId } = deletingSession;
    const day = appData.days[date];
    if (!day) return;
    
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [date]: {
          ...day,
          workoutSessions: day.workoutSessions.map(s => 
            s.id === sessionId ? { ...s, deleted: true, updatedAt: Date.now() } : s
          )
        }
      }
    });
    setDeletingSession(null);
  };

  const startEditing = (date: string, session: WorkoutSession) => {
    setEditingSession({ date, session: JSON.parse(JSON.stringify(session)) });
  };

  const saveEditedSession = () => {
    if (!editingSession) return;
    const { date, session } = editingSession;
    const day = appData.days[date];
    if (!day) return;

    const updatedSession = {
      ...session,
      updatedAt: Date.now()
    };

    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [date]: {
          ...day,
          workoutSessions: day.workoutSessions.map(s => s.id === session.id ? updatedSession : s)
        }
      }
    });
    setEditingSession(null);
  };

  const updateEditedSet = (exIdx: number, setIdx: number, field: string, value: any) => {
    if (!editingSession) return;
    const newSession = { ...editingSession.session };
    (newSession.exercises[exIdx].sets[setIdx] as any)[field] = value;
    setEditingSession({ ...editingSession, session: newSession });
  };

  const addSetToEdited = (exIdx: number) => {
    if (!editingSession) return;
    const newSession = { ...editingSession.session };
    newSession.exercises[exIdx].sets.push({ weight: 0, reps: 0, isPR: false });
    setEditingSession({ ...editingSession, session: newSession });
  };

  const removeExerciseFromEdited = (exIdx: number) => {
    if (!editingSession) return;
    const newSession = { ...editingSession.session };
    newSession.exercises.splice(exIdx, 1);
    setEditingSession({ ...editingSession, session: newSession });
  };

  const handleDeleteCustomExercise = (id: string) => {
    setAppData({
      ...appData,
      customExercises: (appData.customExercises || []).filter(ex => ex.id !== id)
    });
  };

  const finishSession = () => {
    if (!activeSession) return;
    const today = getTodayStr();
    const dayData = appData.days[today] || { date: today, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
    
    const finishedSession = {
      ...activeSession,
      endTime: new Date().toISOString(),
      updatedAt: Date.now(),
      deleted: false
    };

    setAppData({
      ...appData,
      activeWorkoutSession: null,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          workoutSessions: [...(dayData.workoutSessions || []), finishedSession]
        }
      }
    });
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(diff / 60000);
  };

  return (
    <div className="min-h-screen space-y-6 pb-32 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("workouts")}</h1>
        {!activeSession && (
          <button 
            onClick={() => setShowCategoryPicker(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      {!activeSession && (
        <div className="px-4">
          <div className="flex rounded-2xl bg-white/5 p-1">
            <button 
              onClick={() => setActiveTab('records')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${activeTab === 'records' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
            >
              <HistoryIcon size={16} />
              {t("trainingRecords")}
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
            >
              <Dumbbell size={16} />
              {t("actionLibrary")}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeSession ? (
            <motion.div 
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full"
            >
              <GlassCard className="flex flex-col max-h-[calc(100vh-14rem)] border-blue-500/30 bg-blue-500/5 p-0 overflow-hidden">
                {/* Sticky Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-20">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-blue-400">
                          <Clock size={18} />
                          <span className="text-sm font-bold">
                            {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                          <span className="font-mono text-sm font-bold tracking-wider">{elapsedTime}</span>
                        </div>
                      </div>
                      {activeSession.category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                          {t(activeSession.category as any)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Flame size={16} className="text-orange-400" />
                      <input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0"
                        className="w-16 rounded-lg bg-white/5 px-2 py-1 text-right text-sm font-bold outline-none ring-1 ring-white/10"
                        value={activeSession.calories || ""}
                        onChange={e => setActiveSession({...activeSession, calories: Number(e.target.value)})}
                      />
                      <span className="text-xs text-white/40">kcal</span>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                  <div className="space-y-4">
                    {activeSession.exercises.map((sessionEx, exIdx) => {
                      const exercise = allExercises.find(e => e.id === sessionEx.exerciseId);
                      return (
                        <div key={exIdx} className="space-y-3 rounded-2xl bg-white/5 p-4 border border-white/5">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold">{exercise?.name[language]}</h3>
                            <button 
                              onClick={() => {
                                const newExs = activeSession.exercises.filter((_, i) => i !== exIdx);
                                setActiveSession({...activeSession, exercises: newExs});
                              }}
                              className="text-white/20 hover:text-red-400 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
                              <span className="text-center">Set</span>
                              <span className="text-center">{exercise?.part === 'cardio' ? t("min") : "kg"}</span>
                              <span className="text-center">{exercise?.part === 'cardio' ? t("km") || "km" : "Reps"}</span>
                              <span className="text-center">{exercise?.part === 'cardio' ? t("intensity") || "Int" : "PR"}</span>
                            </div>
                            {sessionEx.sets.map((set, setIdx) => (
                              <div key={setIdx} className="grid grid-cols-4 items-center gap-2">
                                <span className="text-center text-xs font-bold text-white/20">{setIdx + 1}</span>
                                <input 
                                  type="number" 
                                  inputMode="decimal"
                                  className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                  value={set.weight || ""}
                                  onChange={e => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                                />
                                <input 
                                  type="number" 
                                  inputMode="numeric"
                                  className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                  value={set.reps || ""}
                                  onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                                />
                                {exercise?.part === 'cardio' ? (
                                  <input 
                                    type="number" 
                                    inputMode="numeric"
                                    className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                    value={set.isPR ? 1 : 0}
                                    onChange={e => updateSet(exIdx, setIdx, 'isPR', Number(e.target.value) > 0)}
                                  />
                                ) : (
                                  <button 
                                    onClick={() => updateSet(exIdx, setIdx, 'isPR', !set.isPR)}
                                    className={`flex h-8 w-8 mx-auto items-center justify-center rounded-lg transition-colors ${set.isPR ? "bg-yellow-500 text-black" : "bg-white/5 text-white/20"}`}
                                  >
                                    <Award size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button 
                              onClick={() => addSet(exIdx)}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-3 text-xs font-bold text-white/40 hover:bg-white/5 transition-colors"
                            >
                              <Plus size={14} />
                              {t("sets")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowExercisePicker(true)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-4 font-bold transition-colors hover:bg-white/20"
                    >
                      <Plus size={20} />
                      {t("addExercise")}
                    </button>
                    <button 
                      onClick={finishSession}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 font-bold text-white shadow-lg shadow-green-500/20 transition-transform active:scale-95"
                    >
                      <Check size={20} />
                      {t("endWorkout")}
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ) : activeTab === 'records' ? (
            <motion.div 
              key="records"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {workoutHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                  <HistoryIcon size={48} strokeWidth={1} className="mb-4" />
                  <p className="text-sm font-medium">{t("noRecords")}</p>
                  <button 
                    onClick={() => setShowCategoryPicker(true)}
                    className="mt-6 rounded-full bg-blue-500/10 px-6 py-2 text-sm font-bold text-blue-400"
                  >
                    {t("startNewWorkout")}
                  </button>
                </div>
              ) : (
                workoutHistory.map(({ date, session }, idx) => (
                  <GlassCard key={session.id} className="p-4 relative group" delay={idx * 0.05}>
                    <div 
                      className="flex items-center justify-between mb-4 cursor-pointer"
                      onClick={() => startEditing(date, session)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                          <Dumbbell size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold">{session.category ? t(session.category as any) : t("workouts")}</h3>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold text-orange-400">{session.calories} kcal</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {calculateDuration(session.startTime, session.endTime)} {t("min")}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkout(date, session.id);
                          }}
                          className="p-2 text-white/10 hover:text-red-400 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      {session.exercises.slice(0, 3).map((ex, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-white/60">
                          <span>{typeof ex.name === 'string' ? ex.name : (ex.name[language] || ex.name['en'])}</span>
                          <span className="text-white/40">{ex.sets.length} {t("sets")}</span>
                        </div>
                      ))}
                      {session.exercises.length > 3 && (
                        <p className="text-[10px] text-white/20">+{session.exercises.length - 3} more exercises</p>
                      )}
                    </div>
                  </GlassCard>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="text"
                  placeholder={t("actionLibrary")}
                  className="w-full rounded-2xl bg-white/5 py-4 pl-12 pr-4 outline-none ring-1 ring-white/10 focus:ring-blue-500/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['all', ...allCategories].map((part) => (
                  <button
                    key={part}
                    onClick={() => setFilter(part)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      filter === part ? "bg-white text-black" : "bg-white/5 text-white/40"
                    }`}
                  >
                    {t(part as any) || part.charAt(0).toUpperCase() + part.slice(1)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredExercises.map((ex, index) => {
                  const isCustom = (appData.customExercises || []).some(ce => ce.id === ex.id);
                  return (
                    <GlassCard key={ex.id} className="p-4" delay={index * 0.03}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base">{ex.name[language]}</h3>
                            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                              {t(ex.part as any)}
                            </span>
                          </div>
                          <p className="text-xs text-white/40 font-medium">
                            {ex.equipment ? `${ex.equipment} • ` : ""}{t(ex.part as any)}
                          </p>
                        </div>
                        {isCustom && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomExercise(ex.id);
                            }}
                            className="p-2 text-white/10 hover:text-red-400 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setShowCustomExerciseModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-4 text-sm font-bold text-white/40 hover:bg-white/5"
              >
                <Plus size={18} />
                {t("customExercise")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Session Modal */}
        {editingSession && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 pb-24 backdrop-blur-md">
            <GlassCard className="w-full max-w-lg max-h-[80vh] flex flex-col p-0 border-white/20 bg-black/90 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              {/* Sticky Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-20">
                <div>
                  <h2 className="text-xl font-bold">{t("editWorkout")}</h2>
                  <p className="text-xs text-white/40">{editingSession.date}</p>
                </div>
                <button onClick={() => setEditingSession(null)} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                <div className="space-y-6">
                  {editingSession.session.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="space-y-4 rounded-2xl bg-white/5 p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-blue-400">{typeof ex.name === 'string' ? ex.name : (ex.name[language] || ex.name['en'])}</h3>
                        <button 
                          onClick={() => removeExerciseFromEdited(exIdx)}
                          className="text-red-400/40 hover:text-red-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
                          <span className="text-center">Set</span>
                          <span className="text-center">{allExercises.find(e => e.id === ex.exerciseId)?.part === 'cardio' ? t("min") : "kg"}</span>
                          <span className="text-center">{allExercises.find(e => e.id === ex.exerciseId)?.part === 'cardio' ? t("km") || "km" : "Reps"}</span>
                          <span className="text-center">{allExercises.find(e => e.id === ex.exerciseId)?.part === 'cardio' ? t("intensity") || "Int" : "PR"}</span>
                        </div>
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} className="grid grid-cols-4 items-center gap-2">
                            <span className="text-center text-xs font-bold text-white/20">{setIdx + 1}</span>
                            <input 
                              type="number" 
                              inputMode="decimal"
                              className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                              value={set.weight || ""}
                              onChange={e => updateEditedSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                            />
                            <input 
                              type="number" 
                              inputMode="numeric"
                              className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                              value={set.reps || ""}
                              onChange={e => updateEditedSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                            />
                            {allExercises.find(e => e.id === ex.exerciseId)?.part === 'cardio' ? (
                              <input 
                                type="number" 
                                inputMode="numeric"
                                className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                value={set.isPR ? 1 : 0}
                                onChange={e => updateEditedSet(exIdx, setIdx, 'isPR', Number(e.target.value) > 0)}
                              />
                            ) : (
                              <button 
                                onClick={() => updateEditedSet(exIdx, setIdx, 'isPR', !set.isPR)}
                                className={`flex h-8 w-8 mx-auto items-center justify-center rounded-lg transition-colors ${set.isPR ? "bg-yellow-500 text-black" : "bg-white/5 text-white/20"}`}
                              >
                                <Award size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button 
                          onClick={() => addSetToEdited(exIdx)}
                          className="w-full py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-white/40 hover:bg-white/5 transition-colors"
                        >
                          + {t("sets")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Action */}
              <div className="p-6 border-t border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <button 
                  onClick={saveEditedSession}
                  className="w-full rounded-2xl bg-blue-500 py-4 font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                >
                  {t("save")}
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingSession && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-6">
              <div className="text-center space-y-2">
                <Award className="w-12 h-12 text-red-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">{t("delete")}?</h3>
                <p className="text-sm text-gray-400">{t("confirmDelete")}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingSession(null)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-white transition-all"
                >
                  {t("cancel")}
                </button>
                <button 
                  onClick={confirmDeleteWorkout}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold text-white transition-all shadow-lg shadow-red-500/20"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm space-y-6 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("workoutCategory")}</h2>
              <button onClick={() => setShowCategoryPicker(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              {allCategories.map(cat => (
                <div key={cat} className="relative group">
                  <button
                    onClick={() => startSession(cat)}
                    className="w-full rounded-2xl bg-white/5 p-4 text-center font-bold transition-all hover:bg-white/10 active:scale-95 border border-white/5"
                  >
                    {t(cat as any) || cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                  {appData.customCategories?.includes(cat) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(cat);
                      }}
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 p-4 text-white/40 hover:bg-white/5 transition-all"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={() => startSession()}
                className="col-span-2 rounded-2xl bg-blue-500/10 p-4 text-center font-bold text-blue-400 transition-all hover:bg-blue-500/20 active:scale-95 border border-blue-500/20"
              >
                {t("all")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm space-y-4 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("customCategory") || "Custom Category"}</h2>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                autoFocus
                placeholder={t("categoryName") || "Category Name"}
                className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-blue-500"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <button 
                onClick={handleAddCategory}
                className="w-full rounded-2xl bg-blue-500 py-4 font-bold text-white shadow-lg shadow-blue-500/20"
              >
                {t("save")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Exercise Picker Modal (During Session) */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-3xl">
          {/* Header with safe area and Apple styling */}
          <div className="flex items-center justify-between px-6 pb-4 pt-[calc(2.5rem+env(safe-area-inset-top,0px))]">
            <h2 className="text-3xl font-bold tracking-tight">{t("addExercise")}</h2>
            <button 
              onClick={() => setShowExercisePicker(false)} 
              className="apple-button h-10 w-10 bg-white/10 text-white/80"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="px-6 flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="text"
                placeholder={t("actionLibrary")}
                className="w-full rounded-2xl bg-white/[0.05] py-4 pl-12 pr-4 outline-none ring-1 ring-white/10 focus:ring-blue-500/50 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setIsAddingFromPicker(true);
                setShowCustomExerciseModal(true);
              }}
              className="apple-button h-14 w-14 bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* Category Filter Row in Picker */}
          <div className="px-6 mb-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${filter === "all" ? "bg-white text-black" : "bg-white/5 text-white/40"}`}
              >
                {t("all")}
              </button>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${filter === cat ? "bg-blue-500 text-white" : "bg-white/5 text-white/40"}`}
                >
                  {t(cat as any) || cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar px-6 pb-24">
            {filteredExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <Search size={48} strokeWidth={1} className="mb-4" />
                <p className="text-sm font-medium">{t("noRecords")}</p>
                <button 
                  onClick={() => {
                    setIsAddingFromPicker(true);
                    setShowCustomExerciseModal(true);
                  }}
                  className="mt-6 rounded-full bg-blue-500/10 px-6 py-2 text-sm font-bold text-blue-400"
                >
                  {t("customExercise")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredExercises.map((ex) => (
                  <motion.div
                    key={ex.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addExerciseToSession(ex)}
                  >
                    <GlassCard 
                      variant="medium"
                      className="flex items-center gap-4 p-4 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors rounded-[2rem]"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-blue-400">
                        <Dumbbell size={24} />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-bold truncate text-lg">{ex.name[language]}</h3>
                        <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80 truncate">
                            {t(ex.part as any)}
                          </span>
                          {ex.equipment && (
                            <>
                              <span className="h-1 w-1 shrink-0 rounded-full bg-white/10" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 truncate">
                                {ex.equipment}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/40">
                        <Plus size={20} />
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Exercise Modal */}
      {showCustomExerciseModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm space-y-4 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("customExercise")}</h2>
              <button onClick={() => setShowCustomExerciseModal(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                          <Dumbbell size={12} className="text-blue-400" />
                          {t("exerciseName")}
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Bench Press"
                          className="w-full rounded-2xl bg-white/5 px-4 py-4 outline-none border border-white/10 focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                          value={newExercise.name?.zh}
                          onChange={e => setNewExercise({...newExercise, name: { en: e.target.value, zh: e.target.value }})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                          <LayoutDashboard size={12} className="text-purple-400" />
                          {t("filterByPart")}
                        </label>
                        <div className="relative">
                          <select 
                            className="w-full rounded-2xl bg-white/5 px-4 py-4 outline-none appearance-none border border-white/10 focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                            value={newExercise.part}
                            onChange={e => setNewExercise({...newExercise, part: e.target.value as any})}
                          >
                            {allCategories.map(p => (
                              <option key={p} value={p} className="bg-gray-900">{t(p as any) || p.charAt(0).toUpperCase() + p.slice(1)}</option>
                            ))}
                          </select>
                          <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-white/20" />
                        </div>
                      </div>
                    </div>

            <button 
              onClick={handleAddCustomExercise}
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
