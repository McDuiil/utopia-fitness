export type Language = 'en' | 'zh';
export type Theme = 'dark' | 'light';

export interface Profile {
  nickname: string;
  avatar: string;
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  bodyFat: number;
  goalWeight: number;
  goalDeficit: number;
  goalBodyFat: number;
  useCustomBMR: boolean;
  customBMR: number;
  customCalorieGoal?: number;
}

export interface Ingredient {
  n: string; // 名称
  a: string; // 份量/数量
}

export interface CustomMeal {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  ingredients?: Ingredient[];
  updatedAt?: number;
  deleted?: boolean;
  archived?: boolean;
}

export interface MacroGrams {
  protein: number;
  carbs: number;
  fat: number;
}

// 基础营养设置的单项配置
export interface DayTypeConfig extends MacroGrams {
  isAuto: boolean;
}

// 饮食方案导入后的具体配置
export interface DayTypeData {
  goal: MacroGrams;
  meals: SuggestedMeal[];
}

export interface NutritionSettings {
  mode: 'standard' | 'carb-cycling' | 'cut-phases';
  startDate: string;
  manualPhase?: number;
  standard: DayTypeConfig;
  carbCycling: DayTypeConfig; // 基础配置
  cutPhases: DayTypeConfig[]; // 渐降阶段配置数组
}

export interface ResolvedNutritionToday extends MacroGrams {
  baseGoal: MacroGrams;
  dynamicGoal: MacroGrams;
  consumed: MacroGrams;
  remaining: MacroGrams;
  calories: {
    baseGoal: number;
    dynamicGoal: number;
    consumed: number;
    remaining: number;
  };
  percentage: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  metadata: {
    currentDayType: string; // 'training' | 'rest' | 'high' | 'medium' | 'low'
    currentPhase: number;
    dayTypeSource: 'manual' | 'auto' | 'session';
    phaseSource: 'manual' | 'auto';
  };
  source: 'standard' | 'carb-cycling' | 'cut-phases' | 'auto';
}

export interface Exercise {
  id: string;
  name: { en: string; zh: string };
  part: string;
  equipment: string;
  image: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  state: 'raw' | 'cooked';
  nutrientsPer100g: MacroGrams;
  userOverride: boolean;
  source: 'api' | 'local' | 'user';
}

export interface WorkoutSet {
  reps: number;
  weight: number;
  isPR: boolean;
}

export interface WorkoutSessionExercise {
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  startTime: string;
  endTime?: string;
  exercises: WorkoutSessionExercise[];
  calories: number;
  category?: string;
}

export interface DayData {
  date: string;
  steps: number;
  water: number;
  weight?: number;
  bodyFat?: number;
  meals: CustomMeal[];
  workoutSessions: WorkoutSession[];
  manualDayType?: 'training' | 'rest' | 'high' | 'medium' | 'low';
}

export interface SyncSettings {
  mode: 'pc' | 'mobile';
  lastSync?: string;
  githubToken?: string;
  gistId?: string;
}

export interface SuggestedMeal {
  id: string;
  name: string;
  time: string;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
}

// 核心重构：支持阶段+多日型
export interface DietTemplate {
  phase: number;
  name?: string;
  days: Record<string, DayTypeData>; 
}

export interface DietPlan {
  id: string;
  name: string;
  templates: DietTemplate[];
}

export interface AppData {
  version: number;
  profile: Profile;
  nutritionSettings: NutritionSettings;
  dietPlans: DietPlan[];
  activeDietPlanId?: string;
  days: { [date: string]: DayData };
  customExercises: Exercise[];
  foodLibrary: FoodItem[];
  customCategories?: string[];
  enabledWidgets: string[];
  syncSettings: SyncSettings;
}
