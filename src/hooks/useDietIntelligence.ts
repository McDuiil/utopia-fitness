import { useMemo } from 'react';
import { useAppSelector } from './useAppSelector';
import { SuggestedMeal, CustomMeal, AppData, ResolvedNutritionToday } from '../types';
import { getTodayStr } from '../lib/utils';

export function useDietIntelligence() {
  const appData = useAppSelector(s => s.appData);
  const resolvedNutritionToday = useAppSelector(s => s.resolvedNutritionToday);
  const dietPlans = appData.dietPlans;
  const activeDietPlanId = appData.activeDietPlanId;
  const nutritionSettings = appData.nutritionSettings;
  const days = appData.days;

  /**
   * Source 1: Official Suggestions (from Active Diet Plan)
   */
  const officialSuggestions = useMemo(() => {
    const activePlan = dietPlans.find(p => p.id === activeDietPlanId) || dietPlans[0];
    if (!activePlan) return [];

    const mode = nutritionSettings.mode;
    const { currentPhase, currentDayType } = resolvedNutritionToday.metadata;

    // Filter by Phase (mostly for cut-phases, but can apply to others if templates exist)
    const template = activePlan.templates.find(t => t.phase === currentPhase) || activePlan.templates[0];
    if (!template) return [];

    return currentDayType === 'training' ? template.trainingMeals : template.restMeals;
  }, [dietPlans, activeDietPlanId, nutritionSettings.mode, resolvedNutritionToday.metadata]);

  /**
   * Source 2: My History (from appData.days, last 14 days)
   */
  const historySuggestions = useMemo(() => {
    const today = getTodayStr();
    const todayDate = new Date(today);
    const fourteenDaysAgo = new Date(todayDate);
    fourteenDaysAgo.setDate(todayDate.getDate() - 14);

    const activeMode = nutritionSettings.mode;
    const activeCarbDay = resolvedNutritionToday.metadata.currentCarbDay;
    const activeDayType = resolvedNutritionToday.metadata.currentDayType;

    // Extract all meals from last 14 days
    const allHistoryMeals: CustomMeal[] = [];
    const mealFrequency: Record<string, number> = {};

    Object.values(days).forEach((day: any) => {
      const dayDate = new Date(day.date);
      if (dayDate < fourteenDaysAgo || dayDate >= todayDate) return;

      // 1. 模式与日类型强隔离 + 兼容性判定 (Strict Isolation with Compatibility)
      const dayMode = day.mode;
      const dayCarbDay = day.manualCarbDay;
      const dayType = day.manualDayType;
      
      const isLegacy = !dayMode; // 无 mode 标签即判定为旧数据

      // 基本准入判定
      let isEligibleDay = false;
      if (dayMode === activeMode) {
        // 模式匹配：严格检查日类型
        if (activeMode === 'carb-cycling') {
          if (dayCarbDay === activeCarbDay) isEligibleDay = true;
        } else if (activeMode === 'cut-phases') {
          if (dayType === activeDayType) isEligibleDay = true;
        } else {
          isEligibleDay = true;
        }
      } else if (isLegacy) {
        // 兼容模式：旧数据准入候选池，后续进行物理数值判定
        isEligibleDay = true;
      }

      if (!isEligibleDay) return;

      if (day.meals && day.meals.length > 0) {
        const activeMeals = day.meals.filter((m: CustomMeal) => !m.deleted);
        
        activeMeals.forEach((m: CustomMeal) => {
          // 2. 旧数据兜底判定 (Legacy Fallback Filtering)
          if (isLegacy) {
            if (activeMode === 'carb-cycling') {
              const c = m.carbs;
              // 低碳日：借调碳水 < 20g 的记录
              if (activeCarbDay === 'low' && c >= 20) return;
              // 中碳日：借调碳水在 20g-80g 之间的记录
              if (activeCarbDay === 'medium' && (c < 20 || c > 80)) return;
              // 高碳日：借调碳水 > 80g 的记录
              if (activeCarbDay === 'high' && c <= 80) return;
            } else if (activeMode === 'cut-phases') {
              // 渐降模式兜底：休息日强制借调低碳餐
              if (activeDayType === 'rest' && m.carbs > 25) return;
            }
          }

          // 不进行任何修正，原样提取历史数据
          allHistoryMeals.push(m);
          mealFrequency[m.name] = (mealFrequency[m.name] || 0) + 1;
        });
      }
    });

    // 按频次与新鲜度去重排序
    const uniqueMealsMap = new Map<string, CustomMeal>();
    allHistoryMeals
      .sort((a, b) => {
        const freqA = mealFrequency[a.name] || 0;
        const freqB = mealFrequency[b.name] || 0;
        if (freqB !== freqA) return freqB - freqA;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      })
      .forEach(m => {
        if (!uniqueMealsMap.has(m.name)) {
          uniqueMealsMap.set(m.name, m);
        }
      });

    // 3. 增强排序逻辑 (Enhanced Dual-Weight Sort)
    const sortedUniqueMeals = Array.from(uniqueMealsMap.values()).sort((a, b) => {
      // 优先级 1: 实时置顶 (最近 30 分钟内操作过的条目绝对置顶)
      const now = Date.now();
      const halfHour = 30 * 60 * 1000;
      const isFreshA = (now - (a.updatedAt || 0)) < halfHour;
      const isFreshB = (now - (b.updatedAt || 0)) < halfHour;
      if (isFreshA && !isFreshB) return -1;
      if (!isFreshA && isFreshB) return 1;

      // 优先级 2: 时间序 (Time Order 00:00 -> 23:59)
      if (a.time && b.time && a.time !== b.time) {
        return a.time.localeCompare(b.time);
      }

      // 优先级 3: 更新时间
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    // 智能映射 (深度克隆且保持原样)
    return sortedUniqueMeals
      .slice(0, 15)
      .map(m => ({
        id: `hist-${m.id}`,
        name: m.name,
        time: m.time,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        ingredients: m.ingredients ? JSON.parse(JSON.stringify(m.ingredients)) : []
      } as SuggestedMeal));
  }, [days, nutritionSettings.mode, resolvedNutritionToday.metadata]);

  return {
    officialSuggestions,
    historySuggestions,
    currentStatus: {
      mode: nutritionSettings.mode,
      phase: resolvedNutritionToday.metadata.currentPhase,
      dayType: resolvedNutritionToday.metadata.currentDayType,
      carbDay: resolvedNutritionToday.metadata.currentCarbDay
    }
  };
}
