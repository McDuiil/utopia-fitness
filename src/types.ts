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
  n: string; // name
  a: string; // amount
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
  updatedAt?: number;
  deleted?: boolean;
  archived?: boolean;
}

export interface MacroGrams {
  protein: number;
  carbs: number;
  fat: number;
}

export interface DayTypeConfig {
  trainingDay: MacroGrams;
  restDay: MacroGrams;
}

export interface NutritionSettings {
  mode: 'standard' | 'carb-cycling' | 'cut-phases';
  startDate: string;
  manualPhase?: number;
  standard: DayTypeConfig;
  carbCycling: DayTypeConfig;
  cutPhases: DayTypeConfig[];
}

export interface ResolvedNutritionToday {
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
    currentDayType: 'training' | 'rest';
    currentPhase: number;
    dayTypeSource: 'manual' | 'auto' | 'session';
    phaseSource: 'manual' | 'auto';
  };
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

export interface DayData {
  date: string;
  steps: number;
  water: number;
  weight?: number;
  bodyFat?: number;
  meals: CustomMeal[];
  workoutSessions: WorkoutSession[];
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

export interface DietTemplate {
  phase: number;
  trainingMeals: SuggestedMeal[];
  restMeals: SuggestedMeal[];
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
  categoryImages: { [key: string]: string };
  syncSettings: SyncSettings;
  activeWorkoutSession?: WorkoutSession | null;
}

export interface Exercise {
  id: string;
  name: { en: string; zh: string };
  part: string;
  equipment: string;
  image: string;
}
