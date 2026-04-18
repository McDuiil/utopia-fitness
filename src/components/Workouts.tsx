import React, { useState, useMemo } from "react";
import { Search, Play, Plus, Clock, X, Check, Award, Settings, ChevronRight, LayoutDashboard, History as HistoryIcon, Dumbbell, Flame } from "lucide-react";
import GlassCard from "./GlassCard";
import { useApp } from "../context/AppContext";
import { useAppSelector } from "../hooks/useAppSelector";
import { useScrollLock } from "../hooks/useScrollLock";
import { Exercise, WorkoutSession, WorkoutSessionExercise, DayData } from "../types";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { getTodayStr } from "../lib/utils";
import AddWorkoutButton from "./workouts/AddWorkoutButton";
import WorkoutSessionCard from "./workouts/WorkoutSessionCard";

const EXERCISES: Exercise[] = [
  { id: '1', name: { en: 'Bench Press', zh: '卧推' }, part: 'chest', equipment: 'Barbell', image: '' },
  { id: '2', name: { en: 'Squat', zh: '深蹲' }, part: 'legs', equipment: 'Barbell', image: '' },
  { id: '3', name: { en: 'Deadlift', zh: '硬拉' }, part: 'back', equipment: 'Barbell', image: '' },
  { id: '4', name: { en: 'Shoulder Press', zh: '推肩' }, part: 'shoulders', equipment: 'Dumbbell', image: '' },
  { id: '5', name: { en: 'Pull Up', zh: '引体向上' }, part: 'back', equipment: 'Bodyweight', image: '' },
  { id: '6', name: { en: 'Bicep Curl', zh: '二头弯举' }, part: 'arms', equipment: 'Dumbbell', image: '' },
];

