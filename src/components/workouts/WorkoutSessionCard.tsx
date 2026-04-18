import React, { useState, memo, useCallback } from "react";
import { Clock, Dumbbell, Play, X, Award, ChevronDown, ChevronUp, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import GlassCard from "../GlassCard";
import { WorkoutSession, Exercise } from "@/src/types";
import ExerciseItem from "./ExerciseItem";

interface WorkoutSessionCardProps {
  date: string;
  session: WorkoutSession;
  allExercises: Exercise[];
  language: 'en' | 'zh';
  t: (key: string) => string;
  onEdit: (date: string, session: WorkoutSession) => void;
  onDelete: (date: string, sessionId: string) => void;
  onStartPlanned: (date: string, session: WorkoutSession) => void;
}

const WorkoutSessionCard = memo(({ 
  date, 
  session, 
  allExercises, 
  language, 
  t, 
  onEdit, 
  onDelete, 
  onStartPlanned 
}: WorkoutSessionCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isPlanned = session.status === 'planned';

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(diff / 60000);
  };

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(prev => !prev);
  }, []);

  return (
    <motion.div
      layout
      id={`session-${session.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        layout: { duration: 0.3 }
      }}
      style={{ willChange: 'transform, opacity' }}
      className="w-full"
    >
      <GlassCard 
        className={`p-4 relative group transition-colors !overflow-visible ${
          isPlanned ? 'border-blue-500/20 bg-blue-500/5' : 'border-white/5 bg-white/[0.02]'
        } ${isExpanded ? 'ring-1 ring-blue-500/30' : ''}`}
      >
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => onEdit(date, session)}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isPlanned ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-400'
            }`}>
              {isPlanned ? <Clock size={20} /> : <Dumbbell size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{session.category ? t(session.category as any) : t("workouts")}</h3>
                {isPlanned && (
                  <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                    {t("planned")}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isPlanned ? (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-orange-400">{session.calories} kcal</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {calculateDuration(session.startTime, session.endTime)} {t("min")}
                </p>
              </div>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onStartPlanned(date, session);
                }}
                className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
              >
                <Play size={12} fill="currentColor" />
                <span className="hidden xs:inline">{t("start")}</span>
              </button>
            )}

            <div className="flex items-center gap-1">
              <button 
                onClick={handleToggleExpand}
                className="p-2 text-white/20 hover:text-white transition-colors"
              >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              <div className="relative">
                <button 
                  onClick={handleToggleMenu}
                  className="p-2 text-white/20 hover:text-white transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
                
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-[130]" onClick={() => setShowMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-2 z-[140] w-32 rounded-xl bg-[#121212] border border-white/10 p-1 shadow-2xl menu-no-pierce"
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(date, session);
                            setShowMenu(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-bold text-white/60 hover:bg-white/5 hover:text-white"
                        >
                          <Edit2 size={14} />
                          {t("edit")}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(date, session.id);
                            setShowMenu(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-bold text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                          {t("delete")}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onAnimationComplete={() => {
                if (isExpanded) {
                  document.getElementById(`session-${session.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                {session.exercises.map((ex, i) => {
                  const exerciseDef = allExercises.find(e => e.id === ex.exerciseId);
                  const name = exerciseDef ? exerciseDef.name[language] : (typeof ex.name === 'string' ? ex.name : (ex.name[language] || ex.name['en']));
                  return (
                    <ExerciseItem 
                      key={i} 
                      exercise={ex} 
                      exerciseName={name}
                      language={language}
                      t={t}
                    />
                  );
                })}
                
                {session.notes && (
                  <div className="rounded-xl bg-blue-500/5 p-3 border border-blue-500/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">{t("notes") || "Notes"}</p>
                    <p className="text-xs text-white/60 italic">"{session.notes}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && (
          <div className="mt-4 border-t border-white/5 pt-3 flex flex-wrap gap-2">
            {session.exercises.slice(0, 3).map((ex, i) => {
              const exerciseDef = allExercises.find(e => e.id === ex.exerciseId);
              const name = exerciseDef ? exerciseDef.name[language] : (typeof ex.name === 'string' ? ex.name : (ex.name[language] || ex.name['en']));
              return (
                <span key={i} className="rounded-full bg-white/5 px-2 py-1 text-[9px] font-medium text-white/40">
                  {name}
                </span>
              );
            })}
            {session.exercises.length > 3 && (
              <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] font-medium text-white/20">
                +{session.exercises.length - 3}
              </span>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}, (prev, next) => {
  // Enhanced Memo Comparison
  return (
    prev.session.id === next.session.id &&
    prev.session.updatedAt === next.session.updatedAt &&
    prev.session.endTime === next.session.endTime &&
    prev.session.exercises.length === next.session.exercises.length &&
    prev.language === next.language &&
    prev.date === next.date &&
    // Deep check for exercises if updatedAt is missing (fallback)
    (!prev.session.updatedAt ? JSON.stringify(prev.session.exercises) === JSON.stringify(next.session.exercises) : true)
  );
});

WorkoutSessionCard.displayName = "WorkoutSessionCard";

export default WorkoutSessionCard;
