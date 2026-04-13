import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  Language, Theme, AppData, Profile, DayData, CustomMeal, 
  WorkoutSession, ResolvedNutritionToday, NutritionSettings, 
  MacroGrams, DayTypeConfig, DietPlan, DietTemplate 
} from '../types';
import { translations } from '../lib/i18n';
import { getTodayStr, calcCalories } from '../lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, signInWithGoogle, logout as firebaseLogout, onAuthStateChanged, User } from '../firebase';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: keyof typeof translations.en) => string;
  appData: AppData;
  setAppData: (data: AppData) => void;
  calculateBMR: (profile: Profile) => number;
  showToast: (message: string, type?: 'success' | 'error') => void;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  user: User | null;
  isAuthReady: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  resolvedNutritionToday: ResolvedNutritionToday;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 初始化 AppData
  const [appData, setAppData] = useState<AppData>({
    version: 1,
    profile: {
      nickname: "User",
      avatar: "",
      gender: 'male',
      age: 25,
      height: 175,
      weight: 70,
      bodyFat: 15,
      goalWeight: 65,
      goalDeficit: 500,
      goalBodyFat: 12,
      useCustomBMR: false,
      customBMR: 1700
    },
    nutritionSettings: {
      mode: 'carb-cycling',
      startDate: getTodayStr(),
      standard: { protein: 150, carbs: 200, fat: 60, isAuto: true },
      carbCycling: { protein: 150, carbs: 200, fat: 60, isAuto: true },
      cutPhases: []
    },
    dietPlans: [],
    days: {},
    customExercises: [],
    foodLibrary: [],
    enabledWidgets: ['calories', 'macros', 'steps', 'water'],
    syncSettings: { mode: 'mobile' }
  });

  // 基础 BMR 计算
  const calculateBMR = (p: Profile) => {
    if (p.useCustomBMR) return p.customBMR;
    if (p.gender === 'male') {
      return 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
    }
    return 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  };

  // --- 核心逻辑：实时计算今日营养状态 ---
  const resolvedNutritionToday = useMemo((): ResolvedNutritionToday => {
    const dayData = appData.days[selectedDate] || { meals: [], workoutSessions: [] };
    
    // 1. 确定当前阶段 (Phase)
    const currentPhase = appData.nutritionSettings.manualPhase || 1;

    // 2. 确定当前日型 (DayType)
    // 优先级：手动指定 > 自动识别(是否有运动) > 默认休息
    let currentDayType = dayData.manualDayType || (dayData.workoutSessions?.length > 0 ? 'training' : 'rest');
    
    // 3. 从饮食方案中提取目标数值
    const activePlan = appData.dietPlans.find(p => p.id === appData.activeDietPlanId);
    const phaseTemplate = activePlan?.templates.find(t => t.phase === currentPhase);
    
    // 寻找匹配的目标，如果方案里没有对应的 key (比如没写'high')，则回退到基础设置
    const planGoal = phaseTemplate?.days?.[currentDayType]?.goal;
    const baseGoal = planGoal || (currentDayType === 'training' ? appData.nutritionSettings.standard : appData.nutritionSettings.standard);

    // 4. 计算已摄入
    const consumed = (dayData.meals || []).reduce((acc, meal) => ({
      protein: acc.protein + (Number(meal.protein) || 0),
      carbs: acc.carbs + (Number(meal.carbs) || 0),
      fat: acc.fat + (Number(meal.fat) || 0),
    }), { protein: 0, carbs: 0, fat: 0 });

    const consumedCals = calcCalories(consumed.protein, consumed.carbs, consumed.fat);
    const goalCals = calcCalories(baseGoal.protein, baseGoal.carbs, baseGoal.fat);

    return {
      ...consumed,
      baseGoal,
      dynamicGoal: baseGoal, 
      consumed,
      remaining: {
        protein: Math.max(0, baseGoal.protein - consumed.protein),
        carbs: Math.max(0, baseGoal.carbs - consumed.carbs),
        fat: Math.max(0, baseGoal.fat - consumed.fat),
      },
      calories: {
        baseGoal: goalCals,
        dynamicGoal: goalCals,
        consumed: consumedCals,
        remaining: Math.max(0, goalCals - consumedCals),
      },
      percentage: {
        protein: baseGoal.protein > 0 ? (consumed.protein / baseGoal.protein) * 100 : 0,
        carbs: baseGoal.carbs > 0 ? (consumed.carbs / baseGoal.carbs) * 100 : 0,
        fat: baseGoal.fat > 0 ? (consumed.fat / baseGoal.fat) * 100 : 0,
        calories: goalCals > 0 ? (consumedCals / goalCals) * 100 : 0,
      },
      metadata: {
        currentDayType,
        currentPhase,
        dayTypeSource: dayData.manualDayType ? 'manual' : (dayData.workoutSessions?.length > 0 ? 'session' : 'auto'),
        phaseSource: appData.nutritionSettings.manualPhase ? 'manual' : 'auto'
      },
      source: activePlan ? 'carb-cycling' : 'standard'
    };
  }, [appData, selectedDate]);

  // Toast 逻辑
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 认证监听
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await signInWithGoogle();
      showToast("登录成功");
    } catch (e) {
      showToast("登录失败", "error");
    }
  };

  const logout = async () => {
    await firebaseLogout();
    showToast("已退出登录");
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, theme, setTheme, t: (key) => translations[language][key] || key, 
      appData, setAppData, calculateBMR, showToast,
      signIn, logout, user, isAuthReady,
      selectedDate, setSelectedDate, activeTab, setActiveTab,
      resolvedNutritionToday
    }}>
      {children}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[200] -translate-x-1/2 px-4 w-full max-w-xs pointer-events-none">
          <div className={`rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-md flex items-center gap-3 ${
            toast.type === 'error' ? 'bg-red-500/80' : 'bg-green-500/80'
          }`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
