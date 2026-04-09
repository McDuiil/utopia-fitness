import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Theme, AppData, Profile, DayData, CustomMeal, WorkoutSession, ResolvedNutritionToday, NutritionSettings, MacroGrams, DayTypeConfig } from '../types';
import { translations } from '../lib/i18n';
import { githubService } from '../services/githubService';
import { getTodayStr, calcCalories } from '../lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, db, signInWithGoogle, logout as firebaseLogout, onAuthStateChanged, User, doc, setDoc, onSnapshot, collection, OperationType, handleFirestoreError } from '../firebase';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: keyof typeof translations.en) => string;
  appData: AppData;
  setAppData: (data: AppData) => void;
  calculateBMR: (profile: Profile) => number;
  mergeData: (incomingData: any) => void;
  syncWithGist: (silent?: boolean) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  pushAllToCloud: () => Promise<void>;
  saveAppDataToCloud: (data: AppData) => Promise<void>;
  user: User | null;
  isAuthReady: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  resolvedNutritionToday: ResolvedNutritionToday;
  sessionDayType: 'training' | 'rest' | null;
  setSessionDayType: (type: 'training' | 'rest' | null) => void;
}

const defaultProfile: Profile = {
  nickname: "Utopia User",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  gender: "male",
  age: 30,
  height: 170,
  weight: 64,
  bodyFat: 17.2,
  goalWeight: 63,
  goalDeficit: 500,
  goalBodyFat: 9,
  useCustomBMR: false,
  customBMR: 1558
};

