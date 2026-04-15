import { useContext, useMemo } from "react";
import { AppContext, AppContextType } from "../context/AppContext";

/**
 * 轻量级 Selector 钩子
 * 用于订阅 AppData 中的特定字段，减少不必要的重渲染。
 * 
 * 规则：
 * 1. Selector 必须返回稳定值（原始类型），避免返回新对象。
 * 2. 禁止在 Widget 中直接使用 useApp() 获取 appData。
 */
export function useAppSelector<T>(selector: (state: AppContextType) => T): T {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppSelector must be used within an AppProvider");
  }
  
  return useMemo(() => {
    return selector(context);
  }, [selector, context]);
}
