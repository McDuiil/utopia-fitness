import { LayoutDashboard, Dumbbell, Utensils, User } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import { useApp } from "@/src/context/AppContext";

type Tab = "dashboard" | "workouts" | "nutrition" | "profile";

interface NavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const { t } = useApp();
  const tabs = [
    { id: "dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { id: "workouts", icon: Dumbbell, label: t("workouts") },
    { id: "nutrition", icon: Utensils, label: t("nutrition") },
    { id: "profile", icon: User, label: t("profile") },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2">
      <div className="glass-weak flex items-center justify-around p-1.5 shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-full py-3 active:scale-95 transition-transform duration-75",
                isActive ? "text-white" : "text-white/30 hover:text-white/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-full bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                  transition={{ type: "tween", ease: "circOut", duration: 0.15 }}
                />
              )}
              <Icon size={22} className={cn("z-10 transition-colors duration-150", isActive && "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
              <span className={cn(
                "z-10 text-[9px] font-bold uppercase tracking-widest transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-40"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