const initialData: AppData = {
  version: 5,
  profile: defaultProfile,
  nutritionSettings: {
    mode: 'standard',
    startDate: getTodayStr(),
    standard: {
      trainingDay: { protein: 160, carbs: 200, fat: 60 },
      restDay: { protein: 160, carbs: 100, fat: 80 }
    },
    carbCycling: {
      trainingDay: { protein: 160, carbs: 300, fat: 40 },
      restDay: { protein: 160, carbs: 50, fat: 90 }
    },
    cutPhases: [
      { trainingDay: { protein: 180, carbs: 200, fat: 50 }, restDay: { protein: 180, carbs: 100, fat: 60 } },
      { trainingDay: { protein: 180, carbs: 150, fat: 50 }, restDay: { protein: 180, carbs: 80, fat: 60 } },
      { trainingDay: { protein: 180, carbs: 100, fat: 50 }, restDay: { protein: 180, carbs: 50, fat: 60 } },
      { trainingDay: { protein: 180, carbs: 50, fat: 50 }, restDay: { protein: 180, carbs: 30, fat: 60 } }
    ]
  },
  days: {},
  dietPlans: [],
  activeDietPlanId: undefined,
  customExercises: [],
  foodLibrary: [],
  enabledWidgets: ['weight', 'bodyFat', 'calories', 'deficit', 'activity', 'water', 'quickWorkout', 'quickMeal'],
  categoryImages: {
    chest: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&auto=format&fit=crop&q=60',
    back: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&auto=format&fit=crop&q=60',
    legs: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=60',
    shoulders: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&auto=format&fit=crop&q=60',
    arms: 'https://images.unsplash.com/photo-1581009146145-b5ef03a7403f?w=400&auto=format&fit=crop&q=60',
    core: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop&q=60'
  },
  syncSettings: {
    mode: 'pc'
  },
  activeWorkoutSession: null
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const migrateData = (data: any): AppData => {
  const parsed = { ...data };
  
  // Ensure top-level objects exist
  if (!parsed.profile) parsed.profile = { ...defaultProfile };
  if (!parsed.days) parsed.days = {};
  if (!parsed.customExercises) parsed.customExercises = [];
  if (!parsed.foodLibrary) parsed.foodLibrary = [];
  if (!parsed.enabledWidgets) parsed.enabledWidgets = [...initialData.enabledWidgets];
  if (!parsed.categoryImages) parsed.categoryImages = { ...initialData.categoryImages };
  if (!parsed.syncSettings) parsed.syncSettings = { ...initialData.syncSettings };
  
  // Migration: Initialize dietPlans if missing
  if (!parsed.dietPlans) {
    parsed.dietPlans = [];
    // Migrate old dietTemplates if they exist
    if (parsed.dietTemplates && parsed.dietTemplates.length > 0) {
      parsed.dietPlans.push({
        id: 'legacy-plan',
        name: 'Imported Plan',
        templates: parsed.dietTemplates
      });
      parsed.activeDietPlanId = 'legacy-plan';
    }
  }
  delete parsed.dietTemplates;

  // 1. Profile Migration
  if (!parsed.profile.nickname) parsed.profile.nickname = defaultProfile.nickname;
  if (!parsed.profile.avatar) parsed.profile.avatar = defaultProfile.avatar;
  if (parsed.profile.gender === undefined) parsed.profile.gender = defaultProfile.gender;
  if (parsed.profile.age === undefined) parsed.profile.age = defaultProfile.age;
  if (parsed.profile.height === undefined) parsed.profile.height = defaultProfile.height;
  if (parsed.profile.weight === undefined) parsed.profile.weight = defaultProfile.weight;
  if (parsed.profile.useCustomBMR === undefined) parsed.profile.useCustomBMR = false;
  if (parsed.profile.customBMR === null || parsed.profile.customBMR === undefined) parsed.profile.customBMR = 1558;

  // 2. Nutrition Settings Migration (Version 5)
  if (!parsed.nutritionSettings) {
    console.log("Initializing nutrition settings...");
    parsed.nutritionSettings = { ...initialData.nutritionSettings };
  } else if (parsed.version < 5) {
    console.log("Upgrading nutrition settings to version 5...");
    // Merge existing settings with new structure to avoid complete reset
    parsed.nutritionSettings = {
      ...initialData.nutritionSettings,
      ...parsed.nutritionSettings,
      standard: parsed.nutritionSettings.standard || initialData.nutritionSettings.standard,
      carbCycling: parsed.nutritionSettings.carbCycling || initialData.nutritionSettings.carbCycling,
      cutPhases: parsed.nutritionSettings.cutPhases || initialData.nutritionSettings.cutPhases
    };
    
    // Attempt to preserve some old data if it exists
    if (parsed.nutritionPlan) {
      const oldPlan = parsed.nutritionPlan;
      if (oldPlan.type === 'carb-cycling') parsed.nutritionSettings.mode = 'carb-cycling';
      if (oldPlan.type === 'carb-tapering') parsed.nutritionSettings.mode = 'cut-phases';
    }
  }
  
  // Ensure version is set to current
  parsed.version = 5;

  // 3. Days Data Migration (Remove stored calories)
  const migratedDays: { [date: string]: DayData } = {};
  if (parsed.days) {
    Object.entries(parsed.days).forEach(([date, day]: [string, any]) => {
      const meals = (day.meals || []).map((m: any) => {
        const { calories, ...rest } = m;
        return rest;
      });
      
      const { calories, ...dayRest } = day;
      migratedDays[date] = {
        ...dayRest,
        date,
        meals,
        workoutSessions: day.workoutSessions || []
      };
    });
  }
  parsed.days = migratedDays;

  // 4. Food Library Migration
  if (parsed.foodLibrary) {
    parsed.foodLibrary = parsed.foodLibrary.map((f: any) => {
      if (f.nutrientsPer100g) return f;
      return {
        id: f.id || Math.random().toString(36).substr(2, 9),
        name: f.name || 'Unknown',
        state: 'raw',
        nutrientsPer100g: {
          protein: f.protein || 0,
          carbs: f.carbs || 0,
          fat: f.fat || 0
        },
        userOverride: false,
        source: 'local'
      };
    });
  }

  parsed.version = 5;
  return parsed as AppData;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isFirstSyncComplete, setIsFirstSyncComplete] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [sessionDayType, setSessionDayType] = useState<'training' | 'rest' | null>(null);

  // Reset sessionDayType when date changes
  useEffect(() => {
    setSessionDayType(null);
  }, [selectedDate]);
  const [appData, setAppData] = useState<AppData>(() => {
    const saved = localStorage.getItem('utopia_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return migrateData(parsed);
      } catch (e) {
        console.error("Failed to parse or migrate data:", e);
        return initialData;
      }
    }
    return initialData;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    // If there's an active session in the appData we just loaded, start on workouts tab
    return appData?.activeWorkoutSession ? 'workouts' : 'dashboard';
  });

  const isInternalUpdate = React.useRef(false);

  // Resolved Nutrition Layer
  const resolvedNutritionToday = React.useMemo((): ResolvedNutritionToday => {
    const settings = appData.nutritionSettings;
    const today = getTodayStr();
    const dayData = appData.days[selectedDate] || { meals: [], workoutSessions: [] };
    
    // 1. Determine Day Type
    let currentDayType: 'training' | 'rest' = 'rest';
    let dayTypeSource: 'manual' | 'auto' | 'session' = 'auto';
    
    if (sessionDayType) {
      currentDayType = sessionDayType;
      dayTypeSource = 'session';
    } else {
      const hasWorkout = dayData.workoutSessions && dayData.workoutSessions.filter(s => !s.deleted).length > 0;
      currentDayType = hasWorkout ? 'training' : 'rest';
      dayTypeSource = 'auto';
    }

    // 2. Determine Phase
    let currentPhase = 0;
    let phaseSource: 'manual' | 'auto' = 'auto';
    
    if (settings.manualPhase !== undefined) {
      currentPhase = settings.manualPhase;
      phaseSource = 'manual';
    } else {
      const start = new Date(settings.startDate).getTime();
      const now = new Date(selectedDate).getTime();
      const diffWeeks = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
      currentPhase = Math.max(0, Math.min(diffWeeks, settings.cutPhases.length - 1));
    }

    // 3. Get Base Goal
    let baseGoal: MacroGrams = { protein: 0, carbs: 0, fat: 0 };
    
    if (settings.mode === 'standard') {
      baseGoal = currentDayType === 'training' ? settings.standard.trainingDay : settings.standard.restDay;
    } else if (settings.mode === 'carb-cycling') {
      baseGoal = currentDayType === 'training' ? settings.carbCycling.trainingDay : settings.carbCycling.restDay;
    } else if (settings.mode === 'cut-phases') {
      const phaseConfig = settings.cutPhases[currentPhase] || settings.cutPhases[0] || { trainingDay: { protein: 0, carbs: 0, fat: 0 }, restDay: { protein: 0, carbs: 0, fat: 0 } };
      baseGoal = currentDayType === 'training' ? phaseConfig.trainingDay : phaseConfig.restDay;
    }

    // Ensure baseGoal has values (fallback to standard if something went wrong)
    if (baseGoal.protein === 0 && baseGoal.carbs === 0 && baseGoal.fat === 0) {
      const fallback = settings.standard || initialData.nutritionSettings.standard;
      baseGoal = currentDayType === 'training' ? fallback.trainingDay : fallback.restDay;
    }

    // 4. Dynamic Goal (Exercise Compensation)
    const exerciseBurn = (dayData.workoutSessions || []).reduce((sum, s) => sum + (s.calories || 0), 0);
    // Simple compensation: add extra carbs for exercise burn (4kcal/g)
    const extraCarbs = Math.round(exerciseBurn / 4);
    const dynamicGoal: MacroGrams = {
      ...baseGoal,
      carbs: baseGoal.carbs + extraCarbs
    };

    // 5. Consumed
    const consumed: MacroGrams = (dayData.meals || []).filter(m => !m.deleted).reduce((acc, meal) => ({
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fat: acc.fat + (meal.fat || 0)
    }), { protein: 0, carbs: 0, fat: 0 });

    // 6. Remaining
    const remaining: MacroGrams = {
      protein: dynamicGoal.protein - consumed.protein,
      carbs: dynamicGoal.carbs - consumed.carbs,
      fat: dynamicGoal.fat - consumed.fat
    };

    // 7. Calories
    const calories = {
      baseGoal: calcCalories(baseGoal.protein, baseGoal.carbs, baseGoal.fat),
      dynamicGoal: calcCalories(dynamicGoal.protein, dynamicGoal.carbs, dynamicGoal.fat),
      consumed: calcCalories(consumed.protein, consumed.carbs, consumed.fat),
      remaining: calcCalories(remaining.protein, remaining.carbs, remaining.fat)
    };

    // 8. Percentage
    const getPct = (cur: number, goal: number) => goal > 0 ? Math.round((cur / goal) * 100) : 0;
    const percentage = {
      protein: getPct(consumed.protein, dynamicGoal.protein),
      carbs: getPct(consumed.carbs, dynamicGoal.carbs),
      fat: getPct(consumed.fat, dynamicGoal.fat),
      calories: getPct(calories.consumed, calories.dynamicGoal)
    };

    return {
      baseGoal,
      dynamicGoal,
      consumed,
      remaining,
      calories,
      percentage,
      metadata: {
        currentDayType,
        currentPhase,
        dayTypeSource,
        phaseSource
      }
    };
  }, [appData.nutritionSettings, appData.days, selectedDate, sessionDayType]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Real-time Sync Listener
  useEffect(() => {
    if (!user) return;

    // 1. Listen to Profile/Settings
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data();
        isInternalUpdate.current = true;
        setAppData(prev => {
          // Preserve local sync mode
          const localMode = prev.syncSettings.mode;
          
          // Deep merge remote data into local state
          const merged = {
            ...prev,
            ...remoteData,
            profile: {
              ...prev.profile,
              ...(remoteData.profile || {})
            },
            syncSettings: {
              ...prev.syncSettings,
              ...(remoteData.settings || {}),
              mode: localMode // Always keep local mode
            }
          };
          
          const migrated = migrateData(merged);
          return migrated;
        });
        setIsFirstSyncComplete(true);
        setTimeout(() => { isInternalUpdate.current = false; }, 100);
      } else {
        // If document doesn't exist, this is the first sync
        setIsFirstSyncComplete(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // 2. Listen to Days
    const daysColRef = collection(db, 'users', user.uid, 'days');
    const unsubscribeDays = onSnapshot(daysColRef, (snapshot) => {
      const remoteDays: { [key: string]: DayData } = {};
      snapshot.docs.forEach(doc => {
        remoteDays[doc.id] = doc.data() as DayData;
      });

      if (Object.keys(remoteDays).length > 0) {
        isInternalUpdate.current = true;
        setAppData(prev => {
          const newDays = { ...prev.days };
          Object.entries(remoteDays).forEach(([date, remoteDay]) => {
            if (!newDays[date]) {
              newDays[date] = remoteDay;
            } else {
              // 1. Merge Meals using updatedAt
              const localMeals = newDays[date].meals || [];
              const remoteMeals = remoteDay.meals || [];
              const mealMap = new Map<string, CustomMeal>();
              
              // Add local meals to map
              localMeals.forEach(m => mealMap.set(m.id, m));
              
              // Merge remote meals: newer updatedAt wins
              remoteMeals.forEach(rm => {
                const lm = mealMap.get(rm.id);
                if (!lm || (rm.updatedAt || 0) > (lm.updatedAt || 0)) {
                  mealMap.set(rm.id, rm);
                }
              });
              const now = Date.now();
              const archiveThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days
              const cleanThreshold = 180 * 24 * 60 * 60 * 1000; // 180 days (90 days after archive)

              // 2. Merge Workouts using updatedAt
              const localWorkouts = newDays[date].workoutSessions || [];
              const remoteWorkouts = remoteDay.workoutSessions || [];
              const workoutMap = new Map<string, WorkoutSession>();
              
              localWorkouts.forEach(w => workoutMap.set(w.id, w));
              remoteWorkouts.forEach(rw => {
                const lw = workoutMap.get(rw.id);
                if (!lw || (rw.updatedAt || 0) > (lw.updatedAt || 0)) {
                  workoutMap.set(rw.id, rw);
                }
              });

              // Helper for archiving and cleaning
              const processItems = <T extends { id: string; updatedAt?: number; deleted?: boolean; archived?: boolean }>(items: T[]): T[] => {
                return items
                  .map(item => {
                    // Archive if older than 90 days
                    if (!item.archived && (now - (item.updatedAt || 0) > archiveThreshold)) {
                      return { ...item, archived: true, updatedAt: now };
                    }
                    return item;
                  })
                  .filter(item => {
                    // Clean if archived AND deleted AND very old (180 days total from last update)
                    if (item.archived && item.deleted && (now - (item.updatedAt || 0) > cleanThreshold)) {
                      return false;
                    }
                    return true;
                  });
              };

              const mergedMeals = processItems(Array.from(mealMap.values()) as CustomMeal[]);
              const mergedWorkouts = processItems(Array.from(workoutMap.values()) as WorkoutSession[]);

              newDays[date] = {
                ...newDays[date],
                ...remoteDay,
                meals: mergedMeals,
                workoutSessions: mergedWorkouts,
                water: Math.max(newDays[date].water || 0, remoteDay.water || 0),
                steps: Math.max(newDays[date].steps || 0, remoteDay.steps || 0),
                weight: remoteDay.weight || newDays[date].weight,
                bodyFat: remoteDay.bodyFat || newDays[date].bodyFat
              };
            }
          });
          return { ...prev, days: newDays };
        });
        setTimeout(() => { isInternalUpdate.current = false; }, 100);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/days`);
    });

    return () => {
      unsubscribeUser();
      unsubscribeDays();
    };
  }, [user]);

  // Auto-Save to Firestore
  useEffect(() => {
    // CRITICAL: Don't auto-save until we've pulled the latest data from cloud
    // This prevents a fresh device from overwriting cloud data with defaults
    if (!user || isInternalUpdate.current || !isFirstSyncComplete) return;

    const saveToFirestore = async () => {
      try {
        const { mode } = appData.syncSettings;

        // 1. Save Profile/Settings
        const userDocRef = doc(db, 'users', user.uid);
        const { days, ...profileData } = appData;
        
        // Always save profile and settings to cloud so they sync across devices
        // The 'mode' only controls whether this device is the "Master" for global settings
        // But we still want to push changes made on this device.
        await setDoc(userDocRef, {
          ...profileData,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 2. Save Days
        if (appData.days[selectedDate]) {
          const dayDocRef = doc(db, 'users', user.uid, 'days', selectedDate);
          await setDoc(dayDocRef, {
            ...appData.days[selectedDate],
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };

    const timeoutId = setTimeout(saveToFirestore, 2000); // Increased debounce to be safer
    return () => clearTimeout(timeoutId);
  }, [appData, user, selectedDate, isFirstSyncComplete]);

  useEffect(() => {
    localStorage.setItem('utopia_data', JSON.stringify(appData));
  }, [appData]);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const calculateBMR = (profile: Profile) => {
    if (profile.useCustomBMR) return profile.customBMR;
    // Mifflin-St Jeor Equation
    const { gender, age, height, weight } = profile;
    const base = (10 * weight) + (6.25 * height) - (5 * age);
    return gender === 'male' ? base + 5 : base - 161;
  };

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || key;
  };

  const mergeData = (incomingData: any) => {
    console.log("Merging incoming data. Incoming version:", incomingData.version || 1);
    const migratedIncoming = migrateData(incomingData);
    setAppData(prev => {
      // If current device is PC, merge incoming data (from Mobile)
      if (prev.syncSettings.mode === 'pc') {
        const mergedDays = { ...prev.days };
        
        Object.entries(migratedIncoming.days).forEach(([date, dayData]) => {
          if (!mergedDays[date]) {
            mergedDays[date] = dayData;
          } else {
            // Merge meals by ID
            const existingMealIds = new Set(mergedDays[date].meals.map(m => m.id));
            const newMeals = dayData.meals.filter(m => !existingMealIds.has(m.id));
            
            // Merge workouts by ID
            const existingWorkoutIds = new Set(mergedDays[date].workoutSessions.map(w => w.id));
            const newWorkouts = dayData.workoutSessions.filter(w => !existingWorkoutIds.has(w.id));

            mergedDays[date] = {
              ...mergedDays[date],
              meals: [...mergedDays[date].meals, ...newMeals],
              workoutSessions: [...mergedDays[date].workoutSessions, ...newWorkouts],
              water: Math.max(mergedDays[date].water, dayData.water || 0),
              steps: Math.max(mergedDays[date].steps, dayData.steps || 0),
              weight: dayData.weight || mergedDays[date].weight,
              bodyFat: dayData.bodyFat || mergedDays[date].bodyFat
            };
          }
        });

        return {
          ...prev,
          days: mergedDays,
          syncSettings: {
            ...prev.syncSettings,
            lastSync: new Date().toISOString()
          }
        };
      } else {
        // If current device is Mobile, overwrite with incoming data (from PC)
        return {
          ...migratedIncoming,
          syncSettings: {
            ...prev.syncSettings, // Keep local sync mode
            lastSync: new Date().toISOString()
          }
        };
      }
    });
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const syncWithGist = async (silent: boolean = false) => {
    const { githubToken, gistId, mode } = appData.syncSettings;
    if (!githubToken) {
      if (!silent) showToast(t('enterToken'), 'error');
      return;
    }

    try {
      let currentGistId = gistId;
      let remoteData: AppData | null = null;

      if (!currentGistId) {
        if (silent) return;
        // Create new Gist if not exists (only makes sense in PC mode or if starting fresh)
        const newGistId = await githubService.createGist(githubToken, appData);
        if (newGistId) {
          currentGistId = newGistId;
          setAppData({
            ...appData,
            syncSettings: { ...appData.syncSettings, gistId: newGistId }
          });
          showToast(t('gistCreateSuccess'));
        } else {
          throw new Error('Gist creation failed. Check your token permissions (gist scope required).');
        }
      } else {
        // Fetch existing Gist
        remoteData = await githubService.fetchGist(githubToken, currentGistId);
        if (!remoteData && !silent) {
          throw new Error('Failed to fetch data from Gist. Please check your Gist ID and Token.');
        }
      }

      if (remoteData) {
        const migratedRemote = migrateData(remoteData);
        let updatedData: AppData;

        if (mode === 'pc') {
          // PC Master: Pull remote (mobile inputs) -> Merge -> Push back
          // We keep our local profile/settings and only merge 'days' from remote
          const mergedDays = { ...appData.days };
          Object.entries(migratedRemote.days).forEach(([date, dayData]) => {
            const remoteDay = dayData as any;
            if (!mergedDays[date]) {
              mergedDays[date] = remoteDay;
            } else {
              // Merge meals by ID
              const existingMealIds = new Set(mergedDays[date].meals.map(m => m.id));
              const newMeals = (remoteDay.meals || []).filter((m: any) => !existingMealIds.has(m.id));
              
              // Merge workouts by ID
              const existingWorkoutIds = new Set(mergedDays[date].workoutSessions.map(w => w.id));
              const newWorkouts = (remoteDay.workoutSessions || []).filter((w: any) => !existingWorkoutIds.has(w.id));

              mergedDays[date] = {
                ...mergedDays[date],
                meals: [...mergedDays[date].meals, ...newMeals],
                workoutSessions: [...mergedDays[date].workoutSessions, ...newWorkouts],
                water: Math.max(mergedDays[date].water || 0, remoteDay.water || 0),
                steps: Math.max(mergedDays[date].steps || 0, remoteDay.steps || 0),
                weight: remoteDay.weight || mergedDays[date].weight,
                bodyFat: remoteDay.bodyFat || mergedDays[date].bodyFat
              };
            }
          });

          updatedData = {
            ...appData,
            days: mergedDays,
            syncSettings: { ...appData.syncSettings, lastSync: new Date().toISOString() }
          };
        } else {
          // Mobile Input: Pull remote (PC master) -> Append local new items -> Push back
          // We take the remote profile/settings as master
          const mergedDays = { ...migratedRemote.days };
          Object.entries(appData.days).forEach(([date, dayData]) => {
            const localDay = dayData as any;
            if (!mergedDays[date]) {
              mergedDays[date] = localDay;
            } else {
              const existingMealIds = new Set(mergedDays[date].meals.map(m => m.id));
              const newMeals = (localDay.meals || []).filter((m: any) => !existingMealIds.has(m.id));
              const existingWorkoutIds = new Set(mergedDays[date].workoutSessions.map(w => w.id));
              const newWorkouts = (localDay.workoutSessions || []).filter((w: any) => !existingWorkoutIds.has(w.id));

              mergedDays[date] = {
                ...mergedDays[date],
                meals: [...mergedDays[date].meals, ...newMeals],
                workoutSessions: [...mergedDays[date].workoutSessions, ...newWorkouts],
                water: Math.max(mergedDays[date].water || 0, localDay.water || 0),
                steps: Math.max(mergedDays[date].steps || 0, localDay.steps || 0),
                weight: localDay.weight || mergedDays[date].weight,
                bodyFat: localDay.bodyFat || mergedDays[date].bodyFat
              };
            }
          });

          updatedData = {
            ...migratedRemote,
            days: mergedDays,
            syncSettings: { ...appData.syncSettings, lastSync: new Date().toISOString() }
          };
        }

        const success = await githubService.updateGist(githubToken, currentGistId, updatedData);
        if (success) {
          setAppData(updatedData);
          if (!silent) showToast(t('gistSyncSuccess'));
        } else {
          throw new Error('Failed to update Gist. Check your internet connection or token permissions.');
        }
      }
    } catch (error: any) {
      console.error('Gist Sync Error:', error);
      if (!silent) showToast(error.message || t('gistSyncError'), 'error');
      throw error; // Re-throw so caller can handle UI state
    }
  };

  useEffect(() => {
    const { githubToken, gistId, mode } = appData.syncSettings;
    if (githubToken && gistId) {
      // 1. Auto-Pull on mount or config change
      syncWithGist(true).catch(() => {});

      // 2. Auto-Push on visibility change
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          syncWithGist(true).catch(() => {});
        } else if (document.visibilityState === 'visible') {
          syncWithGist(true).catch(() => {});
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [appData.syncSettings.githubToken, appData.syncSettings.gistId, appData.syncSettings.mode]);

  const pushAllToCloud = async () => {
    if (!user) {
      showToast(t('pleaseLogin' as any) || 'Please login to sync to cloud', 'error');
      return;
    }
    await saveAppDataToCloud(appData);
  };

  const saveAppDataToCloud = async (data: AppData) => {
    if (!user) return;
    
    // Helper to recursively replace undefined with null for Firestore compatibility
    const cleanForFirestore = (obj: any): any => {
      if (obj === undefined) return null;
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(cleanForFirestore);
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, cleanForFirestore(v)])
      );
    };

    try {
      const cleanData = cleanForFirestore(data);
      const { days, ...profileData } = cleanData;
      
      // Push profile & settings
      await setDoc(doc(db, "users", user.uid), {
        ...profileData,
        foodLibrary: cleanData.foodLibrary || [],
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Push all days
      const promises = Object.entries(cleanData.days || {}).map(([date, dayData]) => {
        return setDoc(doc(db, "users", user.uid, "days", date), {
          ...(dayData as any),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error("Save app data error:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/save`);
    }
  };

  const signIn = async () => {
    try {
      await signInWithGoogle();
      showToast(t('syncSuccess'));
    } catch (error) {
      showToast(t('syncError'), 'error');
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
      showToast(t('logoutSuccess' as any) || 'Logged out');
    } catch (error) {
      showToast(t('syncError'), 'error');
    }
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, theme, setTheme, t, appData, setAppData, calculateBMR, mergeData, syncWithGist, showToast,
      signIn, logout, pushAllToCloud, saveAppDataToCloud, user, isAuthReady,
      selectedDate, setSelectedDate, activeTab, setActiveTab,
      resolvedNutritionToday, sessionDayType, setSessionDayType
    }}>
      {children}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[200] -translate-x-1/2 px-4 w-full max-w-xs pointer-events-none">
          <div className={`rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-md flex items-center gap-3 ${
            toast.type === 'error' ? 'bg-red-500/80' : 'bg-green-500/80'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span className="flex-1">{toast.message}</span>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
