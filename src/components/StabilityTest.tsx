import React, { useState } from "react";
import GlassCard from "./GlassCard";
import { AlertOctagon, RefreshCw, Database, Zap, Bug } from "lucide-react";
import { useAppSelector } from "../hooks/useAppSelector";

const StabilityTest = () => {
  const appData = useAppSelector(s => s.appData);
  const setAppData = useAppSelector(s => s.setAppData);
  const [isChaosMode, setIsChaosMode] = useState(false);

  // 1. 模拟组件崩溃 (Test 1)
  const triggerWidgetError = () => {
    // We'll use a custom event or just tell the user to double click the weight icon
    alert("请双击 Dashboard 中的『体重』图标触发局部崩溃测试");
  };

  // 2. 模拟全局崩溃 (Test 2)
  const triggerGlobalCrash = () => {
    (window as any).__TRIGGER_GLOBAL_CRASH__ = true;
    setAppData({ ...appData }); // Trigger re-render
  };

  // 3. 模拟异步 Reject
  const triggerAsyncReject = () => {
    Promise.reject(new Error("Manual Async Rejection Test"));
  };

  // 3. 模拟注入脏数据
  const injectDirtyData = () => {
    // 尝试将 days 设置为非法类型
    const corruptedData = { ...appData, days: "I am a string now" as any };
    setAppData(corruptedData);
  };

  // 4. 模拟本地存储损坏
  const corruptLocalStorage = () => {
    localStorage.setItem('utopia_data', '{ corrupted_json: [missing_bracket ');
    window.location.reload();
  };

  if (isChaosMode) {
    throw new Error("Simulated Chaos Render Error");
  }

  return (
    <GlassCard className="m-4 space-y-4 border-red-500/20 bg-red-500/5">
      <div className="flex items-center gap-2 text-red-400">
        <Bug size={18} />
        <h3 className="text-sm font-black uppercase tracking-widest">稳定性压力测试</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={triggerWidgetError}
          className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 text-[10px] font-bold text-white/60 hover:bg-red-500/20 transition-colors"
        >
          <Zap size={14} />
          测试 1: 局部崩溃
        </button>
        
        <button 
          onClick={triggerGlobalCrash}
          className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 text-[10px] font-bold text-white/60 hover:bg-red-700/40 transition-colors"
        >
          <AlertOctagon size={14} />
          测试 2: 全局崩溃
        </button>

        <button 
          onClick={triggerAsyncReject}
          className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 text-[10px] font-bold text-white/60 hover:bg-orange-500/20 transition-colors"
        >
          <AlertOctagon size={14} />
          异步 Reject
        </button>

        <button 
          onClick={injectDirtyData}
          className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 text-[10px] font-bold text-white/60 hover:bg-yellow-500/20 transition-colors"
        >
          <Database size={14} />
          注入脏数据
        </button>

        <button 
          onClick={corruptLocalStorage}
          className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 text-[10px] font-bold text-white/60 hover:bg-purple-500/20 transition-colors"
        >
          <RefreshCw size={14} />
          损坏存储并刷新
        </button>
      </div>
      
      <p className="text-[8px] text-white/20 leading-tight">
        * 此模块仅用于验证稳定性架构。触发后请通过 DebugLogger 查看捕获情况，或使用全局重置功能恢复。
      </p>
    </GlassCard>
  );
};

export default StabilityTest;
