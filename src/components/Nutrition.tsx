import React, { useState, useMemo } from "react";
import { Plus, Clock, ChevronRight, PieChart, Utensils, X, Calendar, Zap, Settings, Save, RefreshCw, Lock, Unlock, Search, Info, FileUp, Sparkles, Check, Trash2, Edit2, Minus } from "lucide-react";
import GlassCard from "./GlassCard";
import { useApp } from "@/src/context/AppContext";
import { CustomMeal, NutritionSettings, MacroGrams, DayTypeConfig, FoodItem, DietTemplate, SuggestedMeal, Ingredient, DietPlan } from "@/src/types";
import { motion, AnimatePresence } from "motion/react";
import { getTodayStr, calcCalories } from "../lib/utils";

export default function Nutrition() {
  const { t, language, appData, setAppData, resolvedNutritionToday, sessionDayType, showToast } = useApp();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  // --- 核心重写逻辑：智能解析导入方案 ---
  const handleImportPlan = () => {
    if (!importText.trim()) return;

    try {
      const lines = importText.split('\n');
      const templates: DietTemplate[] = [];
      
      let currentPhaseIdx = -1;
      let currentDayType = ""; 
      let currentMeal: SuggestedMeal | null = null;

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // 1. 识别阶段 (例如：【阶段 1 | 训练日】)
        const phaseMatch = trimmedLine.match(/【阶段\s*(\d+)/);
        if (phaseMatch) {
          const phaseNum = parseInt(phaseMatch[1]);
          currentPhaseIdx = phaseNum - 1;
          if (!templates[currentPhaseIdx]) {
            templates[currentPhaseIdx] = { phase: phaseNum, days: {} };
          }
        }

        // 2. 识别日型关键字
        if (trimmedLine.includes("训练")) currentDayType = "training";
        else if (trimmedLine.includes("休息")) currentDayType = "rest";
        else if (trimmedLine.includes("高碳")) currentDayType = "high";
        else if (trimmedLine.includes("中碳")) currentDayType = "medium";
        else if (trimmedLine.includes("低碳")) currentDayType = "low";

        if (currentPhaseIdx === -1) return;

        // 初始化当前阶段的当前日型数据结构
        if (currentDayType && !templates[currentPhaseIdx].days[currentDayType]) {
          templates[currentPhaseIdx].days[currentDayType] = {
            goal: { protein: 0, carbs: 0, fat: 0 },
            meals: []
          };
        }

        // 3. 识别目标宏量营养素 (P:130 C:180 F:45)
        const goalMatch = trimmedLine.match(/P[:：]\s*([\d.]+).*?C[:：]\s*([\d.]+).*?F[:：]\s*([\d.]+)/i);
        if (goalMatch && currentDayType) {
          templates[currentPhaseIdx].days[currentDayType].goal = {
            protein: parseFloat(goalMatch[1]),
            carbs: parseFloat(goalMatch[2]),
            fat: parseFloat(goalMatch[3])
          };
        }

        // 4. 识别餐食信息 (标题 + 时间 + 宏量)
        const mealMatch = trimmedLine.match(/^(.*?)\s*\(.*?\)\s*\|\s*P[:：]\s*([\d.]+)\s*C[:：]\s*([\d.]+)\s*F[:：]\s*([\d.]+)/i);
        if (mealMatch && currentDayType) {
          const [_, name, p, c, f] = mealMatch;
          const timeMatch = trimmedLine.match(/\((.*?)\)/);
          currentMeal = {
            id: Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            time: timeMatch ? timeMatch[1] : "08:00",
            protein: parseFloat(p),
            carbs: parseFloat(c),
            fat: parseFloat(f),
            ingredients: []
          };
          templates[currentPhaseIdx].days[currentDayType].meals.push(currentMeal);
        }

        // 5. 识别配料清单
        if (trimmedLine.startsWith("配料") && currentMeal) {
          const ingredientsPart = trimmedLine.split(/[:：]/)[1];
          if (ingredientsPart) {
            const items = ingredientsPart.split(/[,，]/);
            currentMeal.ingredients = items.map(item => {
              const parts = item.trim().split(/\s+/);
              return {
                n: parts[0] || "",
                a: parts.slice(1).join(" ") || ""
              };
            });
          }
        }
      });

      const finalTemplates = templates.filter(t => t !== undefined);
      if (finalTemplates.length === 0) throw new Error("Format error");

      const newPlan: DietPlan = {
        id: Date.now().toString(),
        name: `新方案 ${new Date().toLocaleDateString()}`,
        templates: finalTemplates
      };

      setAppData({
        ...appData,
        dietPlans: [...appData.dietPlans, newPlan],
        activeDietPlanId: newPlan.id
      });

      setShowImport(false);
      setImportText("");
      showToast("方案导入并解析成功！");
    } catch (error) {
      showToast("解析失败，请检查文本格式", "error");
    }
  };

  // 获取当前应显示的建议餐食
  const currentSuggestions = useMemo(() => {
    const activePlan = appData.dietPlans.find(p => p.id === appData.activeDietPlanId);
    if (!activePlan) return [];
    
    const phaseData = activePlan.templates.find(t => t.phase === resolvedNutritionToday.metadata.currentPhase);
    if (!phaseData) return [];

    // 优先级匹配：具体日型 > 训练/休息回退
    const type = resolvedNutritionToday.metadata.currentDayType;
    return phaseData.days[type]?.meals || phaseData.days['training']?.meals || [];
  }, [appData, resolvedNutritionToday]);

  return (
    <div className="p-4 space-y-6 pb-32">
      {/* 头部：模式切换与导入 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('nutrition')}</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
            Phase {resolvedNutritionToday.metadata.currentPhase} • {resolvedNutritionToday.metadata.currentDayType}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowImport(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all"
          >
            <FileUp size={20} className="text-blue-400" />
          </button>
        </div>
      </div>

      {/* 导入弹窗 */}
      <AnimatePresence>
        {showImport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <GlassCard className="w-full max-w-lg p-6 space-y-4 border-white/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-yellow-400" size={20} />
                  <h3 className="text-lg font-bold">导入饮食计划</h3>
                </div>
                <button onClick={() => setShowImport(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="在此粘贴文本，需包含：【阶段X】、日型关键字、P/C/F数值..."
                className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-mono focus:border-blue-500/50 outline-none transition-all"
              />
              <button
                onClick={handleImportPlan}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <Check size={18} />
                确认解析并应用
              </button>
            </GlassCard>
          </div>
        )}
      </AnimatePresence>

      {/* 建议餐食 Shelf */}
      {currentSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={14} className="text-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">建议餐食方案</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {currentSuggestions.map((meal) => (
              <GlassCard key={meal.id} className="min-w-[280px] p-4 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-white/90">{meal.name}</h4>
                    <div className="flex items-center gap-1 text-[10px] text-white/40 mt-1">
                      <Clock size={10} />
                      {meal.time}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-blue-400">{calcCalories(meal.protein, meal.carbs, meal.fat)} kcal</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-[8px] uppercase text-white/30">P</div>
                    <div className="text-xs font-bold">{meal.protein}g</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-[8px] uppercase text-white/30">C</div>
                    <div className="text-xs font-bold">{meal.carbs}g</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-[8px] uppercase text-white/30">F</div>
                    <div className="text-xs font-bold">{meal.fat}g</div>
                  </div>
                </div>
                {meal.ingredients.length > 0 && (
                  <div className="text-[10px] text-white/50 line-clamp-2 bg-black/20 p-2 rounded-lg">
                    {meal.ingredients.map(i => `${i.n}${i.a}`).join(", ")}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* 这里继续渲染你原有的“今日记录”列表和添加餐食按钮... */}
    </div>
  );
}
