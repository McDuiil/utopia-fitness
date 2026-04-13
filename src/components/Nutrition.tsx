import React, { useState, useMemo } from "react";
import { Plus, Clock, ChevronRight, PieChart, Utensils, X, Calendar, Zap, Settings, Save, RefreshCw, Lock, Unlock, Search, Info, FileUp, Sparkles, Check, Trash2, Edit2, Minus } from "lucide-react";
import GlassCard from "./GlassCard";
import { useApp } from "@/src/context/AppContext";
import { CustomMeal, NutritionSettings, MacroGrams, DayTypeConfig, FoodItem, DietTemplate, SuggestedMeal, Ingredient } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { getTodayStr, calcCalories } from "../lib/utils";

export default function Nutrition() {
  const { t, language, appData, setAppData, calculateBMR, resolvedNutritionToday, sessionDayType, setSessionDayType, showToast, saveAppDataToCloud } = useApp();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: "",
    protein: "",
    carbs: "",
    fat: "",
    amount: "1",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeletePlanConfirm, setShowDeletePlanConfirm] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<CustomMeal | null>(null);
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [editingMealDraft, setEditingMealDraft] = useState<CustomMeal | null>(null);
  const [isPhaseReminderDismissed, setIsPhaseReminderDismissed] = useState(false);

  const autoPhase = useMemo(() => {
    const settings = appData.nutritionSettings;
    const start = new Date(settings.startDate).getTime();
    const now = new Date(getTodayStr()).getTime();
    const diffWeeks = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(0, Math.min(diffWeeks, settings.cutPhases.length - 1));
  }, [appData.nutritionSettings.startDate, appData.nutritionSettings.cutPhases.length]);

  const showPhaseReminder = 
    appData.nutritionSettings.mode === 'cut-phases' && 
    appData.nutritionSettings.manualPhase !== undefined && 
    appData.nutritionSettings.manualPhase < autoPhase &&
    !isPhaseReminderDismissed;

  const today = getTodayStr();
  const dayData = appData.days[today] || { date: today, steps: 0, water: 0, meals: [], workoutSessions: [] };
  
  // Nutrition Settings Draft State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<NutritionSettings>(appData.nutritionSettings);
  const [inputMode, setInputMode] = useState<'grams' | 'percentage'>('grams');

  const hasSettingsChanges = useMemo(() => {
    return JSON.stringify(settingsDraft) !== JSON.stringify(appData.nutritionSettings);
  }, [settingsDraft, appData.nutritionSettings]);

  const handleSaveSettings = () => {
    setAppData({
      ...appData,
      nutritionSettings: settingsDraft
    });
    setShowSettings(false);
  };

  const handleImportPlan = () => {
    try {
      // Pre-process text to handle single-line input by inserting newlines before key markers
      const normalized = importText
        .replace(/【/g, '\n【')
        .replace(/目标[:：]/g, '\n目标:')
        .replace(/[🌅🥚☀️💪🍃]/gu, '\n$&')
        .replace(/配料[:：]/g, '\n配料:')
        .replace(/(训练日|休息日)/g, '\n$1') // Ensure day types are on their own lines or start of lines
        .trim();

      const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Fix 1: Pre-fill phases to avoid sparse array issues
      const newPhases: DayTypeConfig[] = Array.from({ length: 4 }, () => ({
        trainingDay: { protein: 0, carbs: 0, fat: 0 },
        restDay: { protein: 0, carbs: 0, fat: 0 }
      }));
      
      const newTemplates: DietTemplate[] = [];
      
      let currentPhaseIdx = -1;
      let currentDayType: 'training' | 'rest' | null = null;

      lines.forEach(line => {
        // Match Phase: 【阶段1 | 训练日】 or 【阶段1】
        const phaseMatch = line.match(/【阶段\s*(\d+)/);
        if (phaseMatch) {
          const phaseNum = parseInt(phaseMatch[1]) - 1;
          currentPhaseIdx = phaseNum;
          
          // Ensure index is within bounds of our pre-filled array
          if (currentPhaseIdx >= 0 && currentPhaseIdx < newPhases.length) {
            if (!newTemplates[currentPhaseIdx]) {
              newTemplates[currentPhaseIdx] = {
                phase: currentPhaseIdx,
                trainingMeals: [],
                restMeals: []
              };
            }
          }
          
          if (line.includes('训练日')) currentDayType = 'training';
          else if (line.includes('休息日')) currentDayType = 'rest';
          return;
        }

        // Standalone day type markers
        if (line === '训练日' || line.includes('训练日')) {
          currentDayType = 'training';
          return;
        }
        if (line === '休息日' || line.includes('休息日')) {
          currentDayType = 'rest';
          return;
        }

        // Fix 2: Robust goal regex (handles spaces, optional kcal, decimals, full-width chars, and optional units like 'g')
        const goalMatch = line.match(/目标[:：]\s*[\d.]+\s*(?:kcal)?\s*[|｜]\s*P[:：]\s*([\d.]+)(?:g)?\s*C[:：]\s*([\d.]+)(?:g)?\s*F[:：]\s*([\d.]+)(?:g)?/i);
        if (goalMatch && currentPhaseIdx !== -1 && currentPhaseIdx < newPhases.length && currentDayType) {
          const [, p, c, f] = goalMatch;
          const target = currentDayType === 'training' ? newPhases[currentPhaseIdx].trainingDay : newPhases[currentPhaseIdx].restDay;
          target.protein = parseFloat(p);
          target.carbs = parseFloat(c);
          target.fat = parseFloat(f);
          return;
        }

        // Match Meal: 🌅 早餐① (08:00) | P:13 C:1 F:10 (Support optional -, decimals)
        const mealMatch = line.match(/^(?:-\s*)?(.+?)\s*\((.+?)\)\s*\|\s*P:([\d.]+)\s*C:([\d.]+)\s*F:([\d.]+)/);
        if (mealMatch && currentPhaseIdx !== -1 && currentDayType) {
          const [, name, time, p, c, f] = mealMatch;
          
          const meal: SuggestedMeal = {
            id: Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            time,
            protein: parseFloat(p),
            carbs: parseFloat(c),
            fat: parseFloat(f),
            ingredients: []
          };
          
          const targetList = currentDayType === 'training' ? newTemplates[currentPhaseIdx].trainingMeals : newTemplates[currentPhaseIdx].restMeals;
          targetList.push(meal);
          return;
        }

        // Match Ingredients: 配料: 全蛋 2个, 燕麦 50g (Support full-width colon)
        if ((line.startsWith('配料:') || line.startsWith('配料：')) && currentPhaseIdx !== -1 && currentDayType) {
          const targetList = currentDayType === 'training' ? newTemplates[currentPhaseIdx].trainingMeals : newTemplates[currentPhaseIdx].restMeals;
          const lastMeal = targetList[targetList.length - 1];
          if (lastMeal) {
            const ingsStr = line.replace(/^配料[:：]/, '').trim();
            const ings = ingsStr.split(/[,，]/).map(s => {
              const parts = s.trim().split(/\s+/);
              return { n: parts[0], a: parts.slice(1).join(' ') };
            });
            lastMeal.ingredients = ings;
          }
        }
      });

      if (newTemplates.length > 0) {
        const planId = Date.now().toString();
        const newPlan = {
          id: planId,
          name: `Plan ${new Date().toLocaleDateString()}`,
          templates: newTemplates
        };

        // Fix 3: Validation before saving - fill zeros with defaults to avoid fallback issues
        const validatedPhases = newPhases.map((phase, idx) => {
          const isTrainingEmpty = phase.trainingDay.protein === 0 && phase.trainingDay.carbs === 0 && phase.trainingDay.fat === 0;
          const isRestEmpty = phase.restDay.protein === 0 && phase.restDay.carbs === 0 && phase.restDay.fat === 0;
          
          // Use initialData as fallback source
          const defaultPhase = appData.nutritionSettings.cutPhases[idx] || appData.nutritionSettings.cutPhases[0];
          
          return {
            trainingDay: isTrainingEmpty ? { ...defaultPhase.trainingDay } : phase.trainingDay,
            restDay: isRestEmpty ? { ...defaultPhase.restDay } : phase.restDay
          };
        });

        const updatedSettings = {
          ...appData.nutritionSettings,
          mode: 'cut-phases' as const,
          cutPhases: validatedPhases,
          startDate: getTodayStr(), // Reset start date so we start at Phase 1
          manualPhase: 0 // Reset to Phase 1
        };

        const updatedData = {
          ...appData,
          nutritionSettings: updatedSettings,
          dietPlans: [...appData.dietPlans, newPlan],
          activeDietPlanId: planId
        };

        setAppData(updatedData);
        
        // Fix: Immediately sync to cloud to prevent race condition where Firebase listener overwrites local state with old data
        saveAppDataToCloud(updatedData).catch(err => {
          console.error("Failed to sync imported plan to cloud:", err);
        });
        setShowImport(false);
        setImportText("");
        showToast(t("importSuccess" as any));
      } else {
        showToast(t("importError" as any), 'error');
      }
    } catch (e) {
      console.error(e);
      showToast(t("importError" as any), 'error');
    }
  };

  const applySuggestedMeal = (meal: SuggestedMeal) => {
    const today = getTodayStr();
    const dayData = appData.days[today] || { date: today, steps: 0, water: 0, meals: [], workoutSessions: [] };
    
    const newMeal: CustomMeal = {
      id: Math.random().toString(36).substr(2, 9),
      name: meal.name,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      time: meal.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      ingredients: meal.ingredients,
      updatedAt: Date.now()
    };

    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          meals: [...(dayData.meals || []), newMeal]
        }
      }
    });
    showToast(t("add" as any) + " " + meal.name);
  };

  const applyAllSuggestedMeals = () => {
    const activePlan = appData.dietPlans.find(p => p.id === appData.activeDietPlanId) || appData.dietPlans[0];
    if (!activePlan) return;

    const currentPhase = resolvedNutritionToday.metadata.currentPhase;
    const isTraining = resolvedNutritionToday.metadata.currentDayType === 'training';
    const template = activePlan.templates.find(t => t.phase === currentPhase);
    if (!template) return;

    const mealsToApply = isTraining ? template.trainingMeals : template.restMeals;
    if (mealsToApply.length === 0) return;

    const newMeals: CustomMeal[] = mealsToApply.map(meal => ({
      id: Math.random().toString(36).substr(2, 9),
      name: meal.name,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      time: meal.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      ingredients: meal.ingredients,
      updatedAt: Date.now()
    }));

    const today = getTodayStr();
    const dayData = appData.days[today] || { date: today, steps: 0, water: 0, meals: [], workoutSessions: [] };

    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          meals: [...(dayData.meals || []), ...newMeals]
        }
      }
    });
    showToast(t("importSuccess" as any));
  };

  const applyMergedMeals = () => {
    const activePlan = appData.dietPlans.find(p => p.id === appData.activeDietPlanId) || appData.dietPlans[0];
    if (!activePlan) return;

    const currentPhase = resolvedNutritionToday.metadata.currentPhase;
    const isTraining = resolvedNutritionToday.metadata.currentDayType === 'training';
    const template = activePlan.templates.find(t => t.phase === currentPhase);
    if (!template) return;

    const mealsToMerge = (isTraining ? template.trainingMeals : template.restMeals)
      .filter(m => selectedSuggestions.includes(m.id));

    if (mealsToMerge.length === 0) return;

    const mergedMeal: CustomMeal = {
      id: Math.random().toString(36).substr(2, 9),
      name: mealsToMerge.map(m => m.name).join(' + '),
      protein: mealsToMerge.reduce((sum, m) => sum + m.protein, 0),
      carbs: mealsToMerge.reduce((sum, m) => sum + m.carbs, 0),
      fat: mealsToMerge.reduce((sum, m) => sum + m.fat, 0),
      time: mealsToMerge[0].time,
      ingredients: mealsToMerge.flatMap(m => m.ingredients || []),
      updatedAt: Date.now()
    };

    const today = getTodayStr();
    const dayData = appData.days[today] || { date: today, steps: 0, water: 0, meals: [], workoutSessions: [] };

    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          meals: [...(dayData.meals || []), mergedMeal]
        }
      }
    });

    setSelectedSuggestions([]);
    setIsMergeMode(false);
    showToast("Meals merged and added");
  };

  const handleDeleteMeal = (mealId: string) => {
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          meals: dayData.meals.map(m => 
            m.id === mealId ? { ...m, deleted: true, updatedAt: Date.now() } : m
          )
        }
      }
    });
  };

  const handleClearAll = () => {
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          meals: dayData.meals.map(m => ({ ...m, deleted: true, updatedAt: Date.now() }))
        }
      }
    });
    setShowClearConfirm(false);
  };

  const handleDeletePlan = () => {
    if (appData.dietPlans.length <= 1) {
      showToast("At least one plan must be kept", "error");
      return;
    }

    const planToDeleteId = appData.activeDietPlanId || appData.dietPlans[0].id;
    const remainingPlans = appData.dietPlans.filter(p => p.id !== planToDeleteId);
    const nextPlan = remainingPlans[0];

    // Map next plan's templates to cutPhases format
    const nextCutPhases = nextPlan.templates.map(t => ({
      trainingDay: { protein: 0, carbs: 0, fat: 0 }, // We'll need to find the goals from the template or keep current if not found
      restDay: { protein: 0, carbs: 0, fat: 0 }
    }));
    
    // Actually, the templates don't store the goals directly in a simple way in the current structure
    // Wait, the import logic creates both newPlan (templates) and updatedSettings (cutPhases)
    // This means dietPlans and nutritionSettings.cutPhases are somewhat redundant or linked.
    
    // Let's just remove from dietPlans and if it was active, switch activeId.
    // If the user wants to "Apply" a plan, they usually do it via import.
    // But if they just switch in the dropdown, we should probably update the settings too.
    
    const updatedData = {
      ...appData,
      dietPlans: remainingPlans,
      activeDietPlanId: nextPlan.id
    };

    setAppData(updatedData);
    saveAppDataToCloud(updatedData);
    setShowDeletePlanConfirm(false);
    showToast("Diet plan deleted");
  };

  const handleAddMeal = () => {
    if (!newMeal.name) return;
    const amount = Number(newMeal.amount) || 1;
    const meal: CustomMeal = {
      id: Date.now().toString(),
      name: newMeal.name,
      protein: (Number(newMeal.protein) || 0) * amount,
      carbs: (Number(newMeal.carbs) || 0) * amount,
      fat: (Number(newMeal.fat) || 0) * amount,
      time: newMeal.time || "",
      updatedAt: Date.now(),
      deleted: false
    };

    // Update food library with composite key logic
    const foodId = `${newMeal.name.toLowerCase()}-${amount}`; // Simplified for now
    const existingFood = appData.foodLibrary.find(f => f.name.toLowerCase() === newMeal.name.toLowerCase());
    
    let updatedLibrary = [...appData.foodLibrary];
    if (!existingFood) {
      updatedLibrary.push({
        id: Date.now().toString(),
        name: newMeal.name,
        state: 'raw',
        nutrientsPer100g: {
          protein: Number(newMeal.protein) || 0,
          carbs: Number(newMeal.carbs) || 0,
          fat: Number(newMeal.fat) || 0
        },
        userOverride: false,
        source: 'user'
      });
    }

    setAppData({
      ...appData,
      foodLibrary: updatedLibrary,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          meals: [...(dayData.meals || []), meal]
        }
      }
    });
    setShowAddMeal(false);
    setNewMeal({ name: "", protein: "", carbs: "", fat: "", amount: "1", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    setSearchTerm("");
  };

  const handleUpdateMeal = () => {
    if (!editingMealDraft) return;
    
    const today = getTodayStr();
    const dayData = appData.days[today];
    if (!dayData) return;

    const updatedData = {
      ...appData,
      days: {
        ...appData.days,
        [today]: {
          ...dayData,
          meals: dayData.meals.map(m => 
            m.id === editingMealDraft.id ? { ...editingMealDraft, updatedAt: Date.now() } : m
          )
        }
      }
    };

    setAppData(updatedData);
    saveAppDataToCloud(updatedData);
    setSelectedMeal(editingMealDraft);
    setIsEditingMeal(false);
    showToast("Meal updated");
  };

  const copyToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
    
    const tomorrowData = appData.days[tomorrowStr] || { date: tomorrowStr, steps: 0, water: 0, meals: [], workoutSessions: [] };
    
    setAppData({
      ...appData,
      days: {
        ...appData.days,
        [tomorrowStr]: {
          ...tomorrowData,
          meals: [...(tomorrowData.meals || []), ...dayData.meals]
        }
      }
    });
  };

  return (
    <div className="space-y-6 pb-32 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nutrition")}</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setSettingsDraft(appData.nutritionSettings);
              setShowSettings(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => setShowAddMeal(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 active:scale-90 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {showPhaseReminder && (
        <div className="px-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 rounded-2xl bg-purple-500/20 border border-purple-500/30 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500 text-white">
                <RefreshCw size={16} />
              </div>
              <p className="text-xs font-bold">
                建议切换到 Phase {autoPhase + 1}，是否现在切换？
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsPhaseReminderDismissed(true)}
                className="rounded-lg bg-white/5 px-3 py-2 text-[10px] font-bold uppercase text-white/40"
              >
                忽略
              </button>
              <button 
                onClick={() => {
                  setAppData({
                    ...appData,
                    nutritionSettings: { ...appData.nutritionSettings, manualPhase: autoPhase }
                  });
                }}
                className="rounded-lg bg-purple-500 px-3 py-2 text-[10px] font-bold uppercase text-white"
              >
                立即切换
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Nutrition Settings Modal (Replaces Ratio Editor) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 pb-24 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm border-white/20 bg-black/90 max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">{t("nutritionSettings")}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{t("currentMode")}: {t(settingsDraft.mode as any)}</p>
                  <button 
                    onClick={() => setShowImport(true)}
                    className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[8px] font-bold text-purple-400 hover:bg-purple-500/20 transition-all"
                  >
                    <FileUp size={10} />
                    {t("importPlan" as any)}
                  </button>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar min-h-0">
              {/* Plan Selection (Multi-Plan Support) */}
              {appData.dietPlans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{t("dietPlan" as any) || "Diet Plan"}</p>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 rounded-xl bg-white/5 p-3 text-xs font-bold outline-none border border-white/5"
                      value={appData.activeDietPlanId || ""}
                      onChange={(e) => setAppData({ ...appData, activeDietPlanId: e.target.value })}
                    >
                      {appData.dietPlans.map(plan => (
                        <option key={plan.id} value={plan.id} className="bg-gray-900">{plan.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (appData.dietPlans.length <= 1) {
                          showToast("At least one plan must be kept", "error");
                        } else {
                          setShowDeletePlanConfirm(true);
                        }
                      }}
                      disabled={appData.dietPlans.length <= 1}
                      className={`rounded-xl p-3 transition-all ${
                        appData.dietPlans.length <= 1 
                          ? "bg-white/5 text-white/10 cursor-not-allowed" 
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      }`}
                      title={appData.dietPlans.length <= 1 ? "At least one plan must be kept" : "Delete Plan"}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Mode Selection */}
              <div className="flex flex-wrap gap-2">
                {(['standard', 'carb-cycling', 'cut-phases'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setSettingsDraft({ ...settingsDraft, mode: m })}
                    className={`flex-1 rounded-xl py-2 text-[10px] font-bold uppercase transition-all ${
                      settingsDraft.mode === m ? "bg-white text-black" : "bg-white/5 text-white/40"
                    }`}
                  >
                    {t(m as any)}
                  </button>
                ))}
              </div>

              {/* Input Mode Toggle */}
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-1">
                <button 
                  onClick={() => setInputMode('grams')}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${inputMode === 'grams' ? "bg-white/10 text-white" : "text-white/20"}`}
                >
                  {t("grams")}
                </button>
                <button 
                  onClick={() => setInputMode('percentage')}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${inputMode === 'percentage' ? "bg-white/10 text-white" : "text-white/20"}`}
                >
                  {t("percentage")}
                </button>
              </div>

              {/* Settings Content */}
              <div className="space-y-6">
                {/* Standard / Carb Cycling Config */}
                {(settingsDraft.mode === 'standard' || settingsDraft.mode === 'carb-cycling') && (
                  <div className="space-y-6">
                    {/* Training Day */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-orange-400">
                        <Zap size={14} />
                        <h3 className="text-xs font-bold uppercase tracking-widest">{t("trainingDayConfig")}</h3>
                      </div>
                      <MacroInputGrid 
                        config={settingsDraft.mode === 'standard' ? settingsDraft.standard.trainingDay : settingsDraft.carbCycling.trainingDay}
                        onChange={(val) => {
                          const key = settingsDraft.mode === 'standard' ? 'standard' : 'carbCycling';
                          setSettingsDraft({
                            ...settingsDraft,
                            [key]: { ...settingsDraft[key], trainingDay: val }
                          });
                        }}
                        mode={inputMode}
                      />
                    </div>
                    {/* Rest Day */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Calendar size={14} />
                        <h3 className="text-xs font-bold uppercase tracking-widest">{t("restDayConfig")}</h3>
                      </div>
                      <MacroInputGrid 
                        config={settingsDraft.mode === 'standard' ? settingsDraft.standard.restDay : settingsDraft.carbCycling.restDay}
                        onChange={(val) => {
                          const key = settingsDraft.mode === 'standard' ? 'standard' : 'carbCycling';
                          setSettingsDraft({
                            ...settingsDraft,
                            [key]: { ...settingsDraft[key], restDay: val }
                          });
                        }}
                        mode={inputMode}
                      />
                    </div>
                  </div>
                )}

                {/* Cut Phases Config */}
                {settingsDraft.mode === 'cut-phases' && (
                  <div className="space-y-8">
                    {settingsDraft.cutPhases.map((phase, idx) => (
                      <div key={idx} className="space-y-4 rounded-2xl bg-white/5 p-4 border border-white/5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">{t("phase")} {idx + 1}</h3>
                          <button 
                            onClick={() => {
                              const newPhases = settingsDraft.cutPhases.filter((_, i) => i !== idx);
                              setSettingsDraft({ ...settingsDraft, cutPhases: newPhases });
                            }}
                            className="text-white/20 hover:text-red-400"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-[10px] text-white/20 font-bold uppercase">{t("trainingDay")}</p>
                            <MacroInputGrid 
                              config={phase.trainingDay}
                              onChange={(val) => {
                                const newPhases = [...settingsDraft.cutPhases];
                                newPhases[idx] = { ...newPhases[idx], trainingDay: val };
                                setSettingsDraft({ ...settingsDraft, cutPhases: newPhases });
                              }}
                              mode={inputMode}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] text-white/20 font-bold uppercase">{t("restDay")}</p>
                            <MacroInputGrid 
                              config={phase.restDay}
                              onChange={(val) => {
                                const newPhases = [...settingsDraft.cutPhases];
                                newPhases[idx] = { ...newPhases[idx], restDay: val };
                                setSettingsDraft({ ...settingsDraft, cutPhases: newPhases });
                              }}
                              mode={inputMode}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => setSettingsDraft({ ...settingsDraft, cutPhases: [...settingsDraft.cutPhases, { trainingDay: { protein: 0, carbs: 0, fat: 0 }, restDay: { protein: 0, carbs: 0, fat: 0 } }] })}
                      className="w-full rounded-xl border border-dashed border-white/20 py-3 text-[10px] font-bold text-white/40 hover:bg-white/5"
                    >
                      + {t("add" as any)} {t("phase")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button (Footer) */}
            <div className="p-6 pt-4 border-t border-white/5">
              <button 
                onClick={handleSaveSettings}
                disabled={!hasSettingsChanges}
                className={`w-full rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2 ${
                  hasSettingsChanges ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-white/5 text-white/20"
                }`}
              >
                <Save size={18} />
                {t("saveAndApply")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Plan Status Card */}
      <div className="px-4 space-y-4">
        <GlassCard className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("currentMode")}</h2>
              <p className="text-sm font-bold text-blue-400">{t(appData.nutritionSettings.mode as any)}</p>
            </div>
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => {
                   const nextType = resolvedNutritionToday.metadata.currentDayType === 'training' ? 'rest' : 'training';
                   setSessionDayType(nextType);
                 }}
                 className={`flex flex-col items-center justify-center h-10 px-4 rounded-xl transition-all active:scale-95 ${
                   resolvedNutritionToday.metadata.currentDayType === 'training' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                 }`}
               >
                 <div className="flex items-center text-[10px] font-bold uppercase tracking-widest">
                   {resolvedNutritionToday.metadata.currentDayType === 'training' ? <Zap size={12} className="mr-1" /> : <Calendar size={12} className="mr-1" />}
                   {t(resolvedNutritionToday.metadata.currentDayType === 'training' ? "trainingDay" : "restDay")}
                 </div>
                 <span className="text-[8px] opacity-40 uppercase tracking-tighter">
                   {resolvedNutritionToday.metadata.dayTypeSource === 'session' ? t("manualDayType" as any) : t("autoDayType" as any)}
                 </span>
               </button>
            </div>
          </div>

          {appData.nutritionSettings.mode === 'cut-phases' && (
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                  <RefreshCw size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase">{t("currentPhase")}</p>
                  <p className="text-xs font-bold">Phase {resolvedNutritionToday.metadata.currentPhase + 1}</p>
                </div>
              </div>
              <select 
                className="bg-transparent text-xs font-bold outline-none"
                value={appData.nutritionSettings.manualPhase ?? resolvedNutritionToday.metadata.currentPhase}
                onChange={(e) => setAppData({
                  ...appData,
                  nutritionSettings: { ...appData.nutritionSettings, manualPhase: Number(e.target.value) }
                })}
              >
                {appData.nutritionSettings.cutPhases.map((_, i) => (
                  <option key={i} value={i} className="bg-gray-900">Phase {i + 1}</option>
                ))}
              </select>
            </div>
          )}
        </GlassCard>

        {/* Suggestion Shelf */}
        {appData.dietPlans.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {t("phase")} {resolvedNutritionToday.metadata.currentPhase + 1} {t("suggestions" as any) || "Suggestions"}
                </h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={applyAllSuggestedMeals}
                  className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-white/5 text-white/40 hover:bg-white/10"
                >
                  {t("mirrorAll" as any) || "Mirror All"}
                </button>
                <button 
                  onClick={() => {
                    setIsMergeMode(!isMergeMode);
                    setSelectedSuggestions([]);
                  }}
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all ${
                    isMergeMode ? "bg-purple-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                  }`}
                >
                  {isMergeMode ? t("cancel") : t("merge" as any) || "Merge"}
                </button>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar flex-nowrap">
              {(() => {
                const activePlan = appData.dietPlans.find(p => p.id === appData.activeDietPlanId) || appData.dietPlans[0];
                const template = activePlan?.templates.find(t => t.phase === resolvedNutritionToday.metadata.currentPhase);
                const meals = resolvedNutritionToday.metadata.currentDayType === 'training' ? template?.trainingMeals : template?.restMeals;
                
                return meals?.map((meal) => (
                  <button
                    key={meal.id}
                    onClick={() => {
                      if (isMergeMode) {
                        setSelectedSuggestions(prev => 
                          prev.includes(meal.id) ? prev.filter(id => id !== meal.id) : [...prev, meal.id]
                        );
                      } else {
                        applySuggestedMeal(meal);
                      }
                    }}
                    className={`relative flex-shrink-0 w-32 rounded-2xl p-4 border transition-all active:scale-95 ${
                      selectedSuggestions.includes(meal.id) 
                        ? "bg-purple-500/20 border-purple-500/50" 
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-white line-clamp-2 h-6 flex items-center justify-center">{meal.name}</p>
                        <p className="text-[8px] text-white/40 font-mono">{meal.time}</p>
                      </div>
                      <div className="flex gap-1 text-[8px] font-bold text-white/60">
                        <span>P:{meal.protein}</span>
                        <span>C:{meal.carbs}</span>
                      </div>
                    </div>
                    {selectedSuggestions.includes(meal.id) && (
                      <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ));
              })()}
            </div>

            {isMergeMode && selectedSuggestions.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={applyMergedMeals}
                className="w-full rounded-xl bg-purple-500 py-2.5 text-[10px] font-bold uppercase text-white shadow-lg shadow-purple-500/20"
              >
                {t("merge" as any) || "Merge"} {selectedSuggestions.length} {t("meals" as any) || "Meals"}
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Macros Summary */}
      <div className="px-4">
        <GlassCard className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">{t("calories")}</p>
              <h2 className="text-3xl font-bold">
                {resolvedNutritionToday.calories.consumed} 
                <span className="text-sm font-normal text-white/20"> / {resolvedNutritionToday.calories.dynamicGoal}</span>
              </h2>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/5">
              <PieChart size={24} className="text-green-400" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <MacroProgress 
              label={t("protein")} 
              cur={resolvedNutritionToday.consumed.protein} 
              goal={resolvedNutritionToday.dynamicGoal.protein} 
              color="bg-blue-400" 
            />
            <MacroProgress 
              label={t("carbs")} 
              cur={resolvedNutritionToday.consumed.carbs} 
              goal={resolvedNutritionToday.dynamicGoal.carbs} 
              color="bg-green-400" 
            />
            <MacroProgress 
              label={t("fat")} 
              cur={resolvedNutritionToday.consumed.fat} 
              goal={resolvedNutritionToday.dynamicGoal.fat} 
              color="bg-yellow-400" 
            />
          </div>
        </GlassCard>
      </div>

      {/* Meals List */}
      <div className="space-y-3 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("todaysMeals")}</h2>
          <div className="flex gap-2">
            {dayData.meals && dayData.meals.length > 0 && (
              <>
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <X size={14} />
                  {t("clearAll")}
                </button>
                <button 
                  onClick={copyToTomorrow}
                  className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold text-white/40 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Calendar size={14} />
                  {t("copyToTomorrow")}
                </button>
              </>
            )}
          </div>
        </div>
        {(!dayData.meals || dayData.meals.filter(m => !m.deleted).length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/20">
            <Utensils size={48} strokeWidth={1} />
            <p className="mt-4 text-sm">No meals logged yet</p>
          </div>
        ) : (
          dayData.meals.filter(m => !m.deleted).map((meal) => (
            <GlassCard 
              key={meal.id} 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98]"
              onClick={() => setSelectedMeal(meal)}
            >
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-bold">{meal.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Clock size={12} />
                    <span>{meal.time}</span>
                    <span>•</span>
                    <span>{calcCalories(meal.protein, meal.carbs, meal.fat)} kcal</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMeal(meal.id);
                }}
                className="p-2 text-white/20 hover:text-red-400 transition-colors"
              >
                <X size={18} />
              </button>
            </GlassCard>
          ))
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/90">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("importPlan" as any)}</h2>
              <button onClick={() => setShowImport(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-white/40">Paste your diet plan in the standard format below to automatically fill the phases.</p>
            <textarea 
              className="w-full h-64 rounded-2xl bg-white/5 p-4 text-xs font-mono outline-none ring-1 ring-white/10 focus:ring-purple-500/50 no-scrollbar"
              placeholder="【饮食方案】..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <button 
              onClick={handleImportPlan}
              className="w-full rounded-2xl bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-500/20 transition-transform active:scale-95"
            >
              {t("save")}
            </button>
          </GlassCard>
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("customMeal")}</h2>
              <button onClick={() => setShowAddMeal(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="relative space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("mealName")}</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-green-500/50"
                  value={newMeal.name}
                  onChange={e => {
                    setNewMeal({...newMeal, name: e.target.value});
                    setSearchTerm(e.target.value);
                    setShowLibrary(true);
                  }}
                  onFocus={() => setShowLibrary(true)}
                />
                
                {/* Food Library Dropdown */}
                {showLibrary && searchTerm && (
                  <div className="absolute left-0 right-0 top-full z-[110] mt-2 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/5">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Recent Foods</span>
                      <button onClick={() => setShowLibrary(false)} className="text-white/40 hover:text-white">
                        <X size={12} />
                      </button>
                    </div>
                    {appData.foodLibrary
                      .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(food => (
                        <button
                          key={food.id}
                          onClick={() => {
                            setNewMeal({
                              ...newMeal,
                              name: food.name,
                              protein: food.nutrientsPer100g.protein.toString(),
                              carbs: food.nutrientsPer100g.carbs.toString(),
                              fat: food.nutrientsPer100g.fat.toString()
                            });
                            setShowLibrary(false);
                          }}
                          className="w-full rounded-xl p-3 text-left hover:bg-white/5 transition-colors"
                        >
                          <p className="text-sm font-bold">{food.name}</p>
                          <p className="text-[10px] text-white/40">
                            {calcCalories(food.nutrientsPer100g.protein, food.nutrientsPer100g.carbs, food.nutrientsPer100g.fat)} kcal • P: {food.nutrientsPer100g.protein}g • C: {food.nutrientsPer100g.carbs}g • F: {food.nutrientsPer100g.fat}g
                          </p>
                        </button>
                      ))}
                    {appData.foodLibrary.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <p className="p-3 text-center text-xs text-white/20">No matching foods found</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("calories")} (Estimated)</label>
                  <div className="w-full h-[46px] rounded-xl bg-white/5 px-4 flex items-center text-white/40 text-sm border border-white/10">
                    {calcCalories(Number(newMeal.protein) || 0, Number(newMeal.carbs) || 0, Number(newMeal.fat) || 0)} kcal
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("quantity" as any) || "Quantity"}</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    className="w-full h-[46px] rounded-xl bg-white/5 px-4 outline-none ring-1 ring-white/10 focus:ring-green-500/50"
                    value={newMeal.amount}
                    onChange={e => setNewMeal({...newMeal, amount: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("time")}</label>
                  <input 
                    type="time" 
                    className="w-full h-[46px] rounded-xl bg-white/5 px-4 outline-none ring-1 ring-white/10 focus:ring-green-500/50 appearance-none"
                    style={{ colorScheme: 'dark' }}
                    value={newMeal.time}
                    onChange={e => setNewMeal({...newMeal, time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("protein")}</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-green-500/50"
                    value={newMeal.protein}
                    onChange={e => setNewMeal({...newMeal, protein: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("carbs")}</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-green-500/50"
                    value={newMeal.carbs}
                    onChange={e => setNewMeal({...newMeal, carbs: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("fat")}</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-green-500/50"
                    value={newMeal.fat}
                    onChange={e => setNewMeal({...newMeal, fat: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleAddMeal}
              className="w-full rounded-2xl bg-white py-4 font-bold text-black transition-transform active:scale-95"
            >
              {t("save")}
            </button>
          </GlassCard>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm space-y-6 border-white/20 bg-black/80 p-6">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold text-red-400">{t("clearAll")}?</h2>
              <p className="text-sm text-white/40">This will remove all meals logged for today. This action cannot be undone.</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-2xl bg-white/10 py-4 font-bold text-white transition-transform active:scale-95"
              >
                {t("cancel")}
              </button>
              <button 
                onClick={handleClearAll}
                className="flex-1 rounded-2xl bg-red-500 py-4 font-bold text-white transition-transform active:scale-95 shadow-lg shadow-red-500/20"
              >
                {t("delete")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete Plan Confirmation Modal */}
      {showDeletePlanConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm space-y-6 border-white/20 bg-black/80 p-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Diet Plan?</h2>
              <p className="text-sm text-white/40">This will permanently remove the current plan from your library. This action cannot be undone.</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeletePlanConfirm(false)}
                className="flex-1 rounded-2xl bg-white/10 py-4 font-bold text-white transition-transform active:scale-95"
              >
                {t("cancel")}
              </button>
              <button 
                onClick={handleDeletePlan}
                className="flex-1 rounded-2xl bg-red-500 py-4 font-bold text-white transition-transform active:scale-95 shadow-lg shadow-red-500/20"
              >
                {t("delete")}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-6 border-white/20 bg-black/80">
            <div className="flex items-center justify-between">
              {isEditingMeal ? (
                <input 
                  type="text"
                  value={editingMealDraft?.name || ""}
                  onChange={(e) => setEditingMealDraft(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-lg font-bold outline-none w-full mr-4"
                />
              ) : (
                <h2 className="text-xl font-bold">{selectedMeal.name}</h2>
              )}
              <div className="flex items-center gap-2">
                {!isEditingMeal && (
                  <button 
                    onClick={() => {
                      setEditingMealDraft({ ...selectedMeal });
                      setIsEditingMeal(true);
                    }}
                    className="text-white/40 hover:text-white"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedMeal(null);
                    setIsEditingMeal(false);
                  }} 
                  className="text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("time")}</p>
                {isEditingMeal ? (
                  <input 
                    type="time"
                    value={editingMealDraft?.time || ""}
                    onChange={(e) => setEditingMealDraft(prev => prev ? { ...prev, time: e.target.value } : null)}
                    className="mt-1 bg-transparent text-center text-lg font-bold outline-none w-full"
                  />
                ) : (
                  <p className="mt-1 text-lg font-bold">{selectedMeal.time}</p>
                )}
              </div>
              <div className="rounded-2xl bg-white/5 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("calories")}</p>
                <p className="mt-1 text-lg font-bold">
                  {isEditingMeal 
                    ? calcCalories(editingMealDraft?.protein || 0, editingMealDraft?.carbs || 0, editingMealDraft?.fat || 0)
                    : calcCalories(selectedMeal.protein, selectedMeal.carbs, selectedMeal.fat)
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">P</p>
                {isEditingMeal ? (
                  <input 
                    type="number"
                    value={editingMealDraft?.protein || 0}
                    onChange={(e) => setEditingMealDraft(prev => prev ? { ...prev, protein: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full bg-transparent text-center text-sm font-bold text-blue-400 outline-none"
                  />
                ) : (
                  <p className="text-sm font-bold text-blue-400">{selectedMeal.protein}g</p>
                )}
              </div>
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">C</p>
                {isEditingMeal ? (
                  <input 
                    type="number"
                    value={editingMealDraft?.carbs || 0}
                    onChange={(e) => setEditingMealDraft(prev => prev ? { ...prev, carbs: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full bg-transparent text-center text-sm font-bold text-green-400 outline-none"
                  />
                ) : (
                  <p className="text-sm font-bold text-green-400">{selectedMeal.carbs}g</p>
                )}
              </div>
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">F</p>
                {isEditingMeal ? (
                  <input 
                    type="number"
                    value={editingMealDraft?.fat || 0}
                    onChange={(e) => setEditingMealDraft(prev => prev ? { ...prev, fat: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full bg-transparent text-center text-sm font-bold text-yellow-400 outline-none"
                  />
                ) : (
                  <p className="text-sm font-bold text-yellow-400">{selectedMeal.fat}g</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ingredients</p>
                {isEditingMeal && (
                  <button 
                    onClick={() => setEditingMealDraft(prev => {
                      if (!prev) return null;
                      const ings = [...(prev.ingredients || [])];
                      ings.push({ n: "", a: "" });
                      return { ...prev, ingredients: ings };
                    })}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus size={10} /> Add
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {isEditingMeal ? (
                  editingMealDraft?.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
                      <input 
                        type="text"
                        value={ing.n}
                        placeholder="Name"
                        onChange={(e) => setEditingMealDraft(prev => {
                          if (!prev) return null;
                          const ings = [...(prev.ingredients || [])];
                          ings[idx] = { ...ings[idx], n: e.target.value };
                          return { ...prev, ingredients: ings };
                        })}
                        className="flex-1 bg-transparent text-xs font-bold outline-none"
                      />
                      <input 
                        type="text"
                        value={ing.a}
                        placeholder="Qty"
                        onChange={(e) => setEditingMealDraft(prev => {
                          if (!prev) return null;
                          const ings = [...(prev.ingredients || [])];
                          ings[idx] = { ...ings[idx], a: e.target.value };
                          return { ...prev, ingredients: ings };
                        })}
                        className="w-16 bg-transparent text-xs text-white/40 text-right outline-none"
                      />
                      <button 
                        onClick={() => setEditingMealDraft(prev => {
                          if (!prev) return null;
                          const ings = (prev.ingredients || []).filter((_, i) => i !== idx);
                          return { ...prev, ingredients: ings };
                        })}
                        className="text-red-400/60 hover:text-red-400"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  selectedMeal.ingredients && selectedMeal.ingredients.length > 0 ? (
                    selectedMeal.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs">
                        <span className="font-bold">{ing.n}</span>
                        <span className="text-white/40">{ing.a}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-white/20 italic">No ingredients listed</p>
                  )
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {isEditingMeal ? (
                <>
                  <button 
                    onClick={() => setIsEditingMeal(false)}
                    className="flex-1 rounded-2xl bg-white/5 py-4 font-bold text-white transition-transform active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateMeal}
                    className="flex-1 rounded-2xl bg-purple-500 py-4 font-bold text-white transition-transform active:scale-95 shadow-lg shadow-purple-500/20"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setSelectedMeal(null)}
                  className="w-full rounded-2xl bg-white/10 py-4 font-bold text-white transition-transform active:scale-95"
                >
                  {t("close" as any) || "Close"}
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function MacroProgress({ label, cur, goal, color }: { label: string; cur: number; goal: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-white/40">{label}</span>
        <span>{cur.toFixed(1)}g</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div 
          className={`h-full ${color} transition-all duration-500`} 
          style={{ width: `${Math.min(100, goal > 0 ? (cur / goal) * 100 : 0)}%` }} 
        />
      </div>
      <p className="text-[10px] text-white/20 text-right">Goal: {goal.toFixed(1)}g</p>
    </div>
  );
}

function MacroInputGrid({ config, onChange, mode }: { config: MacroGrams; onChange: (val: MacroGrams) => void; mode: 'grams' | 'percentage' }) {
  const totalCalories = calcCalories(config.protein, config.carbs, config.fat) || 2000;
  
  const getVal = (macro: keyof MacroGrams) => {
    if (mode === 'grams') return config[macro];
    const cal = macro === 'fat' ? config[macro] * 9 : config[macro] * 4;
    return totalCalories > 0 ? Math.round((cal / totalCalories) * 100) : 0;
  };

  const handleInputChange = (macro: keyof MacroGrams, val: string) => {
    const num = Number(val) || 0;
    if (mode === 'grams') {
      onChange({ ...config, [macro]: num });
    } else {
      // Percentage mode: calculate grams based on percentage of current total calories
      const targetCal = (num / 100) * totalCalories;
      const grams = macro === 'fat' ? targetCal / 9 : targetCal / 4;
      onChange({ ...config, [macro]: Number(grams.toFixed(1)) });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {(['protein', 'carbs', 'fat'] as const).map(m => (
        <div key={m} className="space-y-1">
          <label className="text-[8px] font-bold uppercase tracking-widest text-white/20">
            {m} {mode === 'percentage' ? '(%)' : '(g)'}
          </label>
          <input 
            type="number" 
            inputMode="decimal"
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-xs outline-none ring-1 ring-white/10 focus:ring-blue-500/50"
            value={getVal(m)}
            onChange={(e) => handleInputChange(m, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