export default function Workouts() {
  const { t, language, setAppData, showToast } = useApp();
  const activeSession = useAppSelector(s => s.appData.activeWorkoutSession);
  const customCategories = useAppSelector(s => s.appData.customCategories);
  const customExercises = useAppSelector(s => s.appData.customExercises);
  const days = useAppSelector(s => s.appData.days);

  const [activeTab, setActiveTab] = useState<'records' | 'library'>('records');
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  
  const setActiveSession = (session: WorkoutSession | null) => {
    setAppData(prev => ({ ...prev, activeWorkoutSession: session }));
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
  const [showCaloriePrompt, setShowCaloriePrompt] = useState(false);
  const [isEditingExistingSession, setIsEditingExistingSession] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningSession, setPlanningSession] = useState<WorkoutSession | null>(null);

  // Unified Scroll Lock
  const isAnyModalOpen = !!editingSession || !!deletingSession || showCategoryPicker || showExercisePicker || showCustomExerciseModal || showAddCategoryModal || !!activeSession || !!planningSession;
  useScrollLock(isAnyModalOpen);

  // Refs for auto-scrolling
  const activeSessionContentRef = React.useRef<HTMLDivElement>(null);
  const planningSessionContentRef = React.useRef<HTMLDivElement>(null);

  const handleStartNewWorkout = React.useCallback(() => {
    setIsPlanning(false);
    setShowCategoryPicker(true);
  }, []);

  const handleStartPlanning = React.useCallback(() => {
    setIsPlanning(true);
    setShowCategoryPicker(true);
  }, []);

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
    setAppData(prev => ({
      ...prev,
      customCategories: [...(prev.customCategories || []), newCat]
    }));
    setNewCategoryName("");
    setShowAddCategoryModal(false);
  };

  const deleteCategory = (cat: string) => {
    setAppData(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).filter(c => c !== cat)
    }));
  };

  const defaultCategories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];
  const allCategories = Array.from(new Set([...defaultCategories, ...(customCategories || [])]));

  const allExercises = [...EXERCISES, ...(customExercises || [])];

  const filteredExercises = allExercises.filter(ex => {
    const matchesSearch = ex.name[language].toLowerCase().includes(search.toLowerCase()) || ex.name.en.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || ex.part === filter;
    return matchesSearch && matchesFilter;
  });

  // Get all workout history across all days
  const workoutHistory = useMemo(() => {
    const history: { date: string; session: WorkoutSession }[] = [];
    Object.entries(days).forEach(([date, day]) => {
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
  }, [days]);

  const startSession = (category?: string) => {
    const newSession: WorkoutSession = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      exercises: [],
      calories: 0,
      category: category,
      status: isPlanning ? 'planned' : 'active'
    };
    if (isPlanning) {
      setPlanningSession(newSession);
    } else {
      setActiveSession(newSession);
    }
    setShowCategoryPicker(false);
  };

  const addExerciseToSession = (ex: Exercise) => {
    if (isEditingExistingSession && editingSession) {
      const sessionEx: WorkoutSessionExercise = {
        exerciseId: ex.id,
        name: ex.name[language],
        sets: [{ reps: 0, weight: 0, isPR: false }]
      };
      setEditingSession({
        ...editingSession,
        session: {
          ...editingSession.session,
          exercises: [...editingSession.session.exercises, sessionEx]
        }
      });
      setShowExercisePicker(false);
      return;
    }

    if (isPlanning && planningSession) {
      const sessionEx: WorkoutSessionExercise = {
        exerciseId: ex.id,
        name: ex.name[language],
        sets: [{ reps: 0, weight: 0, isPR: false }]
      };
      setPlanningSession({
        ...planningSession,
        exercises: [...planningSession.exercises, sessionEx]
      });
      setShowExercisePicker(false);
      return;
    }

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

      setAppData(prev => ({
        ...prev,
        customExercises: [...(prev.customExercises || []), exercise],
        activeWorkoutSession: updatedSession
      }));
      setShowExercisePicker(false);
    } else {
      setAppData(prev => ({
        ...prev,
        customExercises: [...(prev.customExercises || []), exercise]
      }));
    }
    
    setShowCustomExerciseModal(false);
    setIsAddingFromPicker(false);
    setNewExercise({ name: { en: "", zh: "" }, part: 'chest', equipment: '', image: '' });
  };

  const updateSet = (exIndex: number, setIndex: number, field: 'reps' | 'weight' | 'isPR', value: any) => {
    if (isPlanning && planningSession) {
      const newExercises = [...planningSession.exercises];
      newExercises[exIndex].sets[setIndex] = {
        ...newExercises[exIndex].sets[setIndex],
        [field]: value
      };
      setPlanningSession({ ...planningSession, exercises: newExercises });
      return;
    }

    if (!activeSession) return;
    const newExercises = [...activeSession.exercises];
    newExercises[exIndex].sets[setIndex] = {
      ...newExercises[exIndex].sets[setIndex],
      [field]: value
    };
    setActiveSession({ ...activeSession, exercises: newExercises });
  };

  const addSet = (exIndex: number) => {
    if (isPlanning && planningSession) {
      const newExercises = [...planningSession.exercises];
      const lastSet = newExercises[exIndex].sets[newExercises[exIndex].sets.length - 1];
      newExercises[exIndex].sets.push({ ...lastSet, isPR: false });
      setPlanningSession({ ...planningSession, exercises: newExercises });
      
      // Auto-scroll to new set
      setTimeout(() => {
        planningSessionContentRef.current?.scrollTo({
          top: planningSessionContentRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
      return;
    }

    if (!activeSession) return;
    const newExercises = [...activeSession.exercises];
    const lastSet = newExercises[exIndex].sets[newExercises[exIndex].sets.length - 1];
    newExercises[exIndex].sets.push({ ...lastSet, isPR: false });
    setActiveSession({ ...activeSession, exercises: newExercises });

    // Auto-scroll to new set
    setTimeout(() => {
      activeSessionContentRef.current?.scrollTo({
        top: activeSessionContentRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 50);
  };

  const deleteWorkout = (date: string, sessionId: string) => {
    setDeletingSession({ date, sessionId });
  };

  const confirmDeleteWorkout = () => {
    if (!deletingSession) return;
    const { date, sessionId } = deletingSession;
    
    setAppData(prev => {
      const day = prev.days[date];
      if (!day) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: {
            ...day,
            workoutSessions: day.workoutSessions.map(s => 
              s.id === sessionId ? { ...s, deleted: true, updatedAt: Date.now() } : s
            )
          }
        }
      };
    });
    setDeletingSession(null);
  };

  const startEditing = (date: string, session: WorkoutSession) => {
    setEditingSession({ date, session: JSON.parse(JSON.stringify(session)) });
  };

  const saveEditedSession = () => {
    if (!editingSession) return;
    const { date, session } = editingSession;

    const updatedSession = {
      ...session,
      updatedAt: Date.now()
    };

    setAppData(prev => {
      const day = prev.days[date];
      if (!day) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: {
            ...day,
            workoutSessions: day.workoutSessions.map(s => s.id === session.id ? updatedSession : s)
          }
        }
      };
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
    setAppData(prev => ({
      ...prev,
      customExercises: (prev.customExercises || []).filter(ex => ex.id !== id)
    }));
  };

  const savePlanningSession = () => {
    if (!planningSession) return;
    
    const today = getTodayStr();
    
    const finishedSession = {
      ...planningSession,
      updatedAt: Date.now(),
      deleted: false
    };

    setAppData(prev => {
      const dayData = prev.days[today] || { date: today, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
      return {
        ...prev,
        days: {
          ...prev.days,
          [today]: {
            ...dayData,
            workoutSessions: [...(dayData.workoutSessions || []), finishedSession]
          }
        }
      };
    });
    setPlanningSession(null);
    setIsPlanning(false);
    showToast(t("importSuccess" as any));
  };

  const startPlannedWorkout = (date: string, session: WorkoutSession) => {
    // 1. Remove from planned (mark as deleted or remove from array)
    // Actually, we can just update its status to active and set it as activeSession
    const updatedSession = {
      ...session,
      status: 'active' as const,
      startTime: new Date().toISOString(),
      updatedAt: Date.now()
    };

    // Remove from history list temporarily while it's active
    setAppData(prev => {
      const day = prev.days[date];
      if (!day) return prev;
      return {
        ...prev,
        activeWorkoutSession: updatedSession,
        days: {
          ...prev.days,
          [date]: {
            ...day,
            workoutSessions: day.workoutSessions.filter(s => s.id !== session.id)
          }
        }
      };
    });
  };

  const finishSession = () => {
    if (!activeSession) return;
    
    // Calorie Interception: If calories are 0 or empty, force prompt
    if (!activeSession.calories || activeSession.calories <= 0) {
      setShowCaloriePrompt(true);
      return;
    }

    const today = getTodayStr();
    
    const finishedSession = {
      ...activeSession,
      endTime: new Date().toISOString(),
      updatedAt: Date.now(),
      deleted: false,
      status: 'completed' as const
    };

    setAppData(prev => {
      const dayData = prev.days[today] || { date: today, calories: 0, steps: 0, water: 0, meals: [], workoutSessions: [] };
      return {
        ...prev,
        activeWorkoutSession: null,
        days: {
          ...prev.days,
          [today]: {
            ...dayData,
            workoutSessions: [...(dayData.workoutSessions || []), finishedSession]
          }
        }
      };
    });
    setShowCaloriePrompt(false);
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(diff / 60000);
  };

  return (
    <div className="min-h-dvh space-y-6 pb-32 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("workouts")}</h1>
        <AddWorkoutButton 
          t={t}
          onStartNewWorkout={handleStartNewWorkout}
          onStartPlanning={handleStartPlanning}
          disabled={!!activeSession || !!planningSession}
        />
      </div>

      {/* Tab Switcher */}
      {!activeSession && !planningSession && (
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
          {planningSession ? (
            <motion.div 
              key="planning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
              style={{ paddingBottom: 'calc(var(--tabbar-height, 70px) + 32px + 12px + env(safe-area-inset-bottom, 0px))' }}
            >
              <GlassCard className="flex flex-col w-full max-w-sm h-full border-blue-500/30 bg-black/95 p-0 shadow-2xl relative">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-20 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-blue-400">{t("trainingPlan")}</h2>
                      <p className="text-xs text-white/40">{t("planTodayWorkout")}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setPlanningSession(null);
                        setIsPlanning(false);
                      }}
                      className="p-2 text-white/40 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div 
                  ref={planningSessionContentRef}
                  className="flex-1 modal-content-area p-6 pb-32 space-y-6 no-scrollbar"
                >
                  <div className="space-y-4">
                    {planningSession.exercises.map((sessionEx, exIdx) => {
                      const exercise = allExercises.find(e => e.id === sessionEx.exerciseId);
                      return (
                        <div key={exIdx} className="space-y-3 rounded-2xl bg-white/5 p-4 border border-white/5">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold">{exercise?.name[language]}</h3>
                            <button 
                              onClick={() => {
                                const newExs = planningSession.exercises.filter((_, i) => i !== exIdx);
                                setPlanningSession({...planningSession, exercises: newExs});
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
                              <span className="text-center">Action</span>
                            </div>
                            {sessionEx.sets.map((set, setIdx) => (
                              <div key={setIdx} className="grid grid-cols-4 items-center gap-2">
                                <span className="text-center text-xs font-bold text-white/20">{setIdx + 1}</span>
                                <input 
                                  type="number" 
                                  inputMode="decimal"
                                  className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                  value={set.weight || ""}
                                  onChange={e => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                                />
                                <input 
                                  type="number" 
                                  inputMode="numeric"
                                  className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                  value={set.reps || ""}
                                  onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                                />
                                <button 
                                  onClick={() => {
                                    const newExs = [...planningSession.exercises];
                                    newExs[exIdx].sets = newExs[exIdx].sets.filter((_, i) => i !== setIdx);
                                    if (newExs[exIdx].sets.length === 0) {
                                      newExs.splice(exIdx, 1);
                                    }
                                    setPlanningSession({...planningSession, exercises: newExs});
                                  }}
                                  className="mx-auto text-red-400/40 hover:text-red-400"
                                >
                                  <X size={14} />
                                </button>
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
                </div>

                <div className="px-6 pt-4 flex gap-3 flex-shrink-0 z-20 session-footer-clean h-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
                  <button 
                    onClick={() => setShowExercisePicker(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] py-4 font-bold transition-colors hover:bg-white/[0.08]"
                  >
                    <Plus size={20} />
                  </button>
                  <button 
                    onClick={savePlanningSession}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
                  >
                    <Check size={20} />
                    {t("save")}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ) : activeSession ? (
            <motion.div 
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
              style={{ paddingBottom: 'calc(var(--tabbar-height, 70px) + 32px + 12px + env(safe-area-inset-bottom, 0px))' }}
            >
              <GlassCard className="flex flex-col w-full max-w-sm h-full border-blue-500/30 bg-black/95 p-0 relative shadow-2xl">
                {/* Sticky Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-20 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-blue-400">
                          <Clock size={18} />
                          <span className="text-sm font-bold">
                            {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="h-4 w-[1px] bg-white/[0.06]" />
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
                <div 
                  ref={activeSessionContentRef}
                  className="flex-1 modal-content-area p-6 pb-32 space-y-6 no-scrollbar"
                >
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
                                  className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                  value={set.weight || ""}
                                  onChange={e => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                                />
                                <input 
                                  type="number" 
                                  inputMode="numeric"
                                  className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                  value={set.reps || ""}
                                  onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                                />
                                {exercise?.part === 'cardio' ? (
                                  <input 
                                    type="number" 
                                    inputMode="numeric"
                                    className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
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
                </div>

                <div className="px-6 pt-4 flex gap-3 flex-shrink-0 z-20 sticky bottom-0 session-footer-clean h-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
                  <button 
                    onClick={() => setShowExercisePicker(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] py-4 font-bold transition-colors hover:bg-white/[0.08]"
                  >
                    <Plus size={20} />
                  </button>
                  <button 
                    onClick={finishSession}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 font-bold text-white shadow-lg shadow-green-500/20 transition-transform active:scale-95"
                  >
                    <Check size={20} />
                    {t("endWorkout")}
                  </button>
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
                <LayoutGroup id="workout-history">
                  <div className="space-y-4">
                    {workoutHistory.map(({ date, session }) => (
                      <WorkoutSessionCard 
                        key={session.id}
                        date={date}
                        session={session}
                        allExercises={allExercises}
                        language={language}
                        t={t}
                        onEdit={startEditing}
                        onDelete={deleteWorkout}
                        onStartPlanned={startPlannedWorkout}
                      />
                    ))}
                  </div>
                </LayoutGroup>
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
                  const isCustom = (customExercises || []).some(ce => ce.id === ex.id);
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" style={{ paddingBottom: 'calc(var(--tabbar-height, 70px) + env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <GlassCard className="w-full max-w-lg h-full flex flex-col p-0 border-white/20 bg-black/90 shadow-2xl relative">
              {/* Sticky Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-20">
                <div>
                  <h2 className="text-xl font-bold">{t("editWorkout")}</h2>
                  <p className="text-xs text-white/40">{editingSession.date}</p>
                </div>
                <button onClick={() => {
                  setEditingSession(null);
                  setIsEditingExistingSession(false);
                }} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {/* Enhanced Fields: Category, Calories, Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("workoutCategory")}</label>
                    <select 
                      className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
                      value={editingSession.session.category || ""}
                      onChange={e => setEditingSession({
                        ...editingSession,
                        session: { ...editingSession.session, category: e.target.value }
                      })}
                    >
                      <option value="" className="bg-gray-900">{t("all")}</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat} className="bg-gray-900">{t(cat as any) || cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("calories")} (kcal)</label>
                    <input 
                      type="number"
                      className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
                      value={editingSession.session.calories || ""}
                      onChange={e => setEditingSession({
                        ...editingSession,
                        session: { ...editingSession.session, calories: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("duration")} ({t("min")})</label>
                    <input 
                      type="number"
                      placeholder={calculateDuration(editingSession.session.startTime, editingSession.session.endTime).toString()}
                      className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
                      value={editingSession.session.manualDuration || ""}
                      onChange={e => setEditingSession({
                        ...editingSession,
                        session: { ...editingSession.session, manualDuration: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>

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
                              className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                              value={set.weight || ""}
                              onChange={e => updateEditedSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                            />
                            <input 
                              type="number" 
                              inputMode="numeric"
                              className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
                              value={set.reps || ""}
                              onChange={e => updateEditedSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                            />
                            {allExercises.find(e => e.id === ex.exerciseId)?.part === 'cardio' ? (
                              <input 
                                type="number" 
                                inputMode="numeric"
                                className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-blue-500"
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
                  
                  {/* Add Exercise Button in Edit Modal */}
                  <button 
                    onClick={() => {
                      setIsEditingExistingSession(true);
                      setShowExercisePicker(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-4 text-sm font-bold text-white/40 hover:bg-white/5 transition-colors"
                  >
                    <Plus size={18} />
                    {t("addExercise")}
                  </button>
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

        {/* Calorie Interception Modal */}
        {showCaloriePrompt && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <GlassCard className="w-full max-w-sm p-6 space-y-6 border-orange-500/30 bg-black/90 shadow-[0_0_50px_rgba(249,115,22,0.2)]">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 text-orange-500">
                  <Flame size={32} />
                </div>
                <h2 className="text-xl font-bold">{t("enterCalories")}</h2>
                <p className="text-sm text-white/40">{t("calorieRequiredHint") || "Please enter calories burned to end workout"}</p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="number" 
                    inputMode="decimal"
                    autoFocus
                    placeholder="0"
                    className="w-full rounded-2xl bg-white/5 py-5 text-center text-4xl font-bold outline-none ring-1 ring-white/10 focus:ring-orange-500"
                    value={activeSession?.calories || ""}
                    onChange={e => setActiveSession(activeSession ? {...activeSession, calories: Number(e.target.value)} : null)}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-white/20">kcal</span>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCaloriePrompt(false)}
                    className="flex-1 rounded-2xl bg-white/5 py-4 font-bold text-white/60 transition-colors hover:bg-white/[0.06]"
                  >
                    {t("cancel")}
                  </button>
                  <button 
                    onClick={finishSession}
                    disabled={!activeSession?.calories || activeSession.calories <= 0}
                    className="flex-1 rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                  >
                    {t("confirm")}
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingSession && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm backdrop-saturate-150 backdrop-contrast-90">
            <GlassCard className="w-full max-w-sm space-y-6 border-white/20 bg-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
              <div className="text-center space-y-2">
                <Award className="w-12 h-12 text-red-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">{t("delete")}?</h3>
                <p className="text-sm text-gray-400">{t("confirmDelete")}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingSession(null)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/[0.06] rounded-2xl font-bold text-white transition-all"
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
            </GlassCard>
          </div>
        )}
      </div>

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm backdrop-saturate-150 backdrop-contrast-90">
          <GlassCard className="w-full max-w-sm space-y-6 border-white/20 bg-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
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
                    className="w-full rounded-2xl bg-white/5 p-4 text-center font-bold transition-all hover:bg-white/[0.06] active:scale-95 border border-white/5"
                  >
                    {t(cat as any) || cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                  {(customCategories || []).includes(cat) && (
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
          <GlassCard className="w-full max-w-sm space-y-4 border-white/20 bg-black/80 shadow-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("customCategory") || "Custom Category"}</h2>
              <button 
                onClick={() => setShowAddCategoryModal(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
              >
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
                className="w-full rounded-2xl bg-blue-500 py-4 font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
              >
                {t("save")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Exercise Picker Modal (During Session) */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 h-dvh overflow-hidden">
          {/* Header with safe area and Apple styling */}
          <div className="flex items-center justify-between px-6 pb-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] flex-shrink-0">
            <h2 className="text-3xl font-bold tracking-tight">{t("addExercise")}</h2>
            <button 
              onClick={() => setShowExercisePicker(false)} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.06] text-white/80 hover:bg-white/[0.1] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="px-6 flex gap-3 mb-4 flex-shrink-0">
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
              className="w-14 h-14 flex items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* Category Filter Row in Picker */}
          <div className="px-6 mb-6 overflow-x-auto no-scrollbar flex-shrink-0">
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

          <div className="flex-1 modal-content-area px-6 mb-[var(--tabbar-height)] pb-[env(safe-area-inset-bottom,20px)] no-scrollbar">
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
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-blue-400">
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
                              <span className="h-1 w-1 shrink-0 rounded-full bg-white/[0.06]" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 truncate">
                                {ex.equipment}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/40">
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
          <GlassCard className="w-full max-w-sm border-white/20 bg-black/90 shadow-2xl modal-mobile-dynamic flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold">{t("customExercise")}</h2>
              <button 
                onClick={() => setShowCustomExerciseModal(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 modal-content-area p-6 space-y-6">
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
            </div>

            <div className="p-6 border-t border-white/5 modal-footer-safe">
              <button 
                onClick={handleAddCustomExercise}
                className="w-full rounded-2xl bg-white py-4 font-bold text-black transition-transform active:scale-95 shadow-xl hover:bg-opacity-90"
              >
                {t("save")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
}
